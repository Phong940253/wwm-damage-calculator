"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ElementStats, InputStats, Rotation } from "@/app/types";
import type { ElementKey } from "@/app/constants";
import {
  calculateIdealGearStats,
  calculateIdealGearStatsFast,
  IdealGearCancelledError,
  type IdealGearResult,
} from "@/app/domain/gear/idealOptimizer";

type WorkerProgress = { current: number; total: number };

type WorkerOutMessage =
  | { type: "progress"; jobId: string; current: number; total: number }
  | { type: "done"; jobId: string; result: IdealGearResult }
  | { type: "cancelled"; jobId: string }
  | { type: "error"; jobId: string; error: { name?: string; message: string } };

export function useIdealGearOptimize(
  stats: InputStats,
  elementStats: ElementStats,
  rotation?: Rotation,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<"exhaustive" | "fast" | null>(
    null,
  );
  const [progress, setProgress] = useState<WorkerProgress>({
    current: 0,
    total: 0,
  });
  const [result, setResult] = useState<IdealGearResult | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const workersRef = useRef<Worker[]>([]);
  const activeJobIdsRef = useRef<Set<string>>(new Set());
  const runTokenRef = useRef<string | null>(null);

  const terminateWorkers = useCallback(() => {
    for (const w of workersRef.current) {
      w.terminate();
    }
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
    for (const id of activeJobIdsRef.current) {
      for (const w of workersRef.current) {
        try {
          w.postMessage({ type: "cancel", jobId: id });
        } catch {
          // ignore
        }
      }
    }

    abortRef.current?.abort();
    terminateWorkers();
    runTokenRef.current = null;
    setLoading(false);
  }, [terminateWorkers]);

  const run = useCallback(
    async (
      path: ElementKey,
      options?: {
        mode?: "exhaustive" | "fast";
        timeMs?: number;
        workers?: number;
      },
    ) => {
      cancel();
      setLoading(true);
      setError(null);
      setProgress({ current: 0, total: 0 });
      const mode = options?.mode ?? "exhaustive";
      const timeMs = options?.timeMs ?? 60_000;
      setActiveMode(mode);

      const canUseWorker =
        typeof window !== "undefined" && typeof Worker !== "undefined";

      if (canUseWorker) {
        try {
          const runToken = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
          runTokenRef.current = runToken;

          const hw =
            typeof navigator !== "undefined" && navigator.hardwareConcurrency
              ? navigator.hardwareConcurrency
              : 4;
          const maxWorkers = Math.max(1, hw);
          const workerCount = Math.max(
            1,
            Math.min(options?.workers ?? maxWorkers, maxWorkers),
          );

          const workers: Worker[] = [];
          for (let i = 0; i < workerCount; i += 1) {
            workers.push(
              new Worker(
                new URL("../workers/idealGear.worker.ts", import.meta.url),
                { type: "module" },
              ),
            );
          }
          workersRef.current = workers;

          const perJobProgress = new Map<string, WorkerProgress>();
          const completedTotals = { current: 0, total: 0 };
          const results: IdealGearResult[] = [];
          let completedJobs = 0;

          const recomputeProgress = () => {
            let current = completedTotals.current;
            let total = completedTotals.total;
            for (const p of perJobProgress.values()) {
              current += p.current;
              total += p.total;
            }
            setProgress({ current, total });
          };

          const isStillActive = () => runTokenRef.current === runToken;

          const finalizeIfDone = () => {
            if (!isStillActive()) return;
            if (completedJobs < workerCount) return;
            const valid = results.filter((r) => Number.isFinite(r.maxDamage));
            if (valid.length === 0) {
              setError("Ideal gear failed");
              setLoading(false);
              terminateWorkers();
              return;
            }
            const best = valid.reduce((acc, cur) =>
              cur.maxDamage > acc.maxDamage ? cur : acc,
            );
            setResult(best);
            setLoading(false);
            terminateWorkers();
          };

          workers.forEach((worker, index) => {
            const jobId = `${runToken}_${index}`;
            activeJobIdsRef.current.add(jobId);
            perJobProgress.set(jobId, { current: 0, total: 0 });
            recomputeProgress();

            worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
              const msg = event.data;
              if (!msg || msg.jobId !== jobId) return;
              if (!isStillActive()) return;

              if (msg.type === "progress") {
                perJobProgress.set(msg.jobId, {
                  current: msg.current,
                  total: msg.total,
                });
                recomputeProgress();
                return;
              }

              if (msg.type === "done") {
                const p = perJobProgress.get(msg.jobId);
                const doneTotal =
                  p && p.total > 0 ? p.total : (msg.result.elapsedMs ?? 0);
                completedTotals.current += doneTotal;
                completedTotals.total += doneTotal;
                results.push(msg.result);
                completedJobs += 1;
                perJobProgress.delete(msg.jobId);
                activeJobIdsRef.current.delete(msg.jobId);
                recomputeProgress();
                finalizeIfDone();
                return;
              }

              if (msg.type === "cancelled") {
                perJobProgress.delete(msg.jobId);
                activeJobIdsRef.current.delete(msg.jobId);
                finalizeIfDone();
                return;
              }

              if (msg.type === "error") {
                setError(msg.error.message || "Ideal gear failed");
                setLoading(false);
                terminateWorkers();
              }
            };

            worker.postMessage({
              type: "start",
              jobId,
              payload: {
                path,
                stats,
                elementStats,
                rotation,
                mode,
                timeMs: mode === "fast" ? timeMs : undefined,
                seed: Date.now() + index * 1013904223,
                shardIndex: mode === "exhaustive" ? index : undefined,
                shardCount: mode === "exhaustive" ? workerCount : undefined,
              },
            });
          });
        } catch (e) {
          setError(e instanceof Error ? e.message : "Ideal gear failed");
          setLoading(false);
          terminateWorkers();
        }

        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res =
          mode === "fast"
            ? calculateIdealGearStatsFast(path, rotation, stats, elementStats, {
                onProgress: (current, total) => setProgress({ current, total }),
                signal: controller.signal,
                timeMs,
              })
            : calculateIdealGearStats(path, rotation, stats, elementStats, {
                onProgress: (current, total) => setProgress({ current, total }),
                signal: controller.signal,
              });

        if (!controller.signal.aborted) {
          setResult(res);
        }
      } catch (e) {
        if (e instanceof IdealGearCancelledError) return;
        setError(e instanceof Error ? e.message : "Ideal gear failed");
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setLoading(false);
      }
    },
    [cancel, elementStats, rotation, stats, terminateWorkers],
  );

  return {
    loading,
    error,
    mode: activeMode,
    progress,
    result,
    setResult,
    run,
    cancel,
  };
}
