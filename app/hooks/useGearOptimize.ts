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
  },
) {
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
  const workerRef = useRef<Worker | null>(null);
  const activeJobIdRef = useRef<string | null>(null);

  const terminateWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      terminateWorker();
    };
  }, [terminateWorker]);

  const cancel = useCallback(() => {
    // Cancel worker run (preferred)
    if (workerRef.current && activeJobIdRef.current) {
      try {
        workerRef.current.postMessage({
          type: "cancel",
          jobId: activeJobIdRef.current,
        });
      } catch {
        // ignore
      }
    }

    // Cancel fallback (non-worker) run
    abortRef.current?.abort();

    // Ensure the worker stops immediately.
    terminateWorker();
    activeJobIdRef.current = null;
    setLoading(false);
  }, [terminateWorker]);

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
          const jobId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
          activeJobIdRef.current = jobId;

          const worker = new Worker(
            new URL("../workers/gearOptimize.worker.ts", import.meta.url),
            { type: "module" },
          );
          workerRef.current = worker;

          const finalizeIfActive = (id: string) => {
            if (activeJobIdRef.current !== id) return false;
            activeJobIdRef.current = null;
            terminateWorker();
            return true;
          };

          const fallbackFromWorkerFailure = () => {
            // Prevent getting stuck in loading=true when module workers fail
            // (notably under Turbopack in dev).
            const wasActive = finalizeIfActive(jobId);
            if (!wasActive) return;
            // Keep loading indicator while falling back.
            setError(null);
            void runOnMainThread();
          };

          worker.onmessage = (ev: MessageEvent) => {
            const msg = ev.data as WorkerOutMessage;
            if (!msg || typeof msg !== "object" || !("type" in msg)) return;
            if (msg.jobId !== jobId) return;

            if (msg.type === "progress") {
              setProgress({ current: msg.current, total: msg.total });
              return;
            }

            if (msg.type === "cancelled") {
              finalizeIfActive(jobId);
              setLoading(false);
              return;
            }

            if (msg.type === "error") {
              // Treat OptimizeCancelledError as a silent cancel.
              if (msg.error?.name === "OptimizeCancelledError") {
                finalizeIfActive(jobId);
                setLoading(false);
                return;
              }

              // Worker failed -> fallback.
              fallbackFromWorkerFailure();
              return;
            }

            if (msg.type === "done") {
              if (!finalizeIfActive(jobId)) return;
              setResults(msg.result.results);
              setBaseDamage(msg.result.baseDamage);
              setCombos(msg.result.totalCombos);
              setLoading(false);
              return;
            }
          };

          worker.onerror = () => {
            fallbackFromWorkerFailure();
          };

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
              options,
            },
          });

          return;
        } catch {
          // Construction can throw synchronously in some bundler/runtime combos.
          terminateWorker();
          activeJobIdRef.current = null;
          return runOnMainThread();
        }
      }

      // Fallback: run on main thread (older browsers / environments)
      return runOnMainThread();
    },
    [stats, elementStats, customGears, equipped, rotation, options, cancel],
  );

  return { run, cancel, loading, error, results, baseDamage, combos, progress };
}
