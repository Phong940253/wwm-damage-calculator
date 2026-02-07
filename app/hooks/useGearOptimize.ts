import { useCallback, useEffect, useRef, useState } from "react";
import {
  CustomGear,
  GearSlot,
  InputStats,
  ElementStats,
  Rotation,
} from "@/app/types";
import {
  computeOptimizeResultsAsync,
  OptimizeResult,
  OptimizeCancelledError,
} from "@/app/domain/gear/gearOptimize";
import { GEAR_SLOTS } from "@/app/constants";
import { useLevelContext } from "@/app/hooks/useLevelContext";

// type LockedSlots = Partial<Record<GearSlot, string | null>>;
type RestrictSlots = Partial<Record<GearSlot, Array<string | null>>>;

type WorkerProgress = { current: number; total: number };

type WorkerOutMessage =
  | { type: "progress"; jobId: string; current: number; total: number }
  | {
      type: "done";
      jobId: string;
      result: {
        baseDamage: number;
        totalCombos: number;
        results: OptimizeResult[];
      };
    }
  | { type: "cancelled"; jobId: string }
  | { type: "error"; jobId: string; error: { name?: string; message: string } };

export function useGearOptimize(
  stats: InputStats,
  elementStats: ElementStats,
  customGears: CustomGear[],
  equipped: Partial<Record<GearSlot, string | undefined>>,
  rotation?: Rotation,
  options?: {
    candidateGears?: CustomGear[];
    slotsToOptimize?: GearSlot[];
    autoReduceIfOverCombos?: number;
    reduceTargetCombos?: number;
    reducePerSlotCap?: number;
  },
) {
  const { levelContext } = useLevelContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<OptimizeResult[]>([]);
  const [baseDamage, setBaseDamage] = useState(0);
  const [combos, setCombos] = useState(0);
  const [progress, setProgress] = useState<WorkerProgress>({
    current: 0,
    total: 0,
  });

  const abortRef = useRef<AbortController | null>(null);
  const workersRef = useRef<Worker[]>([]);
  const activeJobIdsRef = useRef<Set<string>>(new Set());
  const multiRunTokenRef = useRef<string | null>(null);

  const terminateWorkers = useCallback(() => {
    for (const w of workersRef.current) w.terminate();
    workersRef.current = [];
    activeJobIdsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      terminateWorkers();
    };
  }, [terminateWorkers]);

  const cancel = useCallback(() => {
    // Cancel worker runs (preferred)
    for (const id of activeJobIdsRef.current) {
      for (const w of workersRef.current) {
        try {
          w.postMessage({ type: "cancel", jobId: id });
        } catch {
          // ignore
        }
      }
    }

    // Cancel fallback (non-worker) run
    abortRef.current?.abort();

    // Ensure the worker stops immediately.
    terminateWorkers();
    multiRunTokenRef.current = null;
    setLoading(false);
  }, [terminateWorkers]);

  const computeShardPlan = useCallback(
    (shardCountWanted: number) => {
      const candidateGears = options?.candidateGears ?? customGears;
      const slots =
        options?.slotsToOptimize && options.slotsToOptimize.length > 0
          ? options.slotsToOptimize
          : GEAR_SLOTS.map((s) => s.key);

      const slotToItems = new Map<GearSlot, Array<CustomGear | null>>();

      for (const slot of slots) {
        const equippedId = equipped[slot];
        const equippedGear =
          equippedId && customGears.find((g) => g.id === equippedId);

        const filtered = candidateGears.filter((g) => g.slot === slot);
        const items = equippedGear
          ? filtered.some((g) => g.id === equippedGear.id)
            ? filtered
            : [equippedGear, ...filtered]
          : filtered;

        slotToItems.set(slot, items.length ? items : [null]);
      }

      // Choose one high-cardinality slot and partition its candidates into N disjoint subsets.
      // This guarantees 100% coverage while keeping shard count == worker count.
      const shardableSlots = Array.from(slotToItems.entries())
        .filter(([, items]) => items.length > 1)
        .sort((a, b) => b[1].length - a[1].length);

      if (shardableSlots.length === 0) {
        return { shardSlot: null, restrictShards: [] as RestrictSlots[] };
      }

      const shardSlot = shardableSlots[0]![0];
      const items = shardableSlots[0]![1];

      const shardCount = Math.max(1, Math.min(8, shardCountWanted));
      const buckets: Array<Array<string | null>> = Array.from(
        { length: shardCount },
        () => [],
      );

      // Round-robin partition to balance work.
      for (let i = 0; i < items.length; i++) {
        const g = items[i];
        buckets[i % shardCount]!.push(g ? g.id : null);
      }

      const restrictShards: RestrictSlots[] = buckets
        .filter((b) => b.length > 0)
        .map((b) => ({ [shardSlot]: b }));

      return { shardSlot, restrictShards };
    },
    [customGears, equipped, options],
  );

  const run = useCallback(
    async (maxDisplay: number) => {
      // Cancel any previous run before starting a new one.
      cancel();

      setLoading(true);
      setError(null);
      setProgress({ current: 0, total: 0 });

      const canUseWorker =
        typeof window !== "undefined" && typeof Worker !== "undefined";

      const runOnMainThread = async () => {
        const controller = new AbortController();
        abortRef.current = controller;

        try {
          const r = await computeOptimizeResultsAsync(
            stats,
            elementStats,
            customGears,
            equipped,
            maxDisplay,
            rotation,
            levelContext,
            options,
            (current, total) => setProgress({ current, total }),
            controller.signal,
          );

          // Ignore late results if this run was cancelled.
          if (controller.signal.aborted) return;

          setResults(r.results);
          setBaseDamage(r.baseDamage);
          setCombos(r.totalCombos);
        } catch (e) {
          // If cancelled, silently exit.
          if (e instanceof OptimizeCancelledError) return;

          setResults([]);
          setCombos(0);
          setBaseDamage(0);
          setError(e instanceof Error ? e.message : "Optimize failed");
        } finally {
          // Only clear loading for the current controller.
          if (abortRef.current === controller) {
            abortRef.current = null;
          }
          setLoading(false);
        }
      };

      if (canUseWorker) {
        try {
          const runToken = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
          multiRunTokenRef.current = runToken;

          const hw =
            typeof navigator !== "undefined" && navigator.hardwareConcurrency
              ? navigator.hardwareConcurrency
              : 4;
          const maxWorkers = Math.max(1, Math.min(8, hw - 1));

          const { restrictShards } = computeShardPlan(maxWorkers);
          const shouldShard = restrictShards.length >= 2;
          const workerCount = shouldShard ? restrictShards.length : 1;

          // Create worker pool
          const workers: Worker[] = [];
          for (let i = 0; i < workerCount; i++) {
            workers.push(
              new Worker(
                new URL("../workers/gearOptimize.worker.ts", import.meta.url),
                { type: "module" },
              ),
            );
          }
          workersRef.current = workers;

          // Shared aggregation state
          const perJobProgress = new Map<string, WorkerProgress>();
          const completedTotals = { current: 0, total: 0 };
          const allResults: OptimizeResult[] = [];
          let baseDamageSeen: number | null = null;
          let combosSeen = 0;

          const shardPlans: RestrictSlots[] = shouldShard
            ? restrictShards
            : ([{}] as RestrictSlots[]);

          const recomputeAggregatedProgress = () => {
            let current = completedTotals.current;
            let total = completedTotals.total;
            for (const p of perJobProgress.values()) {
              current += p.current;
              total += p.total;
            }
            setProgress({ current, total });
          };

          const isStillActive = () => multiRunTokenRef.current === runToken;

          const hardFailToMainThread = () => {
            if (!isStillActive()) return;
            // Prevent getting stuck in loading=true when module workers fail (notably Turbopack dev).
            terminateWorkers();
            multiRunTokenRef.current = null;
            setError(null);
            void runOnMainThread();
          };

          const startShardOnWorker = (
            worker: Worker,
            restrictSlots: RestrictSlots,
          ) => {
            if (!isStillActive()) return;

            const jobId = `${runToken}_${Math.random().toString(16).slice(2)}`;
            activeJobIdsRef.current.add(jobId);
            perJobProgress.set(jobId, { current: 0, total: 0 });
            recomputeAggregatedProgress();

            worker.postMessage({
              type: "start",
              jobId,
              payload: {
                stats,
                elementStats,
                customGears,
                equipped,
                desiredDisplay: maxDisplay,
                rotation,
                levelContext,
                options: {
                  ...options,
                  restrictSlots,
                  yieldToEventLoop: false,
                  // Aggressive reduction defaults in worker mode (can be overridden by UI options)
                  autoReduceIfOverCombos: options?.autoReduceIfOverCombos ?? 1,
                  reduceTargetCombos: options?.reduceTargetCombos ?? 200_000,
                },
              },
            });
          };

          for (const worker of workers) {
            worker.onmessage = (ev: MessageEvent) => {
              const msg = ev.data as WorkerOutMessage;
              if (!msg || typeof msg !== "object" || !("type" in msg)) return;
              if (!isStillActive()) return;

              if (msg.type === "progress") {
                if (!activeJobIdsRef.current.has(msg.jobId)) return;
                perJobProgress.set(msg.jobId, {
                  current: msg.current,
                  total: msg.total,
                });
                recomputeAggregatedProgress();
                return;
              }

              if (msg.type === "cancelled") {
                if (!activeJobIdsRef.current.has(msg.jobId)) return;
                activeJobIdsRef.current.delete(msg.jobId);
                perJobProgress.delete(msg.jobId);
                setLoading(false);
                return;
              }

              if (msg.type === "error") {
                // Treat OptimizeCancelledError as a silent cancel.
                if (msg.error?.name === "OptimizeCancelledError") {
                  if (!activeJobIdsRef.current.has(msg.jobId)) return;
                  activeJobIdsRef.current.delete(msg.jobId);
                  perJobProgress.delete(msg.jobId);
                  setLoading(false);
                  return;
                }

                // Any worker error -> fallback to main thread (safer than partial results).
                hardFailToMainThread();
                return;
              }

              if (msg.type === "done") {
                if (!activeJobIdsRef.current.has(msg.jobId)) return;

                // Move this job's progress into completed totals.
                const p = perJobProgress.get(msg.jobId);
                const doneTotal =
                  p && p.total > 0 ? p.total : msg.result.totalCombos;
                completedTotals.current += doneTotal;
                completedTotals.total += doneTotal;
                activeJobIdsRef.current.delete(msg.jobId);
                perJobProgress.delete(msg.jobId);

                if (baseDamageSeen == null)
                  baseDamageSeen = msg.result.baseDamage;
                combosSeen += msg.result.totalCombos;
                allResults.push(...msg.result.results);

                recomputeAggregatedProgress();

                // All shards complete when no active jobs.
                if (activeJobIdsRef.current.size === 0) {
                  // Merge top-K across shards
                  const sorted = [...allResults].sort((a, b) =>
                    b.percentGain === a.percentGain
                      ? b.damage - a.damage
                      : b.percentGain - a.percentGain,
                  );
                  const merged = sorted.slice(0, maxDisplay);

                  setResults(merged);
                  setBaseDamage(baseDamageSeen ?? 0);
                  setCombos(combosSeen);
                  setLoading(false);
                  multiRunTokenRef.current = null;
                  terminateWorkers();
                }
                return;
              }
            };

            worker.onerror = () => {
              hardFailToMainThread();
            };
          }

          // Kick off shards immediately (1 shard per worker)
          if (shouldShard) {
            for (let i = 0; i < workers.length; i++) {
              startShardOnWorker(workers[i]!, shardPlans[i]!);
            }
          } else {
            startShardOnWorker(workers[0]!, {});
          }

          return;
        } catch {
          // Construction can throw synchronously in some bundler/runtime combos.
          terminateWorkers();
          multiRunTokenRef.current = null;
          return runOnMainThread();
        }
      }

      // Fallback: run on main thread (older browsers / environments)
      return runOnMainThread();
    },
    [
      cancel,
      computeShardPlan,
      customGears,
      elementStats,
      equipped,
      levelContext,
      options,
      rotation,
      stats,
      terminateWorkers,
    ],
  );

  return { run, cancel, loading, error, results, baseDamage, combos, progress };
}
