import { useCallback, useState } from "react";
import { CustomGear, GearSlot, InputStats, ElementStats } from "@/app/types";
import {
  computeOptimizeResults,
  OptimizeResult,
} from "@/app/domain/gear/gearOptimize";

export function useGearOptimize(
  stats: InputStats,
  elementStats: ElementStats,
  customGears: CustomGear[],
  equipped: Partial<Record<GearSlot, string | undefined>>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<OptimizeResult[]>([]);
  const [baseDamage, setBaseDamage] = useState(0);
  const [combos, setCombos] = useState(0);

  const run = useCallback(
    (maxDisplay: number) => {
      setLoading(true);
      setError(null);

      try {
        const r = computeOptimizeResults(
          stats,
          elementStats,
          customGears,
          equipped,
          maxDisplay
        );
        setResults(r.results);
        setBaseDamage(r.baseDamage);
        setCombos(r.totalCombos);
      } catch (e) {
        setResults([]);
        setCombos(0);
        setBaseDamage(0);
        setError(e instanceof Error ? e.message : "Optimize failed");
      } finally {
        setLoading(false);
      }
    },
    [stats, elementStats, customGears, equipped]
  );

  return { run, loading, error, results, baseDamage, combos };
}
