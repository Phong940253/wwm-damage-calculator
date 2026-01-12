// app/hooks/useStatImpact.ts
import { useMemo } from "react";
import { InputStats, ElementStats, Rotation } from "@/app/types";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { calculateDamage } from "@/app/domain/damage/damageCalculator";
import { SKILLS } from "@/app/domain/skill/skills";
import { calculateSkillDamage } from "@/app/domain/skill/skillDamage";
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

    const calcNormal = (ctx: ReturnType<typeof buildDamageContext>): number => {
      if (rotation && rotation.skills.length > 0) {
        let totalNormal = 0;
        for (const rotSkill of rotation.skills) {
          const skill = SKILLS.find((s) => s.id === rotSkill.id);
          if (!skill) continue;
          const dmg = calculateSkillDamage(ctx, skill);
          totalNormal += dmg.total.normal.value * rotSkill.count;
        }
        return totalNormal;
      }

      return calculateDamage(ctx).normal || 0;
    };

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

    const baseValue = calcNormal(buildCtx(baseStats, baseElements));
    if (baseValue === 0) return impacts;

    /* =======================
       1️⃣ INPUT STATS
    ======================= */
    for (const key of Object.keys(stats) as (keyof InputStats)[]) {
      const inc = Number(stats[key].increase || 0);
      if (inc === 0) continue;

      const testStats = structuredClone(baseStats);
      testStats[key].current = Number(testStats[key].current) + inc;

      const normal = calcNormal(buildCtx(testStats, baseElements));
      const diff = ((normal - baseValue) / baseValue) * 100;

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

      const normal = calcNormal(buildCtx(baseStats, testElements));
      const diff = ((normal - baseValue) / baseValue) * 100;

      if (Math.abs(diff) > 0.01) impacts[key] = diff;
    }

    return impacts;
  }, [stats, elementStats, gearBonus, rotation]);
}
