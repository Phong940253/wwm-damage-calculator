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

  return {
    candidateStats: [...CANDIDATE_STATS],
    specialLinePools: SPECIAL_LINE_POOLS,
    fixedLineStats,
    randomLineCount,
    baseGearBonus,
  };
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
    const benchmark = evaluateDamage(
      bestBonus,
      path,
      rotation,
      baseStats,
      baseElementStats,
    );
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

  // Initialize gears with special line (slot 1) and fixed lines (slot 6)
  const gears: IdealGear[] = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    specialLine: specialLines[i],
    tuningLines: [],
  }));

  // Define Fixed Stats (Slot 6)
  const getSlot6Stat = (gearId: number) => {
    if (path !== "bellstrike") return null;
    return gearId <= 4
      ? "PhysicalPenetration"
      : "NamelessSwordChargedSkillDMGBoost";
  };

  // Define Exclusive Placements (to be placed in slots 2-5)
  const exclusivePlacements: Record<string, number> = {
    ArtOfSwordDMGBoost: 1, // Gear 1
    AllMartialArtsBoost: 3, // Gear 3
    CombatBoostAgainstBossUnits: 7, // Gear 7
  };

  const tuningCounts: Record<string, number> = { ...allocations };

  // Deduct Special Lines (Slot 1)
  for (const gear of gears) {
    tuningCounts[gear.specialLine] = Math.max(
      0,
      (tuningCounts[gear.specialLine] || 0) - 1,
    );
  }

  // Place Fixed Stats (Slot 6)
  for (const gear of gears) {
    const slot6 = getSlot6Stat(gear.id);
    if (slot6 && tuningCounts[slot6] > 0) {
      gear.tuningLines.push(slot6);
      tuningCounts[slot6]--;
    }
  }

  // Place Exclusive Boosts (Slots 2-5)
  for (const [stat, gearId] of Object.entries(exclusivePlacements)) {
    if (tuningCounts[stat] > 0) {
      const gear = gears.find((g) => g.id === gearId);
      if (gear) {
        // STRICT: No duplicate stats in one gear (Special Slot + Fixed Slot + Tuning Slots)
        const hasStat =
          gear.specialLine === stat || gear.tuningLines.includes(stat);
        if (gear.tuningLines.length < 5 && !hasStat) {
          gear.tuningLines.push(stat);
          tuningCounts[stat]--;
        }
      }
    }
  }

  // Place remaining stats into Slots 2-5
  const tuningPool: string[] = [];
  Object.entries(tuningCounts).forEach(([stat, count]) => {
    for (let i = 0; i < count; i++) tuningPool.push(stat);
  });

  // Sort by frequency (desc)
  tuningPool.sort((a, b) => (tuningCounts[b] || 0) - (tuningCounts[a] || 0));

  for (const stat of tuningPool) {
    let placed = false;
    for (const gear of gears) {
      if (gear.tuningLines.length >= 5) continue;

      // ALLOW: Special line can duplicate tuning lines.
      // STRICT: No duplicate stats among tuning lines.
      const hasStat = gear.tuningLines.includes(stat);
      if (!hasStat) {
        gear.tuningLines.push(stat);
        placed = true;
        break;
      }
    }
    // Fallback: If strict uniqueness fails, force fill anyway to ensure 6 total lines
    if (!placed) {
      for (const gear of gears) {
        if (gear.tuningLines.length < 5) {
          gear.tuningLines.push(stat);
          break;
        }
      }
    }
  }

  // Ensure Slot 6 is always the fixed stat if it exists
  if (path === "bellstrike") {
    for (const gear of gears) {
      const fixedStat = getSlot6Stat(gear.id);
      if (!fixedStat) continue;

      const fixedIdx = gear.tuningLines.indexOf(fixedStat);
      if (fixedIdx !== -1) {
        gear.tuningLines.splice(fixedIdx, 1);
        gear.tuningLines.push(fixedStat); // Move to end
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
  const randomCaps = candidateStats.map((stat) =>
    SINGLE_LINE_STATS.has(stat) ? 1 : MAX_LINES_PER_STAT,
  );

  const specialPools = ruleSet.specialLinePools.map((pool) =>
    pool.map((stat) => candidateStats.indexOf(stat)).filter((i) => i >= 0),
  );

  let bestDamage = -Infinity;
  let bestBonus: Record<string, number> | null = null;
  let bestAllocations: Record<string, number> | null = null;
  let bestSpecialLines: string[] = [];

  if (options?.initialResult && options.initialResult.path === path) {
    bestBonus = { ...options.initialResult.stats };
    bestAllocations = { ...options.initialResult.allocations };
    bestSpecialLines = options.initialResult.specialLines || [];
    // Re-evaluate to get accurate benchmark for CURRENT base stats
    const benchmark = evaluateDamage(
      bestBonus,
      path,
      rotation,
      baseStats,
      baseElementStats,
    );
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

  const snapshotAllocations = (allocations: number[]) => {
    const snapshot: Record<string, number> = {};
    candidateStats.forEach((stat, index) => {
      snapshot[stat] = allocations[index] ?? 0;
    });
    for (const [stat, { lines }] of Object.entries(fixedLineStats)) {
      snapshot[stat] = (snapshot[stat] || 0) + lines;
    }
    return snapshot;
  };

  while (Date.now() - startTime < timeMs) {
    throwIfCancelled();
    iterations += 1;
    const allocations = Array.from({ length: candidateCount }, () => 0);
    const currentBonus: Record<string, number> = { ...baseGearBonus };
    const currentSpecialLines: string[] = [];
    const remainingCaps = [...randomCaps];

    let remaining = randomLineCount;
    const openStats = remainingCaps
      .map((cap, index) => (cap > 0 ? index : -1))
      .filter((index) => index >= 0);

    // 1. Phân bổ ngẫu nhiên các dòng phụ (Random/Tuning Lines)
    while (remaining > 0 && openStats.length > 0) {
      const pickIndex = Math.floor(rand() * openStats.length);
      const statIndex = openStats[pickIndex];
      allocations[statIndex] += 1;
      remainingCaps[statIndex] -= 1;
      currentBonus[candidateStats[statIndex]] =
        (currentBonus[candidateStats[statIndex]] || 0) +
        perLineValues[statIndex];

      if (remainingCaps[statIndex] <= 0) {
        openStats.splice(pickIndex, 1);
      }
      remaining -= 1;
    }

    if (remaining > 0) continue;

    // 2. Phân bổ ngẫu nhiên các dòng đặc biệt (Special Lines)
    for (const pool of specialPools) {
      const statIndex = pool[Math.floor(rand() * pool.length)];
      allocations[statIndex] += 1;
      const statName = candidateStats[statIndex];
      currentBonus[statName] =
        (currentBonus[statName] || 0) + perLineValues[statIndex];
      currentSpecialLines.push(statName);
    }

    // 3. VALIDATION: Kiểm tra tính hợp lệ của cấu hình vừa sinh
    let isValid = true;

    // Luật 3.1: Kiểm tra giới hạn nghiêm ngặt cho Exclusive Boosts (Tổng Special + Tuning không quá 1 dòng)
    for (const stat of SINGLE_LINE_STATS) {
      const statIndex = candidateStats.indexOf(stat as CandidateStat);
      if (statIndex !== -1 && allocations[statIndex] > 1) {
        isValid = false;
        break;
      }
    }

    // Luật 3.2: Kiểm tra giới hạn Max 8 dòng phụ cho các stat thông thường
    if (isValid) {
      for (let i = 0; i < candidateCount; i++) {
        const stat = candidateStats[i];
        if (SINGLE_LINE_STATS.has(stat)) continue;

        // Tách số dòng Special ra để kiểm tra riêng phần Tuning Lines
        const specialCountForThisStat = currentSpecialLines.filter(
          (s) => s === stat,
        ).length;
        const tuningLinesOnly = allocations[i] - specialCountForThisStat;

        if (tuningLinesOnly > MAX_LINES_PER_STAT) {
          isValid = false;
          break;
        }

        // LƯU Ý: Nếu luật game của bạn tính TỔNG (Special + Tuning) không được quá 8 dòng,
        // hãy comment đoạn trên lại và dùng dòng check dưới này:
        // if (allocations[i] > MAX_LINES_PER_STAT) { isValid = false; break; }
      }
    }

    // Nếu cấu hình ngẫu nhiên phạm luật, bỏ qua và nhảy sang loop kế tiếp
    if (!isValid) continue;

    // 4. Tính toán damage và cập nhật Best Result
    const evalResult = evaluateDamage(
      currentBonus,
      path,
      rotation,
      baseStats,
      baseElementStats,
    );

    if (evalResult.dmg > bestDamage) {
      bestDamage = evalResult.dmg;
      bestBonus = { ...currentBonus };
      bestAllocations = snapshotAllocations(allocations);
      bestSpecialLines = [...currentSpecialLines];
    }

    reportProgress();
  }

  reportProgress(true);

  return {
    path,
    maxDamage: bestDamage,
    allocations:
      bestAllocations || snapshotAllocations(new Array(candidateCount).fill(0)),
    stats: bestBonus || { ...baseGearBonus },
    specialLines: bestSpecialLines,
    mode: "fast",
    elapsedMs: Date.now() - startTime,
    iterations,
  };
}
