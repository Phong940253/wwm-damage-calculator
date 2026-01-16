// app/hooks/useDamage.ts
import { useMemo } from "react";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { calculateDamage } from "@/app/domain/damage/damageCalculator";
import { InputStats, ElementStats, Rotation } from "@/app/types";
import { DamageResult } from "../domain/damage/type";
import { calcExpectedNormalBreakdown } from "../domain/damage/damageFormula";
import { SKILLS } from "@/app/domain/skill/skills";
import { calculateSkillDamage } from "@/app/domain/skill/skillDamage";
import {
  computeRotationBonusesWithBreakdown,
  sumBonuses,
} from "@/app/domain/skill/modifierEngine";

export function useDamage(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>,
  rotation?: Rotation
): DamageResult {
  return useMemo(() => {
    /* ---------- BASE (NO increase) ---------- */

    const baseStats: InputStats = Object.fromEntries(
      Object.entries(stats).map(([k, v]) => [
        k,
        { current: Number(v.current || 0), increase: 0 },
      ])
    );

    const baseElementStats: ElementStats = {
      ...elementStats,
      ...Object.fromEntries(
        Object.entries(elementStats)
          .filter(([k]) => k !== "selected")
          .map(([k, v]) => [
            k,
            { current: Number(v.current || 0), increase: 0 },
          ])
      ),
    };

    // Apply passive skills + inner ways (additive/scale) on top of gear bonus
    const passiveBreakdownBase = computeRotationBonusesWithBreakdown(
      baseStats,
      baseElementStats,
      gearBonus,
      rotation
    );
    const passiveBreakdownFinal = computeRotationBonusesWithBreakdown(
      stats,
      elementStats,
      gearBonus,
      rotation
    );

    // Keep the old shape around for any downstream usage.
    const passiveBonusesBase = passiveBreakdownBase.total;
    const passiveBonusesFinal = passiveBreakdownFinal.total;

    const baseCtxWithModifiers = buildDamageContext(
      baseStats,
      baseElementStats,
      sumBonuses(gearBonus, passiveBonusesBase),
      {
        gear: gearBonus,
        passives: Object.fromEntries(
          Object.entries(passiveBreakdownBase.byPassive).map(([id, bonus]) => [
            id,
            {
              name: passiveBreakdownBase.meta.passives[id]?.name ?? id,
              uptimePct: passiveBreakdownBase.meta.passives[id]?.uptimePct,
              bonus,
            },
          ])
        ),
        innerWays: Object.fromEntries(
          Object.entries(passiveBreakdownBase.byInnerWay).map(([id, bonus]) => [
            id,
            {
              name: passiveBreakdownBase.meta.innerWays[id]?.name ?? id,
              bonus,
            },
          ])
        ),
      }
    );

    const finalCtxWithModifiers = buildDamageContext(
      stats,
      elementStats,
      sumBonuses(gearBonus, passiveBonusesFinal),
      {
        gear: gearBonus,
        passives: Object.fromEntries(
          Object.entries(passiveBreakdownFinal.byPassive).map(([id, bonus]) => [
            id,
            {
              name: passiveBreakdownFinal.meta.passives[id]?.name ?? id,
              uptimePct: passiveBreakdownFinal.meta.passives[id]?.uptimePct,
              bonus,
            },
          ])
        ),
        innerWays: Object.fromEntries(
          Object.entries(passiveBreakdownFinal.byInnerWay).map(
            ([id, bonus]) => [
              id,
              {
                name: passiveBreakdownFinal.meta.innerWays[id]?.name ?? id,
                bonus,
              },
            ]
          )
        ),
      }
    );

    /* ---------- Calculate damage based on rotation or default ---------- */
    let baseValues: {
      min: number;
      normal: number;
      critical: number;
      affinity: number;
    };
    let finalValues: {
      min: number;
      normal: number;
      critical: number;
      affinity: number;
    };
    let breakdown: ReturnType<typeof calcExpectedNormalBreakdown> | undefined;

    if (rotation && rotation.skills.length > 0) {
      // Calculate rotation-based damage
      let baseMinTotal = 0;
      let baseNormalTotal = 0;
      let baseCriticalTotal = 0;
      let baseAffinityTotal = 0;

      let finalMinTotal = 0;
      let finalNormalTotal = 0;
      let finalCriticalTotal = 0;
      let finalAffinityTotal = 0;

      // Accumulate skill breakdowns weighted by damage contribution
      let weightedBreakdownNormal = 0;
      let weightedBreakdownAbrasion = 0;
      let weightedBreakdownAffinity = 0;
      let weightedBreakdownCritical = 0;

      for (const rotSkill of rotation.skills) {
        const skill = SKILLS.find((s) => s.id === rotSkill.id);
        if (!skill) continue;

        // Base damage for this skill (without increases)
        const baseSkillDamage = calculateSkillDamage(
          baseCtxWithModifiers,
          skill
        );
        baseMinTotal += baseSkillDamage.total.min.value * rotSkill.count;
        baseNormalTotal += baseSkillDamage.total.normal.value * rotSkill.count;
        baseCriticalTotal +=
          baseSkillDamage.total.critical.value * rotSkill.count;
        baseAffinityTotal +=
          baseSkillDamage.total.affinity.value * rotSkill.count;

        // console.log(`Skill: ${skill.name}, Base Damage:`, baseSkillDamage);

        // Final damage for this skill (with increases)
        const finalSkillDamage = calculateSkillDamage(
          finalCtxWithModifiers,
          skill
        );
        const skillNormalDamage =
          finalSkillDamage.total.normal.value * rotSkill.count;
        finalMinTotal += finalSkillDamage.total.min.value * rotSkill.count;
        finalNormalTotal += skillNormalDamage;
        finalCriticalTotal +=
          finalSkillDamage.total.critical.value * rotSkill.count;
        finalAffinityTotal +=
          finalSkillDamage.total.affinity.value * rotSkill.count;

        // Get breakdown for this skill from calculated skill damage
        const skillBreakdown = finalSkillDamage.total.averageBreakdown;
        if (!skillBreakdown) continue;

        // Weight breakdown by this skill's count (flat damage, not percent)
        weightedBreakdownNormal += skillBreakdown.normal * rotSkill.count;
        weightedBreakdownAbrasion += skillBreakdown.abrasion * rotSkill.count;
        weightedBreakdownAffinity += skillBreakdown.affinity * rotSkill.count;
        weightedBreakdownCritical += skillBreakdown.critical * rotSkill.count;
      }

      baseValues = {
        min: baseMinTotal,
        normal: baseNormalTotal,
        critical: baseCriticalTotal,
        affinity: baseAffinityTotal,
      };

      finalValues = {
        min: finalMinTotal,
        normal: finalNormalTotal,
        critical: finalCriticalTotal,
        affinity: finalAffinityTotal,
      };

      // For rotation, calculate weighted average breakdown
      breakdown = {
        normal: weightedBreakdownNormal,
        abrasion: weightedBreakdownAbrasion,
        affinity: weightedBreakdownAffinity,
        critical: weightedBreakdownCritical,
      };
    } else {
      // Fallback to default damage calculation
      const base = calculateDamage(baseCtxWithModifiers);
      const final = calculateDamage(finalCtxWithModifiers);

      baseValues = base;
      finalValues = final;
      breakdown = calcExpectedNormalBreakdown(
        finalCtxWithModifiers.get,
        final.affinity
      );
    }

    const pct = (b: number, f: number) => (b === 0 ? 0 : ((f - b) / b) * 100);

    return {
      min: {
        value: finalValues.min,
        percent: pct(baseValues.min, finalValues.min),
      },
      normal: {
        value: Math.round(finalValues.normal * 10) / 10,
        percent: pct(baseValues.normal, finalValues.normal),
      },
      critical: {
        value: Math.round(finalValues.critical * 10) / 10,
        percent: pct(baseValues.critical, finalValues.critical),
      },
      affinity: {
        value: Math.round(finalValues.affinity * 10) / 10,
        percent: pct(baseValues.affinity, finalValues.affinity),
      },
      averageBreakdown: breakdown,
    };
  }, [stats, elementStats, gearBonus, rotation]);
}
