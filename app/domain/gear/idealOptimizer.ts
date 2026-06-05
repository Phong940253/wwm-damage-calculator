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
  specialLines: string[]; // 8 lines, one for each gear
  mode?: "exhaustive" | "fast";
  elapsedMs?: number;
  iterations?: number;
}

export class IdealGearCancelledError extends Error {
  constructor() {
    super("Ideal gear optimization cancelled");
    this.name = "IdealGearCancelledError";
  }
}

type DamageEvalResult = {
  dmg: number;
  totalRate: number;
  critRate: number;
};

function stableSerialize(value: unknown): string {
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

function serializeNumberMap(map: Record<string, number>): string {
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

function createDamageCacheKey(
  path: ElementKey,
  rotation: Rotation | undefined,
  baseStats: InputStats | undefined,
  baseElementStats: ElementStats | undefined,
  scopeKey: string,
): string {
  return `${stableSerialize({
    path,
    rotation: rotation ?? null,
    baseStats: baseStats ?? null,
    baseElementStats: baseElementStats ?? null,
  })}|${scopeKey}`;
}

function evaluateDamageCached(
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
  // 1-2: bellstrikeMax, MaxPhysicalAttack, Power, Momentum
  ["bellstrikeMax", "MaxPhysicalAttack", "Power", "Momentum"],
  ["bellstrikeMax", "MaxPhysicalAttack", "Power", "Momentum"],
  // 3-4: MaxPhysicalAttack
  ["MaxPhysicalAttack"],
  ["MaxPhysicalAttack"],
  // 5-6: CriticalRate, AffinityRate
  ["CriticalRate", "AffinityRate"],
  ["CriticalRate", "AffinityRate"],
  // 7-8: AffinityRate, CriticalRate, Power
  ["AffinityRate", "CriticalRate", "Power"],
  ["AffinityRate", "CriticalRate", "Power"],
];

type RuleSet = {
  candidateStats: CandidateStat[];
  specialLinePools: CandidateStat[][];
  fixedLineStats: Record<string, { lines: number; valuePerLine: number }>;
  randomLineCount: number;
  baseGearBonus: Record<string, number>;
};

export function getIdealGearBaseBonus(
  path: ElementKey,
): Record<string, number> {
  const baseGearBonus: Record<string, number> = {
    MinPhysicalAttack: 71 + 53 + 53,
    MaxPhysicalAttack: 106 + 124 + 124,
  };

  return baseGearBonus;
}

function buildRuleSet(path: ElementKey): RuleSet {
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

  const fixedLineCount = Object.values(fixedLineStats).reduce(
    (sum, stat) => sum + stat.lines,
    0,
  );
  const randomLineCount = Math.max(
    0,
    TOTAL_LINES - fixedLineCount - SPECIAL_LINE_POOLS.length,
  );

  const baseGearBonus = getIdealGearBaseBonus(path);

  for (const [stat, { lines, valuePerLine }] of Object.entries(
    fixedLineStats,
  )) {
    baseGearBonus[stat] = (baseGearBonus[stat] || 0) + lines * valuePerLine;
  }

  return {
    candidateStats: [...CANDIDATE_STATS],
    specialLinePools: SPECIAL_LINE_POOLS,
    fixedLineStats,
    randomLineCount,
    baseGearBonus,
  };
}

type SearchState = {
  specialLines: string[];
  specialCounts: number[];
  tuningCounts: number[];
  totalCounts: number[];
  bonus: Record<string, number>;
  score: number;
};

function buildTotalCountsSnapshot(
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

function buildBonusFromCounts(
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

function countSpecialLines(
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

function buildSpecialSequence(
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

function createRandomValidCounts(
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

export function calculateIdealGearStats(
  path: ElementKey,
  rotation?: Rotation,
  baseStats?: InputStats,
  baseElementStats?: ElementStats,
  options?: {
    onProgress?: (current: number, total: number) => void;
    signal?: AbortSignal;
    shardIndex?: number;
    shardCount?: number;
    initialResult?: IdealGearResult;
  },
): IdealGearResult {
  const onProgress = options?.onProgress;
  const signal = options?.signal;
  const startTime = Date.now();
  const ruleSet = buildRuleSet(path);
  const {
    candidateStats,
    specialLinePools: ruleSpecialLinePools,
    fixedLineStats,
    randomLineCount,
  } = ruleSet;
  const baseGearBonus = ruleSet.baseGearBonus;
  const candidateCount = candidateStats.length;
  const allocations = Array.from({ length: candidateCount }, () => 0);
  const candidateIndexByStat = new Map<CandidateStat, number>(
    candidateStats.map((stat, index) => [stat, index]),
  );
  const perLineValues = candidateStats.map((stat) => getValPerLine(stat));
  const maxRandomLines = candidateStats.map((stat) =>
    SINGLE_LINE_STATS.has(stat) ? 1 : MAX_LINES_PER_STAT,
  );

  const specialLinePools = ruleSpecialLinePools.map((pool) =>
    pool
      .map((stat) => candidateIndexByStat.get(stat) ?? -1)
      .filter((i) => i >= 0),
  );

  const specialCountPlans: Array<{
    counts: number[];
    indices: number[];
    sequence: string[];
  }> = [];
  const specialCounts = Array.from({ length: candidateCount }, () => 0);
  const currentSpecialSequence: string[] = [];

  const buildSpecialCountPlans = (slotIndex: number) => {
    if (slotIndex >= specialLinePools.length) {
      const countsSnapshot = [...specialCounts];
      const indices = countsSnapshot
        .map((count, index) => (count ? index : -1))
        .filter((index) => index >= 0);
      specialCountPlans.push({
        counts: countsSnapshot,
        indices,
        sequence: [...currentSpecialSequence],
      });
      return;
    }

    for (const statIndex of specialLinePools[slotIndex]) {
      const stat = candidateStats[statIndex];
      if (SINGLE_LINE_STATS.has(stat) && specialCounts[statIndex] >= 1) {
        continue;
      }
      specialCounts[statIndex] += 1;
      currentSpecialSequence.push(stat);
      buildSpecialCountPlans(slotIndex + 1);
      currentSpecialSequence.pop();
      specialCounts[statIndex] -= 1;
    }
  };

  const countRandomCombinations = (caps: number[], remaining: number) => {
    const memo = new Map<string, number>();
    const walk = (index: number, leftover: number): number => {
      const key = `${index}:${leftover}`;
      const cached = memo.get(key);
      if (cached !== undefined) return cached;
      if (index >= caps.length) return leftover === 0 ? 1 : 0;

      let total = 0;
      const max = Math.min(caps[index], leftover);
      for (let v = 0; v <= max; v += 1) {
        total += walk(index + 1, leftover - v);
      }
      memo.set(key, total);
      return total;
    };
    return walk(0, remaining);
  };

  const damageCache = new Map<string, DamageEvalResult>();
  const evaluateCurrentDamage = (gearBonus: Record<string, number>) =>
    evaluateDamageCached(
      damageCache,
      createDamageCacheKey(
        path,
        rotation,
        baseStats,
        baseElementStats,
        serializeNumberMap(gearBonus),
      ),
      gearBonus,
      path,
      rotation,
      baseStats,
      baseElementStats,
    );

  const currentBonus: Record<string, number> = { ...baseGearBonus };

  let bestDamage = -Infinity;
  let bestBonus: Record<string, number> | null = null;
  let bestAllocations: Record<string, number> | null = null;
  let bestSpecialLines: string[] = [];

  if (options?.initialResult && options.initialResult.path === path) {
    bestBonus = { ...options.initialResult.stats };
    bestAllocations = { ...options.initialResult.allocations };
    bestSpecialLines = options.initialResult.specialLines || [];
    // Re-evaluate to get accurate benchmark for CURRENT base stats
    const benchmark = evaluateCurrentDamage(bestBonus);
    bestDamage = benchmark.dmg;
  }

  let progressCurrent = 0;
  let lastProgress = 0;
  let lastProgressAt = 0;
  let progressTotal = 0;
  const progressStep = 1000;

  const throwIfCancelled = () => {
    if (signal?.aborted) throw new IdealGearCancelledError();
  };

  const reportProgress = (force = false) => {
    if (!onProgress) return;
    const now = Date.now();
    if (
      force ||
      progressCurrent === progressTotal ||
      progressCurrent - lastProgress >= progressStep ||
      now - lastProgressAt >= 200
    ) {
      lastProgress = progressCurrent;
      lastProgressAt = now;
      onProgress(progressCurrent, progressTotal);
    }
  };

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

  const recordBest = (
    specialSequence: string[],
    specialCountsPlan: number[],
  ) => {
    throwIfCancelled();

    // Đưa tiến trình lên đầu để đảm bảo quét qua case nào là tính case đó
    progressCurrent += 1;
    reportProgress();

    // 1. Kiểm tra giới hạn nghiêm ngặt cho exclusive boosts (Tối đa 1 dòng trên toàn bộ hệ thống)
    for (const stat of SINGLE_LINE_STATS) {
      const statIndex = candidateStats.indexOf(stat as CandidateStat);
      if (statIndex !== -1) {
        // allocations[statIndex] đã bao gồm cả random + special nhờ hàm applyLines trước đó rồi
        if (allocations[statIndex] > 1) return;
      }
    }

    // 2. Kiểm tra giới hạn Max 8 dòng cho các stat thông thường
    for (let i = 0; i < candidateCount; i++) {
      const stat = candidateStats[i];
      if (SINGLE_LINE_STATS.has(stat)) continue;

      // Nếu dòng Special ĐƯỢC MIỄN TRỪ khỏi mốc 8 dòng:
      // Ta lấy tổng trừ đi dòng special để ra số dòng phụ (Tuning), dòng phụ không được > 8
      const tuningLinesOnly = allocations[i] - specialCountsPlan[i];
      if (tuningLinesOnly > MAX_LINES_PER_STAT) return;

      // NGƯỢC LẠI, nếu luật game ép TỔNG TẤT CẢ không được quá 8, hãy dùng:
      // if (allocations[i] > MAX_LINES_PER_STAT) return;
    }

    const evalResult = evaluateCurrentDamage(currentBonus);

    if (evalResult.dmg <= bestDamage) return;
    bestDamage = evalResult.dmg;
    bestBonus = { ...currentBonus };
    bestAllocations = snapshotAllocations();
    bestSpecialLines = [...specialSequence];
  };

  const searchRandom = (statIndex: number, remaining: number) => {
    throwIfCancelled();
    if (statIndex === candidateCount) {
      if (remaining === 0) {
        for (const plan of activeSpecialPlans) {
          for (const index of plan.indices) {
            applyLines(index, plan.counts[index]);
          }
          recordBest(plan.sequence, plan.counts);
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

  const shardIndex = Math.max(0, Math.floor(options?.shardIndex ?? 0));
  const shardCount = Math.max(1, Math.floor(options?.shardCount ?? 1));
  const activeSpecialPlans =
    shardCount > 1
      ? specialCountPlans.filter(
          (_, index) => index % shardCount === shardIndex,
        )
      : specialCountPlans;

  const randomComboCount =
    randomLineCount > 0
      ? countRandomCombinations(maxRandomLines, randomLineCount)
      : 1;
  progressTotal = activeSpecialPlans.length * randomComboCount;
  reportProgress(true);

  if (randomLineCount <= 0) {
    for (const plan of activeSpecialPlans) {
      for (const index of plan.indices) {
        applyLines(index, plan.counts[index]);
      }
      recordBest(plan.sequence, plan.counts);
      for (const index of plan.indices) {
        applyLines(index, -plan.counts[index]);
      }
    }
  } else {
    searchRandom(0, randomLineCount);
  }

  reportProgress(true);

  return {
    path,
    maxDamage: bestDamage,
    allocations: bestAllocations || snapshotAllocations(),
    stats: bestBonus || { ...currentBonus },
    specialLines: bestSpecialLines,
    mode: "exhaustive",
    elapsedMs: Date.now() - startTime,
  };
}

export interface IdealGear {
  id: number;
  specialLine: string;
  tuningLines: string[];
}

export function distributeStatsToGears(result: IdealGearResult): IdealGear[] {
  const { path, specialLines, allocations } = result;
  if (!specialLines || specialLines.length < 8) return [];

  type GearState = {
    id: number;
    specialLine: string;
    tuningLines: string[];
  };

  type FlowEdge = {
    to: number;
    rev: number;
    cap: number;
    statIndex?: number;
    gearIndex?: number;
  };

  const gears: GearState[] = Array.from({ length: 8 }, (_, index) => ({
    id: index + 1,
    specialLine: specialLines[index],
    tuningLines: [],
  }));

  const tuningCounts: Record<string, number> = { ...allocations };

  for (const gear of gears) {
    tuningCounts[gear.specialLine] = Math.max(
      0,
      (tuningCounts[gear.specialLine] || 0) - 1,
    );
  }

  const getSlot6Stat = (gearId: number) => {
    if (path !== "bellstrike") return null;
    return gearId <= 4
      ? "PhysicalPenetration"
      : "NamelessSwordChargedSkillDMGBoost";
  };

  const reserveLine = (gearIndex: number, stat: string) => {
    const gear = gears[gearIndex];
    if (!gear) return false;
    if ((tuningCounts[stat] || 0) <= 0) return false;
    if (gear.tuningLines.includes(stat)) return false;
    gear.tuningLines.push(stat);
    tuningCounts[stat] -= 1;
    return true;
  };

  for (const gear of gears) {
    const fixedStat = getSlot6Stat(gear.id);
    if (fixedStat) {
      reserveLine(gear.id - 1, fixedStat);
    }
  }

  const exclusivePlacements: Record<string, number> = {
    ArtOfSwordDMGBoost: 1,
    AllMartialArtsBoost: 3,
    CombatBoostAgainstBossUnits: 7,
  };

  for (const [stat, gearId] of Object.entries(exclusivePlacements)) {
    reserveLine(gearId - 1, stat);
  }

  const remainingStats = Object.entries(tuningCounts)
    .filter(([, count]) => count > 0)
    .map(([stat, count]) => ({ stat, count }));

  const remainingCapacity = gears.map((gear) =>
    Math.max(0, 5 - gear.tuningLines.length),
  );
  const statNodeCount = remainingStats.length;
  const gearNodeOffset = 1 + statNodeCount;
  const sinkNode = gearNodeOffset + gears.length;
  const nodeCount = sinkNode + 1;
  const graph: FlowEdge[][] = Array.from({ length: nodeCount }, () => []);

  const addEdge = (
    from: number,
    to: number,
    cap: number,
    meta?: { statIndex?: number; gearIndex?: number },
  ) => {
    const forward: FlowEdge = {
      to,
      rev: graph[to].length,
      cap,
      statIndex: meta?.statIndex,
      gearIndex: meta?.gearIndex,
    };
    const backward: FlowEdge = {
      to: from,
      rev: graph[from].length,
      cap: 0,
    };
    graph[from].push(forward);
    graph[to].push(backward);
  };

  const source = 0;
  let targetAssignments = 0;

  remainingStats.forEach(({ stat, count }, statIndex) => {
    addEdge(source, 1 + statIndex, count, { statIndex });
    targetAssignments += count;
  });

  remainingStats.forEach(({ stat }, statIndex) => {
    gears.forEach((gear, gearIndex) => {
      if (remainingCapacity[gearIndex] <= 0) return;
      if (gear.tuningLines.includes(stat)) return;
      addEdge(1 + statIndex, gearNodeOffset + gearIndex, 1, {
        statIndex,
        gearIndex,
      });
    });
  });

  remainingCapacity.forEach((cap, gearIndex) => {
    addEdge(gearNodeOffset + gearIndex, sinkNode, cap, { gearIndex });
  });

  let flow = 0;
  while (true) {
    const parentNode = Array(nodeCount).fill(-1);
    const parentEdge = Array(nodeCount).fill(-1);
    const queue: number[] = [source];
    parentNode[source] = source;

    for (
      let head = 0;
      head < queue.length && parentNode[sinkNode] === -1;
      head += 1
    ) {
      const node = queue[head];
      for (let edgeIndex = 0; edgeIndex < graph[node].length; edgeIndex += 1) {
        const edge = graph[node][edgeIndex];
        if (edge.cap <= 0 || parentNode[edge.to] !== -1) continue;
        parentNode[edge.to] = node;
        parentEdge[edge.to] = edgeIndex;
        queue.push(edge.to);
        if (edge.to === sinkNode) break;
      }
    }

    if (parentNode[sinkNode] === -1) break;

    let bottleneck = Number.POSITIVE_INFINITY;
    for (let node = sinkNode; node !== source; node = parentNode[node]) {
      const prev = parentNode[node];
      const edge = graph[prev][parentEdge[node]];
      bottleneck = Math.min(bottleneck, edge.cap);
    }

    for (let node = sinkNode; node !== source; node = parentNode[node]) {
      const prev = parentNode[node];
      const edgeIndex = parentEdge[node];
      const edge = graph[prev][edgeIndex];
      edge.cap -= bottleneck;
      graph[node][edge.rev].cap += bottleneck;
    }

    flow += bottleneck;
  }

  if (flow !== targetAssignments) {
    return [];
  }

  for (let statIndex = 0; statIndex < remainingStats.length; statIndex += 1) {
    const node = 1 + statIndex;
    for (const edge of graph[node]) {
      if (edge.gearIndex === undefined) continue;
      const reverse = graph[edge.to][edge.rev];
      if (reverse.cap > 0) {
        gears[edge.gearIndex].tuningLines.push(remainingStats[statIndex].stat);
      }
    }
  }

  if (path === "bellstrike") {
    for (const gear of gears) {
      const fixedStat = getSlot6Stat(gear.id);
      if (!fixedStat) continue;
      const fixedIdx = gear.tuningLines.indexOf(fixedStat);
      if (fixedIdx !== -1) {
        gear.tuningLines.splice(fixedIdx, 1);
        gear.tuningLines.push(fixedStat);
      }
    }
  }

  return gears;
}

export function calculateIdealGearStatsFast(
  path: ElementKey,
  rotation?: Rotation,
  baseStats?: InputStats,
  baseElementStats?: ElementStats,
  options?: {
    onProgress?: (current: number, total: number) => void;
    signal?: AbortSignal;
    timeMs?: number;
    seed?: number;
    initialResult?: IdealGearResult;
  },
): IdealGearResult {
  const onProgress = options?.onProgress;
  const signal = options?.signal;
  const timeMs = Math.max(1000, Math.floor(options?.timeMs ?? 60_000));
  const startTime = Date.now();
  const ruleSet = buildRuleSet(path);

  const candidateStats = ruleSet.candidateStats;
  const candidateCount = candidateStats.length;
  const randomLineCount = ruleSet.randomLineCount;
  const baseGearBonus = ruleSet.baseGearBonus;
  const fixedLineStats = ruleSet.fixedLineStats;
  const perLineValues = candidateStats.map((stat) => getValPerLine(stat));
  const maxCaps = candidateStats.map((stat) =>
    SINGLE_LINE_STATS.has(stat) ? 1 : MAX_LINES_PER_STAT,
  );
  const specialPools = ruleSet.specialLinePools.map((pool) =>
    pool.map((stat) => candidateStats.indexOf(stat)).filter((i) => i >= 0),
  );
  const damageCache = new Map<string, DamageEvalResult>();
  const evaluateCurrentDamage = (gearBonus: Record<string, number>) =>
    evaluateDamageCached(
      damageCache,
      createDamageCacheKey(
        path,
        rotation,
        baseStats,
        baseElementStats,
        serializeNumberMap(gearBonus),
      ),
      gearBonus,
      path,
      rotation,
      baseStats,
      baseElementStats,
    );

  let bestDamage = -Infinity;
  let bestBonus: Record<string, number> | null = null;
  let bestAllocations: Record<string, number> | null = null;
  let bestSpecialLines: string[] = [];

  if (options?.initialResult && options.initialResult.path === path) {
    bestBonus = { ...options.initialResult.stats };
    bestAllocations = { ...options.initialResult.allocations };
    bestSpecialLines = options.initialResult.specialLines || [];
    const benchmark = evaluateCurrentDamage(bestBonus);
    bestDamage = benchmark.dmg;
  }

  let iterations = 0;
  let lastProgressAt = 0;

  let rngSeed =
    typeof options?.seed === "number"
      ? Math.floor(options.seed)
      : Math.floor(Math.random() * 0x7fffffff);

  const rand = () => {
    rngSeed = (rngSeed * 1664525 + 1013904223) >>> 0;
    return rngSeed / 0x100000000;
  };

  const throwIfCancelled = () => {
    if (signal?.aborted) throw new IdealGearCancelledError();
  };

  const reportProgress = (force = false) => {
    if (!onProgress) return;
    const elapsed = Math.min(timeMs, Date.now() - startTime);
    if (force || Date.now() - lastProgressAt >= 200) {
      lastProgressAt = Date.now();
      onProgress(elapsed, timeMs);
    }
  };

  const updateBest = (state: SearchState) => {
    if (state.score <= bestDamage) return;
    bestDamage = state.score;
    bestBonus = { ...state.bonus };
    bestAllocations = buildTotalCountsSnapshot(
      candidateStats,
      state.totalCounts,
      fixedLineStats,
    );
    bestSpecialLines = [...state.specialLines];
  };

  const buildState = (
    specialLines: string[],
    specialCounts: number[],
    tuningCounts: number[],
  ): SearchState => {
    const totalCounts = tuningCounts.map(
      (count, index) => count + (specialCounts[index] ?? 0),
    );
    const bonus = buildBonusFromCounts(
      baseGearBonus,
      candidateStats,
      perLineValues,
      totalCounts,
    );
    const score = evaluateCurrentDamage(bonus).dmg;
    iterations += 1;
    return {
      specialLines,
      specialCounts,
      tuningCounts,
      totalCounts,
      bonus,
      score,
    };
  };

  const reconstructSeedState = (): SearchState | null => {
    if (options?.initialResult?.path !== path) return null;
    const specialLines = options.initialResult.specialLines || [];
    if (specialLines.length < 8) return null;

    const specialCounts = countSpecialLines(candidateStats, specialLines);
    const tuningCounts = candidateStats.map((stat, index) => {
      const total = Number(options.initialResult?.allocations[stat] ?? 0);
      const normalizedTotal = Number.isFinite(total) ? Math.floor(total) : 0;
      return Math.max(0, normalizedTotal - specialCounts[index]);
    });

    return buildState([...specialLines], specialCounts, tuningCounts);
  };

  const buildRandomRestartState = (): SearchState | null => {
    const specialLines = buildSpecialSequence(
      rand,
      specialPools,
      candidateStats,
    );
    const specialCounts = countSpecialLines(candidateStats, specialLines);
    const caps = maxCaps.map((cap, index) => cap - specialCounts[index]);
    if (caps.some((cap) => cap < 0)) return null;

    const availableLines = caps.reduce((sum, cap) => sum + cap, 0);
    if (availableLines < randomLineCount) return null;

    const tuningCounts = createRandomValidCounts(rand, caps, randomLineCount);
    if (
      tuningCounts.reduce((sum, count) => sum + count, 0) !== randomLineCount
    ) {
      return null;
    }

    return buildState(specialLines, specialCounts, tuningCounts);
  };

  const runHillClimb = (startState: SearchState) => {
    updateBest(startState);
    let currentState = startState;
    let localSteps = 0;
    const stepLimit = Math.max(8, candidateCount * 4);

    while (Date.now() - startTime < timeMs && localSteps < stepLimit) {
      throwIfCancelled();

      const caps = maxCaps.map(
        (cap, index) => cap - currentState.specialCounts[index],
      );
      let nextBest: SearchState | null = null;

      for (let fromIndex = 0; fromIndex < candidateCount; fromIndex += 1) {
        if (currentState.tuningCounts[fromIndex] <= 0) continue;

        for (let toIndex = 0; toIndex < candidateCount; toIndex += 1) {
          if (fromIndex === toIndex) continue;
          if (currentState.tuningCounts[toIndex] >= caps[toIndex]) continue;

          const nextTuningCounts = [...currentState.tuningCounts];
          nextTuningCounts[fromIndex] -= 1;
          nextTuningCounts[toIndex] += 1;

          const nextTotalCounts = nextTuningCounts.map(
            (count, index) => count + currentState.specialCounts[index],
          );
          const nextBonus = buildBonusFromCounts(
            baseGearBonus,
            candidateStats,
            perLineValues,
            nextTotalCounts,
          );
          const nextScore = evaluateCurrentDamage(nextBonus).dmg;
          iterations += 1;

          if (!nextBest || nextScore > nextBest.score) {
            nextBest = {
              specialLines: currentState.specialLines,
              specialCounts: currentState.specialCounts,
              tuningCounts: nextTuningCounts,
              totalCounts: nextTotalCounts,
              bonus: nextBonus,
              score: nextScore,
            };
          }

          reportProgress();
          if (Date.now() - startTime >= timeMs) break;
        }

        if (Date.now() - startTime >= timeMs) break;
      }

      if (!nextBest || nextBest.score <= currentState.score) {
        break;
      }

      currentState = nextBest;
      localSteps += 1;
      updateBest(currentState);
    }
  };

  const seedState = reconstructSeedState();
  if (seedState) {
    runHillClimb(seedState);
  }

  while (Date.now() - startTime < timeMs) {
    throwIfCancelled();
    const restartState = buildRandomRestartState();
    if (!restartState) break;
    runHillClimb(restartState);
    reportProgress();
  }

  reportProgress(true);

  const fallbackAllocations = buildTotalCountsSnapshot(
    candidateStats,
    new Array(candidateCount).fill(0),
    fixedLineStats,
  );

  return {
    path,
    maxDamage: bestDamage,
    allocations: bestAllocations || fallbackAllocations,
    stats: bestBonus || { ...baseGearBonus },
    specialLines: bestSpecialLines,
    mode: "fast",
    elapsedMs: Date.now() - startTime,
    iterations,
  };
}
