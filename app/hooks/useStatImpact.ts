// app/hooks/useStatImpact.ts
import { useMemo } from "react";
import { InputStats, ElementStats, Rotation } from "@/app/types";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { calculateDamage } from "@/app/domain/damage/damageCalculator";
import {
  computeRotationBonuses,
  sumBonuses,
} from "@/app/domain/skill/modifierEngine";

type ElementStatKey = Exclude<keyof ElementStats, "selected" | "martialArtsId">;

export function useStatImpact(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>,
  rotation?: Rotation
) {
  return useMemo(() => {
    const impacts: Record<string, number> = {};

    /* =======================
       BASE STATS (normalized)
    ======================= */

    const baseStats: InputStats = Object.fromEntries(
      Object.entries(stats).map(([k, v]) => [
        k,
        { current: Number(v.current || 0), increase: 0 },
      ])
    );

    const baseElements: Record<ElementStatKey, number> = Object.fromEntries(
      Object.keys(elementStats)
        .filter((k) => k !== "selected" && k !== "martialArtsId")
        .map((k) => [k, Number(elementStats[k as ElementStatKey].current || 0)])
    ) as Record<ElementStatKey, number>;

    const buildCtx = (s: InputStats, e: Record<ElementStatKey, number>) =>
      (() => {
        const es = {
          selected: elementStats.selected,
          martialArtsId: elementStats.martialArtsId,
          ...Object.fromEntries(
            Object.entries(e).map(([k, v]) => [k, { current: v, increase: 0 }])
          ),
        } as ElementStats;

        const passiveBonuses = computeRotationBonuses(
          s,
          es,
          gearBonus,
          rotation
        );
        return buildDamageContext(s, es, sumBonuses(gearBonus, passiveBonuses));
      })();

    const base = calculateDamage(buildCtx(baseStats, baseElements));
    const baseValue = base.normal || 0;
    if (baseValue === 0) return impacts;

    /* =======================
       1️⃣ INPUT STATS
    ======================= */
    for (const key of Object.keys(stats) as (keyof InputStats)[]) {
      const inc = Number(stats[key].increase || 0);
      if (inc === 0) continue;

      const testStats = structuredClone(baseStats);
      testStats[key].current = Number(testStats[key].current) + inc;

      const dmg = calculateDamage(buildCtx(testStats, baseElements));
      const diff = ((dmg.normal - baseValue) / baseValue) * 100;

      if (Math.abs(diff) > 0.01) impacts[key] = diff;
    }

    /* =======================
       2️⃣ ELEMENT STATS ✅
    ======================= */
    for (const key of Object.keys(baseElements) as ElementStatKey[]) {
      const inc = Number(elementStats[key].increase || 0);
      if (inc === 0) continue;

      const testElements = { ...baseElements };
      testElements[key] = testElements[key] + inc;

      const dmg = calculateDamage(buildCtx(baseStats, testElements));
      const diff = ((dmg.normal - baseValue) / baseValue) * 100;

      if (Math.abs(diff) > 0.01) impacts[key] = diff;
    }

    return impacts;
  }, [stats, elementStats, gearBonus, rotation]);
}
