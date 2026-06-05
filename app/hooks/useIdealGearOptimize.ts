"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ElementStats, InputStats, Rotation } from "@/app/types";
import type { ElementKey } from "@/app/constants";
import {
  calculateIdealGearStats,
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
  const [progress, setProgress] = useState<WorkerProgress>({
    current: 0,
    total: 0,
  });
  const [result, setResult] = useState<IdealGearResult | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const jobIdRef = useRef<string | null>(null);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
    }
    workerRef.current = null;
    jobIdRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      terminateWorker();
    };
  }, [terminateWorker]);

  const cancel = useCallback(() => {
    if (workerRef.current && jobIdRef.current) {
      try {
        workerRef.current.postMessage({
          type: "cancel",
          jobId: jobIdRef.current,
        });
      } catch {
        // ignore
      }
    }

    abortRef.current?.abort();
    terminateWorker();
    setLoading(false);
  }, [terminateWorker]);

  const run = useCallback(
    async (path: ElementKey) => {
      cancel();
      setLoading(true);
      setError(null);
      setProgress({ current: 0, total: 0 });

      const canUseWorker =
        typeof window !== "undefined" && typeof Worker !== "undefined";

      if (canUseWorker) {
        try {
          const jobId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
          jobIdRef.current = jobId;

          const worker = new Worker(
            new URL("../workers/idealGear.worker.ts", import.meta.url),
            { type: "module" },
          );
          workerRef.current = worker;

          worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
            const msg = event.data;
            if (!msg || msg.jobId !== jobIdRef.current) return;

            if (msg.type === "progress") {
              setProgress({ current: msg.current, total: msg.total });
              return;
            }

            if (msg.type === "done") {
              setResult(msg.result);
              setLoading(false);
              terminateWorker();
              return;
            }

            if (msg.type === "cancelled") {
              setLoading(false);
              terminateWorker();
              return;
            }

            if (msg.type === "error") {
              setError(msg.error.message || "Ideal gear failed");
              setLoading(false);
              terminateWorker();
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
            },
          });
        } catch (e) {
          setError(e instanceof Error ? e.message : "Ideal gear failed");
          setLoading(false);
          terminateWorker();
        }

        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = calculateIdealGearStats(
          path,
          rotation,
          stats,
          elementStats,
          {
            onProgress: (current, total) => setProgress({ current, total }),
            signal: controller.signal,
          },
        );

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
    [cancel, elementStats, rotation, stats, terminateWorker],
  );

  return {
    loading,
    error,
    progress,
    result,
    run,
    cancel,
  };
}
