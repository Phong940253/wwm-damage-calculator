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
import { CandidateStat, DamageEvalResult, RuleSet } from "./types";
import {
  CANDIDATE_STATS,
  SINGLE_LINE_STATS,
  SPECIAL_LINE_POOLS,
  RANDOM_LINES_COUNT,
} from "./gearConstants";

// Giới hạn kích thước Cache để tránh tràn RAM (Out of Memory)
const MAX_CACHE_SIZE = 10000;

// Thuật toán hash chuỗi siêu tốc (djb2 biến thể) chuyển đổi string dài thành chuỗi base36 cực ngắn
export function fastHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([leftKey], [rightKey]) => leftKey.localeCompare(rightKey),
  );
  return `{${entries
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${stableSerialize(entryValue)}`,
    )
    .join(",")}}`;
}

export function serializeNumberMap(map: Record<string, number>): string {
  return Object.keys(map)
    .sort()
    .map((key) => {
      const value = map[key];
      const normalized = Number.isFinite(value)
        ? Math.round(value * 1e6) / 1e6
        : value;
      return `${key}:${normalized}`;
    })
    .join("|");
}

export function createDamageCacheKey(
  path: ElementKey,
  rotation: Rotation | undefined,
  baseStats: InputStats | undefined,
  baseElementStats: ElementStats | undefined,
  scopeKey: string,
): string {
  // Thay vì lưu cả cục JSON, ta băm nó thành một chuỗi cực ngắn (VD: "k3x9a2")
  const serializedData = stableSerialize({
    path,
    rotation: rotation ?? null,
    baseStats: baseStats ?? null,
    baseElementStats: baseElementStats ?? null,
  });

  return `${fastHash(serializedData)}|${scopeKey}`;
}

// 2. Hàm sinh Static Key (Chỉ gọi 1 lần duy nhất trước khi chạy Beam Search)
export function buildStaticHashKey(
  path: ElementKey,
  rotation: Rotation | undefined,
  baseStats: InputStats | undefined,
  baseElementStats: ElementStats | undefined,
): string {
  const serializedData = stableSerialize({
    path,
    rotation: rotation ?? null,
    baseStats: baseStats ?? null,
    baseElementStats: baseElementStats ?? null,
  });
  return fastHash(serializedData);
}

export function evaluateDamage(
  gearBonus: Record<string, number>,
  path: ElementKey,
  rotation?: Rotation,
  baseStats?: InputStats,
  baseElementStats?: ElementStats,
): DamageEvalResult {
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
        rotSkill.cancelled,
      );
      entryOpts.rotationSkills = rotation.skills;

      const skillDmg = calculateSkillDamage(ctx, skill, entryOpts);
      totalNormal += skillDmg.total.normal.value * rotSkill.count;

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

export function evaluateDamageCached(
  cache: Map<string, DamageEvalResult>,
  cacheKey: string,
  gearBonus: Record<string, number>,
  path: ElementKey,
  rotation?: Rotation,
  baseStats?: InputStats,
  baseElementStats?: ElementStats,
): DamageEvalResult {
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const result = evaluateDamage(
    gearBonus,
    path,
    rotation,
    baseStats,
    baseElementStats,
  );
  cache.set(cacheKey, result);
  return result;
}

// 1. Tạo một Object chứa key tĩnh đã băm sẵn
export interface FixedOptimizerContext {
  path: ElementKey;
  rotation?: Rotation;
  baseStats?: InputStats;
  baseElementStats?: ElementStats;
  staticHashKey: string; // Key này chỉ tính 1 lần
}

// 3. Hàm Evaluate tối ưu, nhận context tĩnh và chỉ tạo cache key dựa trên gearBonus
export function evaluateDamageCachedWithKey(
  cache: Map<string, DamageEvalResult>,
  ctx: FixedOptimizerContext,
  gearBonus: Record<string, number>,
  cacheKey: string,
): DamageEvalResult {
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const result = evaluateDamage(
    gearBonus,
    ctx.path,
    ctx.rotation,
    ctx.baseStats,
    ctx.baseElementStats,
  );
  cache.set(cacheKey, result);
  return result;
}

export function evaluateDamageCachedOptimized(
  cache: Map<string, DamageEvalResult>,
  ctx: FixedOptimizerContext,
  gearBonus: Record<string, number>,
): DamageEvalResult {
  // Chỉ serialize phần thay đổi duy nhất là Gear Bonus (Chuỗi này rất ngắn)
  const scopeKey = serializeNumberMap(gearBonus);
  const cacheKey = `${ctx.staticHashKey}|${scopeKey}`;

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const result = evaluateDamage(
    gearBonus,
    ctx.path,
    ctx.rotation,
    ctx.baseStats,
    ctx.baseElementStats,
  );

  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }

  cache.set(cacheKey, result);
  return result;
}

export function getValPerLine(stat: string): number {
  return getPlayerTuneStatRange(stat as TuneStatKey, 91).maxPerLine;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getIdealGearBaseBonus(_path?: ElementKey): Record<string, number> {
  const baseGearBonus: Record<string, number> = {
    MinPhysicalAttack: 71 + 53 + 53,
    MaxPhysicalAttack: 106 + 124 + 124,
  };

  return baseGearBonus;
}

export function buildRuleSet(path: ElementKey): RuleSet {
  const fixedLineStats: Record<
    string,
    { lines: number; valuePerLine: number }
  > =
    path === "bellstrike"
      ? {
          NamelessSwordChargedSkillDMGBoost: { lines: 4, valuePerLine: 5.0 },
          PhysicalPenetration: {
            lines: 4,
            valuePerLine: getValPerLine("PhysicalPenetration"),
          },
        }
      : {};

  const baseGearBonus = getIdealGearBaseBonus();

  for (const [stat, { lines, valuePerLine }] of Object.entries(
    fixedLineStats,
  )) {
    baseGearBonus[stat] = (baseGearBonus[stat] || 0) + lines * valuePerLine;
  }

  return {
    candidateStats: [...CANDIDATE_STATS],
    specialLinePools: SPECIAL_LINE_POOLS,
    fixedLineStats,
    randomLineCount: RANDOM_LINES_COUNT,
    baseGearBonus,
  };
}

export function buildTotalCountsSnapshot(
  candidateStats: readonly CandidateStat[],
  totalCounts: number[],
  fixedLineStats: Record<string, { lines: number; valuePerLine: number }>,
): Record<string, number> {
  const snapshot: Record<string, number> = {};
  candidateStats.forEach((stat, index) => {
    snapshot[stat] = totalCounts[index] ?? 0;
  });
  for (const [stat, { lines }] of Object.entries(fixedLineStats)) {
    snapshot[stat] = (snapshot[stat] || 0) + lines;
  }
  return snapshot;
}

export function buildBonusFromCounts(
  baseGearBonus: Record<string, number>,
  candidateStats: readonly CandidateStat[],
  perLineValues: number[],
  totalCounts: number[],
): Record<string, number> {
  const bonus: Record<string, number> = { ...baseGearBonus };
  candidateStats.forEach((stat, index) => {
    const count = totalCounts[index] ?? 0;
    if (count <= 0) return;
    bonus[stat] = (bonus[stat] || 0) + count * perLineValues[index];
  });
  return bonus;
}

export function countSpecialLines(
  candidateStats: readonly CandidateStat[],
  specialLines: string[],
): number[] {
  const counts = Array.from({ length: candidateStats.length }, () => 0);
  const indexByStat = new Map<string, number>(
    candidateStats.map((stat, index) => [stat, index]),
  );

  for (const stat of specialLines) {
    const index = indexByStat.get(stat);
    if (index === undefined) continue;
    counts[index] += 1;
  }

  return counts;
}

export function buildSpecialSequence(
  rand: () => number,
  specialLinePools: number[][],
  candidateStats: readonly CandidateStat[],
): string[] {
  const sequence: string[] = [];
  for (const pool of specialLinePools) {
    const statIndex = pool[Math.floor(rand() * pool.length)];
    sequence.push(candidateStats[statIndex]);
  }
  return sequence;
}

export function buildCanonicalSpecialSequence(
  candidateStats: readonly CandidateStat[],
  counts: readonly number[],
): string[] {
  const sequence: string[] = [];
  candidateStats.forEach((stat, index) => {
    const count = counts[index] ?? 0;
    for (let i = 0; i < count; i += 1) {
      sequence.push(stat);
    }
  });
  return sequence;
}

export function enumerateSpecialGroupPlans(
  candidateStats: readonly CandidateStat[],
  pool: readonly number[],
  slotCount: number,
  fixedLineStats: Record<string, { lines: number }> = {}, // <-- Đã thêm param này
): number[][] {
  const plans: number[][] = [];
  const current = Array.from({ length: candidateStats.length }, () => 0);

  const walk = (poolIndex: number, remaining: number) => {
    if (poolIndex >= pool.length) {
      if (remaining === 0) plans.push([...current]);
      return;
    }

    const statIndex = pool[poolIndex];
    const stat = candidateStats[statIndex];

    // Tính toán lại Cap để cover trường hợp có sẵn Fixed Lines
    let cap = slotCount;
    if (SINGLE_LINE_STATS.has(stat)) {
      const fixedCount = fixedLineStats[stat]?.lines || 0;
      cap = Math.max(0, 1 - fixedCount);
    }
    const max = Math.min(cap, remaining);

    for (let count = 0; count <= max; count += 1) {
      current[statIndex] = count;
      walk(poolIndex + 1, remaining - count);
    }

    current[statIndex] = 0;
  };

  walk(0, slotCount);
  return plans;
}

export function createRandomValidCounts(
  rand: () => number,
  caps: number[],
  totalLines: number,
): number[] {
  const counts = Array.from({ length: caps.length }, () => 0);
  const remainingCaps = [...caps];
  const openIndices = remainingCaps
    .map((cap, index) => (cap > 0 ? index : -1))
    .filter((index) => index >= 0);

  let remaining = totalLines;
  while (remaining > 0 && openIndices.length > 0) {
    const pickIndex = Math.floor(rand() * openIndices.length);
    const statIndex = openIndices[pickIndex];
    counts[statIndex] += 1;
    remainingCaps[statIndex] -= 1;
    if (remainingCaps[statIndex] <= 0) {
      openIndices.splice(pickIndex, 1);
    }
    remaining -= 1;
  }

  return counts;
}
