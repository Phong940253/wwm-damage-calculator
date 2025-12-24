import { useMemo } from "react";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { calculateDamage } from "@/app/domain/damage/damageCalculator";
import { InputStats, ElementStats } from "@/app/types";
import { DamageResult } from "../domain/damage/type";
import { calcExpectedNormalBreakdown } from "../domain/damage/damageFormula";

export function useDamage(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>
): DamageResult {
  return useMemo(() => {
    /* ---------- BASE (no increase) ---------- */
    const baseStats: InputStats = Object.fromEntries(
      Object.entries(stats).map(([k, v]) => [
        k,
        { current: Number(v.current || 0), increase: 0 },
      ])
    );

    const baseCtx = buildDamageContext(baseStats, elementStats, gearBonus);
    const base = calculateDamage(baseCtx);

    /* ---------- FINAL (with increase) ---------- */
    const finalCtx = buildDamageContext(stats, elementStats, gearBonus);
    const final = calculateDamage(finalCtx);

    const pct = (b: number, f: number) => (b === 0 ? 0 : ((f - b) / b) * 100);

    const breakdown = calcExpectedNormalBreakdown(finalCtx.get, final.affinity);

    return {
      min: { value: final.min, percent: pct(base.min, final.min) },
      normal: {
        value: Math.round(final.normal * 10) / 10,
        percent: pct(base.normal, final.normal),
      },
      critical: {
        value: Math.round(final.critical * 10) / 10,
        percent: pct(base.critical, final.critical),
      },
      affinity: {
        value: Math.round(final.affinity * 10) / 10,
        percent: pct(base.affinity, final.affinity),
      },
      averageBreakdown: breakdown,
    };
  }, [stats, elementStats, gearBonus]);
}
