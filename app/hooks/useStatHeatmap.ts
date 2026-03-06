import { useMemo } from "react";
import { ElementStats, InputStats, Rotation } from "@/app/types";
import { STAT_HEATMAP_AFFIX_LIMITS, StatHeatmapKey } from "@/app/constants";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { calculateDamage } from "@/app/domain/damage/damageCalculator";
import { SKILLS } from "@/app/domain/skill/skills";
import {
  calculateSkillDamage,
  buildSkillUseCountsInRotation,
  buildRotationSkillDamageOptions,
} from "@/app/domain/skill/skillDamage";
import {
  computeRotationBonuses,
  sumBonuses,
} from "@/app/domain/skill/modifierEngine";
import { computeIncludedInStatsGearBonus } from "@/app/domain/skill/includedInStatsImpact";
import type { LevelContext } from "@/app/domain/level/levelSettings";

type ElementStatKey = Exclude<keyof ElementStats, "selected" | "martialArtsId">;

export interface StatHeatmapRow {
  key: StatHeatmapKey;
  minDelta: number;
  maxDelta: number;
  minImpactPct: number;
  maxImpactPct: number;
  bestImpactPct: number;
}

export function useStatHeatmap(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>,
  rotation: Rotation | undefined,
  levelContext: LevelContext | undefined,
  lineCount: number,
) {
  return useMemo(() => {
    const safeLineCount = Math.max(1, Math.floor(Number(lineCount) || 1));

    const calcNormal = (ctx: ReturnType<typeof buildDamageContext>): number => {
      if (rotation && rotation.skills.length > 0) {
        const skillUseCountsInRotation = buildSkillUseCountsInRotation(
          rotation.skills,
        );

        let totalNormal = 0;
        for (const rotSkill of rotation.skills) {
          const skill = SKILLS.find((s) => s.id === rotSkill.id);
          if (!skill) continue;
          const dmg = calculateSkillDamage(
            ctx,
            skill,
            buildRotationSkillDamageOptions(
              rotSkill.id,
              rotSkill.params,
              rotation.activeInnerWays,
              skillUseCountsInRotation,
              rotSkill.count,
            ),
          );
          totalNormal += dmg.total.normal.value * rotSkill.count;
        }
        return totalNormal;
      }

      return calculateDamage(ctx).normal || 0;
    };

    const baseStats: InputStats = Object.fromEntries(
      Object.entries(stats).map(([k, v]) => [
        k,
        { current: Number(v.current || 0), increase: 0 },
      ]),
    );

    const baseElements: Record<ElementStatKey, number> = Object.fromEntries(
      Object.keys(elementStats)
        .filter((k) => k !== "selected" && k !== "martialArtsId")
        .map((k) => [
          k,
          Number(elementStats[k as ElementStatKey].current || 0),
        ]),
    ) as Record<ElementStatKey, number>;

    const buildCtx = (s: InputStats, e: Record<ElementStatKey, number>) => {
      const es = {
        selected: elementStats.selected,
        martialArtsId: elementStats.martialArtsId,
        ...Object.fromEntries(
          Object.entries(e).map(([k, v]) => [k, { current: v, increase: 0 }]),
        ),
      } as ElementStats;

      const includedInStatsBonus = computeIncludedInStatsGearBonus(
        s,
        es,
        rotation,
        gearBonus,
      );
      const effectiveGearBonus = sumBonuses(gearBonus, includedInStatsBonus);
      const passiveBonuses = computeRotationBonuses(
        s,
        es,
        effectiveGearBonus,
        rotation,
      );

      return buildDamageContext(
        s,
        es,
        sumBonuses(effectiveGearBonus, passiveBonuses),
        undefined,
        levelContext,
      );
    };

    const baseValue = calcNormal(buildCtx(baseStats, baseElements));
    if (baseValue === 0) return [] as StatHeatmapRow[];

    const isElementKey = (key: string): key is ElementStatKey =>
      key in baseElements;

    const evaluateImpact = (key: StatHeatmapKey, delta: number): number => {
      if (!Number.isFinite(delta) || delta === 0) return 0;

      if (isElementKey(key)) {
        const testElements = { ...baseElements };
        testElements[key] = Number(testElements[key] || 0) + delta;
        const testNormal = calcNormal(buildCtx(baseStats, testElements));
        return ((testNormal - baseValue) / baseValue) * 100;
      }

      const testStats = structuredClone(baseStats);
      const current = Number(testStats[key]?.current || 0);
      testStats[key] = {
        current: current + delta,
        increase: 0,
      };
      const testNormal = calcNormal(buildCtx(testStats, baseElements));
      return ((testNormal - baseValue) / baseValue) * 100;
    };

    const rows = (
      Object.entries(STAT_HEATMAP_AFFIX_LIMITS) as [
        StatHeatmapKey,
        { minPerLine: number; maxPerLine: number },
      ][]
    )
      .map(([key, range]) => {
        const minDelta = range.minPerLine * safeLineCount;
        const maxDelta = range.maxPerLine * safeLineCount;
        const minImpactPct = evaluateImpact(key, minDelta);
        const maxImpactPct = evaluateImpact(key, maxDelta);

        return {
          key,
          minDelta,
          maxDelta,
          minImpactPct,
          maxImpactPct,
          bestImpactPct: Math.max(minImpactPct, maxImpactPct),
        };
      })
      .sort((a, b) => b.bestImpactPct - a.bestImpactPct);

    return rows;
  }, [stats, elementStats, gearBonus, rotation, levelContext, lineCount]);
}
