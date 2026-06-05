import {
  ElementKey,
  INITIAL_STATS,
  INITIAL_ELEMENT_STATS,
} from "@/app/constants";
import { buildDamageContext } from "../damage/damageContext";
import { calculateDamage } from "../damage/damageCalculator";
import { TuneStatKey, getPlayerTuneStatRange } from "./tuneAdvisor";
import { InputStats, ElementStats, Rotation } from "@/app/types";
import { computeIncludedInStatsGearBonus } from "@/app/domain/skill/includedInStatsImpact";
import {
  computeRotationBonuses,
  sumBonuses,
} from "@/app/domain/skill/modifierEngine";
import { SKILLS } from "@/app/domain/skill/skills";
import {
  calculateSkillDamage,
  createRotationSkillRuntimeState,
  advanceRotationSkillRuntimeState,
  buildSkillUseCountsInRotation,
  buildRotationSkillDamageOptions,
} from "@/app/domain/skill/skillDamage";

export interface IdealGearResult {
  path: ElementKey;
  maxDamage: number;
  allocations: Record<string, number>; // number of lines
  stats: Record<string, number>; // total stat value from these lines
}

function evaluateDamage(
  gearBonus: Record<string, number>,
  path: ElementKey,
  rotation?: Rotation,
  baseStats?: InputStats,
  baseElementStats?: ElementStats,
): { dmg: number; totalRate: number; critRate: number } {
  const elementStats = baseElementStats || {
    ...INITIAL_ELEMENT_STATS,
    selected: path,
  };
  const stats = baseStats || INITIAL_STATS;

  const includedAbs = computeIncludedInStatsGearBonus(
    stats,
    elementStats,
    rotation,
    gearBonus,
  );
  const effectiveGearBonus = sumBonuses(gearBonus, includedAbs);
  const rotationBonuses = computeRotationBonuses(
    stats,
    elementStats,
    effectiveGearBonus,
    rotation,
  );
  const finalBonus = sumBonuses(effectiveGearBonus, rotationBonuses);

  const ctx = buildDamageContext(stats, elementStats, finalBonus, undefined, {
    playerLevel: 91,
    enemyLevel: 91,
  });
  const totalRate = ctx.get("FinalCriticalRate") + ctx.get("FinalAffinityRate");
  const critRate = ctx.get("FinalCriticalRate");

  if (rotation && rotation.skills.length > 0) {
    const skillUseCountsInRotation = buildSkillUseCountsInRotation(
      rotation.skills,
    );
    let totalNormal = 0;
    const runtimeState = createRotationSkillRuntimeState();

    for (const rotSkill of rotation.skills) {
      const skill = SKILLS.find((s) => s.id === rotSkill.id);
      if (!skill) continue;

      const entryOpts = buildRotationSkillDamageOptions(
        rotSkill.id,
        rotSkill.params,
        rotation.activeInnerWays,
        skillUseCountsInRotation,
        rotSkill.count,
        rotation.activePassiveSkills,
        runtimeState.priorHitsBySkill,
      );

      const skillDmg = calculateSkillDamage(ctx, skill, entryOpts);
      if (!rotSkill.cancelled) {
        totalNormal += skillDmg.total.normal.value * rotSkill.count;
      }

      advanceRotationSkillRuntimeState(
        runtimeState,
        skill,
        entryOpts,
        rotSkill.count,
      );
    }
    return { dmg: totalNormal, totalRate, critRate };
  }

  return { dmg: calculateDamage(ctx).normal, totalRate, critRate };
}

function getValPerLine(stat: string): number {
  return getPlayerTuneStatRange(stat as TuneStatKey, 91).maxPerLine;
}

export function calculateIdealGearStats(
  path: ElementKey,
  rotation?: Rotation,
  baseStats?: InputStats,
  baseElementStats?: ElementStats,
): IdealGearResult {
  const TOTAL_LINES = 48;
  const MAX_LINES_PER_STAT = 8;
  const CANDIDATE_STATS = [
    "MaxPhysicalAttack",
    "bellstrikeMax",
    "CriticalRate",
    "AffinityRate",
    "CombatBoostAgainstBossUnits",
    "AllMartialArtsBoost",
    "ArtOfSwordDMGBoost",
    "Momentum",
    "Power",
  ] as const;
  type CandidateStat = (typeof CANDIDATE_STATS)[number];

  const SINGLE_LINE_STATS = new Set<CandidateStat>([
    "CombatBoostAgainstBossUnits",
    "AllMartialArtsBoost",
    "ArtOfSwordDMGBoost",
  ]);

  const SPECIAL_LINE_POOLS: CandidateStat[][] = [
    ["bellstrikeMax", "MaxPhysicalAttack", "Power", "Momentum"],
    ["bellstrikeMax", "MaxPhysicalAttack", "Power", "Momentum"],
    ["bellstrikeMax", "MaxPhysicalAttack", "Power", "Momentum"],
    ["bellstrikeMax", "MaxPhysicalAttack", "Power", "Momentum"],
    ["CriticalRate", "AffinityRate"],
    ["CriticalRate", "AffinityRate"],
    ["AffinityRate", "CriticalRate", "Momentum", "Power"],
    ["AffinityRate", "CriticalRate", "Momentum", "Power"],
  ];

  const fixedLineStats: Record<
    string,
    { lines: number; valuePerLine: number }
  > =
    path === "bellstrike"
      ? {
          NamelessSwordChargedSkillDMGBoost: { lines: 4, valuePerLine: 4.5 },
          PhysicalPenetration: {
            lines: 4,
            valuePerLine: getValPerLine("PhysicalPenetration"),
          },
        }
      : {};

  const fixedLineCount = Object.values(fixedLineStats).reduce(
    (sum, stat) => sum + stat.lines,
    0,
  );
  const randomLineCount = Math.max(
    0,
    TOTAL_LINES - fixedLineCount - SPECIAL_LINE_POOLS.length,
  );

  const baseGearBonus: Record<string, number> = {
    DamageBoost: 4 * 5.4,
    MinPhysicalAttack: 71 + 53 + 53,
    MaxPhysicalAttack: 106 + 124 + 124,
  };

  if (path !== "bellstrike") {
    baseGearBonus["DamageBoost"] =
      (baseGearBonus["DamageBoost"] || 0) + 1 * 5.9;
    baseGearBonus[`${path}DMGBonus`] = 4 * 4.5;
  }

  for (const [stat, { lines, valuePerLine }] of Object.entries(
    fixedLineStats,
  )) {
    baseGearBonus[stat] = (baseGearBonus[stat] || 0) + lines * valuePerLine;
  }

  const candidateStats = [...CANDIDATE_STATS];
  const candidateCount = candidateStats.length;
  const allocations = Array.from({ length: candidateCount }, () => 0);
  const candidateIndexByStat = new Map<CandidateStat, number>(
    candidateStats.map((stat, index) => [stat, index]),
  );
  const perLineValues = candidateStats.map((stat) => getValPerLine(stat));
  const maxRandomLines = candidateStats.map((stat) =>
    SINGLE_LINE_STATS.has(stat) ? 1 : MAX_LINES_PER_STAT,
  );

  const specialLinePools = SPECIAL_LINE_POOLS.map((pool) =>
    pool
      .map((stat) => candidateIndexByStat.get(stat) ?? -1)
      .filter((i) => i >= 0),
  );

  const specialCountPlans: Array<{ counts: number[]; indices: number[] }> = [];
  const specialCounts = Array.from({ length: candidateCount }, () => 0);
  const specialCountKeys = new Set<string>();

  const buildSpecialCountPlans = (slotIndex: number) => {
    if (slotIndex >= specialLinePools.length) {
      const key = specialCounts.join(",");
      if (!specialCountKeys.has(key)) {
        specialCountKeys.add(key);
        const countsSnapshot = [...specialCounts];
        const indices = countsSnapshot
          .map((count, index) => (count ? index : -1))
          .filter((index) => index >= 0);
        specialCountPlans.push({ counts: countsSnapshot, indices });
      }
      return;
    }

    for (const statIndex of specialLinePools[slotIndex]) {
      const stat = candidateStats[statIndex];
      if (SINGLE_LINE_STATS.has(stat) && specialCounts[statIndex] >= 1) {
        continue;
      }
      specialCounts[statIndex] += 1;
      buildSpecialCountPlans(slotIndex + 1);
      specialCounts[statIndex] -= 1;
    }
  };

  const currentBonus: Record<string, number> = { ...baseGearBonus };

  let bestDamage = -Infinity;
  let bestBonus: Record<string, number> | null = null;
  let bestAllocations: Record<string, number> | null = null;

  const applyLines = (statIndex: number, delta: number) => {
    if (delta === 0) return;
    const stat = candidateStats[statIndex];
    allocations[statIndex] += delta;
    currentBonus[stat] =
      (currentBonus[stat] || 0) + delta * perLineValues[statIndex];
  };

  const snapshotAllocations = () => {
    const snapshot: Record<string, number> = {};
    candidateStats.forEach((stat, index) => {
      snapshot[stat] = allocations[index];
    });
    for (const [stat, { lines }] of Object.entries(fixedLineStats)) {
      snapshot[stat] = (snapshot[stat] || 0) + lines;
    }
    return snapshot;
  };

  const recordBest = () => {
    const evalResult = evaluateDamage(
      currentBonus,
      path,
      rotation,
      baseStats,
      baseElementStats,
    );
    if (evalResult.dmg <= bestDamage) return;
    bestDamage = evalResult.dmg;
    bestBonus = { ...currentBonus };
    bestAllocations = snapshotAllocations();
  };

  const searchRandom = (statIndex: number, remaining: number) => {
    if (statIndex === candidateCount) {
      if (remaining === 0) {
        for (const plan of specialCountPlans) {
          for (const index of plan.indices) {
            applyLines(index, plan.counts[index]);
          }
          recordBest();
          for (const index of plan.indices) {
            applyLines(index, -plan.counts[index]);
          }
        }
      }
      return;
    }

    const maxLinesForStat = Math.min(maxRandomLines[statIndex], remaining);
    for (let lines = 0; lines <= maxLinesForStat; lines += 1) {
      if (lines) applyLines(statIndex, lines);
      searchRandom(statIndex + 1, remaining - lines);
      if (lines) applyLines(statIndex, -lines);
    }
  };

  buildSpecialCountPlans(0);

  if (randomLineCount <= 0) {
    for (const plan of specialCountPlans) {
      for (const index of plan.indices) {
        applyLines(index, plan.counts[index]);
      }
      recordBest();
      for (const index of plan.indices) {
        applyLines(index, -plan.counts[index]);
      }
    }
  } else {
    searchRandom(0, randomLineCount);
  }

  return {
    path,
    maxDamage: bestDamage,
    allocations: bestAllocations || snapshotAllocations(),
    stats: bestBonus || { ...currentBonus },
  };
}
