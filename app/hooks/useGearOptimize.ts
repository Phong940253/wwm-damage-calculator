import { useCallback, useRef, useState } from "react";
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

export function useGearOptimize(
  stats: InputStats,
  elementStats: ElementStats,
  customGears: CustomGear[],
  equipped: Partial<Record<GearSlot, string | undefined>>,
  rotation?: Rotation,
  options?: {
    candidateGears?: CustomGear[];
    slotsToOptimize?: GearSlot[];
  }
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<OptimizeResult[]>([]);
  const [baseDamage, setBaseDamage] = useState(0);
  const [combos, setCombos] = useState(0);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const run = useCallback(
    async (maxDisplay: number) => {
      // Cancel any previous run before starting a new one.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      setProgress({ current: 0, total: 0 });

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
          controller.signal
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
    },
    [stats, elementStats, customGears, equipped, rotation, options]
  );

  return { run, cancel, loading, error, results, baseDamage, combos, progress };
}
