import { useMemo } from "react";
import { InputStats, ElementStats } from "@/app/types";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { calculateDamage } from "@/app/domain/damage/damageCalculator";

export function useStatImpact(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>
) {
  return useMemo(() => {
    const impacts: Record<string, number> = {};

    /* ---------- base damage ---------- */
    const baseStats: InputStats = Object.fromEntries(
      Object.entries(stats).map(([k, v]) => [
        k,
        { current: Number(v.current || 0), increase: 0 },
      ])
    );

    const baseCtx = buildDamageContext(baseStats, elementStats, gearBonus);
    const base = calculateDamage(baseCtx);

    const baseValue = base.normal || 0;
    if (baseValue === 0) return impacts;

    /* ---------- per-stat simulation ---------- */
    for (const key of Object.keys(stats)) {
      const inc = Number(stats[key as keyof InputStats].increase || 0);
      if (inc === 0) continue;

      const testStats: InputStats = structuredClone(baseStats);
      testStats[key as keyof InputStats].current =
        Number(testStats[key as keyof InputStats].current) + inc;

      const ctx = buildDamageContext(testStats, elementStats, gearBonus);
      const dmg = calculateDamage(ctx);

      const diff = ((dmg.normal - baseValue) / baseValue) * 100;

      if (Math.abs(diff) > 0.01) {
        impacts[key] = diff;
      }
    }

    return impacts;
  }, [stats, elementStats, gearBonus]);
}
