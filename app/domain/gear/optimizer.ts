import { ElementKey, Rotation } from "@/app/types";
import { InputStats, ElementStats } from "@/app/types";
import {
  IdealGearResult,
  IdealGear,
  SearchState,
  DamageEvalResult,
  CandidateStat,
} from "./types";
import { getPlayerTuneStatRange, type TuneStatKey } from "./tuneAdvisor";
import {
  createDamageCacheKey,
  serializeNumberMap,
  buildRuleSet,
  buildTotalCountsSnapshot,
  buildBonusFromCounts,
  countSpecialLines,
  buildSpecialSequence,
  createRandomValidCounts,
  getValPerLine,
  buildStaticHashKey,
  FixedOptimizerContext,
  evaluateDamageCachedOptimized,
  evaluateDamageCachedWithKey,
  evaluateDamageCached,
} from "./optimizerUtils";
import { SINGLE_LINE_STATS, MAX_LINES_PER_STAT } from "./gearConstants";

export class IdealGearCancelledError extends Error {
  constructor() {
    super("Ideal gear optimization cancelled");
    this.name = "IdealGearCancelledError";
  }
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
    if (allocations[statIndex] + delta < 0) {
      return;
    }
    const stat = candidateStats[statIndex];
    allocations[statIndex] += delta;
    currentBonus[stat] =
      (currentBonus[stat] || 0) +
      delta * getPlayerTuneStatRange(stat as TuneStatKey, 91).maxPerLine;
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

    progressCurrent += 1;
    reportProgress();

    for (const stat of SINGLE_LINE_STATS) {
      const statIndex = candidateStats.indexOf(stat as CandidateStat);
      if (statIndex !== -1) {
        if (allocations[statIndex] > 1) return;
      }
    }

    for (let i = 0; i < candidateCount; i++) {
      const stat = candidateStats[i];
      if (SINGLE_LINE_STATS.has(stat)) continue;

      const tuningLinesOnly = allocations[i] - specialCountsPlan[i];
      if (tuningLinesOnly > MAX_LINES_PER_STAT) return;
    }

    const evalResult = evaluateCurrentDamage(currentBonus);

    if (evalResult.dmg <= bestDamage) return;
    bestDamage = evalResult.dmg;
    bestBonus = { ...currentBonus };
    bestAllocations = snapshotAllocations();
    bestSpecialLines = [...specialSequence];
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
      ? countRandomCombinations(
          candidateStats.map(() => MAX_LINES_PER_STAT),
          randomLineCount,
        )
      : 1;
  progressTotal = activeSpecialPlans.length * randomComboCount;
  reportProgress(true);

  try {
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
      const restartsPerPlan = 8;
      let rngSeed = Math.floor(Math.random() * 0x7fffffff);
      const rand = () => {
        rngSeed = (rngSeed * 1664525 + 1013904223) >>> 0;
        return rngSeed / 0x100000000;
      };

      for (const plan of activeSpecialPlans) {
        for (const idx of plan.indices) applyLines(idx, plan.counts[idx]);

        const specialCounts = plan.counts.slice();
        const caps = candidateStats.map(
          (_, index) => MAX_LINES_PER_STAT - specialCounts[index],
        );
        if (caps.some((c) => c < 0)) {
          for (const idx of plan.indices) applyLines(idx, -plan.counts[idx]);
          continue;
        }

        const available = caps.reduce((s, v) => s + v, 0);
        if (available < randomLineCount) {
          for (const idx of plan.indices) applyLines(idx, -plan.counts[idx]);
          continue;
        }

        for (let r = 0; r < restartsPerPlan; r += 1) {
          const tuning = createRandomValidCounts(rand, caps, randomLineCount);
          for (let i = 0; i < tuning.length; i += 1)
            if (tuning[i]) applyLines(i, tuning[i]);

          let improved = true;
          let steps = 0;
          const stepLimit = Math.max(8, candidateCount * 6);

          while (improved && steps < stepLimit) {
            throwIfCancelled();
            improved = false;

            for (let from = 0; from < candidateCount; from += 1) {
              const tuningFrom = allocations[from] - (specialCounts[from] || 0);
              if (tuningFrom <= 0) continue;

              for (let to = 0; to < candidateCount; to += 1) {
                if (from === to) continue;
                const tuningTo = allocations[to] - (specialCounts[to] || 0);
                if (tuningTo >= caps[to]) continue;

                applyLines(from, -1);
                applyLines(to, 1);
                const evalResult = evaluateCurrentDamage(currentBonus);

                if (evalResult.dmg > bestDamage) {
                  recordBest(plan.sequence, specialCounts);
                  improved = true;
                  break;
                }

                applyLines(from, 1);
                applyLines(to, -1);
              }
              if (improved) break;
            }
            steps += 1;
          }

          for (let i = 0; i < tuning.length; i += 1)
            if (tuning[i]) applyLines(i, -tuning[i]);
        }

        for (const idx of plan.indices) applyLines(idx, -plan.counts[idx]);
      }
    }
  } catch (e: unknown) {
    if (!(e instanceof IdealGearCancelledError)) throw e;
    // On cancel, keep the best result found so far as a partial result
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

  try {
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
  } catch (e: unknown) {
    if (!(e instanceof IdealGearCancelledError)) throw e;
    // On cancel, keep the best result found so far as a partial result
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
    stats: bestBonus || {},
    specialLines: bestSpecialLines,
    mode: "fast",
    elapsedMs: Date.now() - startTime,
    iterations,
  };
}

export async function calculateIdealGearStatsBeamSearch(
  path: ElementKey,
  rotation?: Rotation,
  baseStats?: InputStats,
  baseElementStats?: ElementStats,
  options?: {
    beamWidth?: number;
    onProgress?: (current: number, total: number) => void;
    signal?: AbortSignal;
    shardIndex?: number;
    shardCount?: number;
  },
): Promise<IdealGearResult> {
  const beamWidth = options?.beamWidth ?? 2000;
  const shardIndex = options?.shardIndex ?? 0;
  const shardCount = options?.shardCount ?? 1;
  const startTime = Date.now();
  const ruleSet = buildRuleSet(path);
  const { candidateStats, randomLineCount, baseGearBonus } = ruleSet;
  const perLineValues = candidateStats.map((stat) => getValPerLine(stat));
  const candidateCount = candidateStats.length;

  // TÍNH TOÁN TRƯỚC KEY TĨNH Ở ĐÂY (CHỈ CÓ 1 CHUỖI ĐƯỢC TẠO RA)
  const staticHashKey = buildStaticHashKey(
    path,
    rotation,
    baseStats,
    baseElementStats,
  );
  const fixedCtx: FixedOptimizerContext = {
    path,
    rotation,
    baseStats,
    baseElementStats,
    staticHashKey,
  };

  const damageCache = new Map<string, DamageEvalResult>();

  const specialLinePoolsIndices = ruleSet.specialLinePools.map((pool) =>
    pool.map((stat) => candidateStats.indexOf(stat)).filter((i) => i >= 0),
  );

  type SpecialPlan = {
    lines: string[];
    counts: number[];
  };

  const allSpecialPlans: SpecialPlan[] = [];
  const currentSpecialLines: string[] = [];
  const currentSpecialCounts = new Array(candidateCount).fill(0);
  const seenPlans = new Set<string>();

  const generateSpecialPlans = (slot: number) => {
    if (slot === 8) {
      const key = currentSpecialCounts.join(",");
      if (seenPlans.has(key)) return;
      seenPlans.add(key);

      allSpecialPlans.push({
        lines: [...currentSpecialLines],
        counts: [...currentSpecialCounts],
      });
      return;
    }

    const pool = specialLinePoolsIndices[slot];
    for (const statIndex of pool) {
      const stat = candidateStats[statIndex];
      if (SINGLE_LINE_STATS.has(stat) && currentSpecialCounts[statIndex] >= 1)
        continue;

      currentSpecialLines.push(stat);
      currentSpecialCounts[statIndex]++;
      generateSpecialPlans(slot + 1);
      currentSpecialCounts[statIndex]--;
      currentSpecialLines.pop();
    }
  };
  generateSpecialPlans(0);

  // SHARDING: Chia nhỏ các special plans cho từng worker
  const specialPlans =
    shardCount > 1
      ? allSpecialPlans.filter((_, idx) => idx % shardCount === shardIndex)
      : allSpecialPlans;

  let bestDamage = -Infinity;
  let bestBonus: Record<string, number> | null = null;
  let bestAllocations: Record<string, number> | null = null;
  let bestSpecialLines: string[] = [];

  const signal = options?.signal;
  const throwIfCancelled = () => {
    if (signal?.aborted) throw new IdealGearCancelledError();
  };

  try {
    // XOÁ TRỐNG CACHE TRƯỚC KHI CHẠY ĐỂ GIẢI PHÓNG RAM
    damageCache.clear();

    type BeamState = {
      tuning: number[];
      planIndex: number;
      bonus: Record<string, number>;
      score: number;
    };

    // 1. KHỞI TẠO BEAM VỚI TẤT CẢ CÁC SPECIAL PLANS TRONG SHARD NÀY
    let beam: BeamState[] = specialPlans.map((plan, planIndex) => {
      const planBaseBonus: Record<string, number> = { ...baseGearBonus };
      for (let i = 0; i < candidateCount; i++) {
        if (plan.counts[i] > 0) {
          planBaseBonus[candidateStats[i]] =
            (planBaseBonus[candidateStats[i]] || 0) +
            plan.counts[i] * perLineValues[i];
        }
      }

      return {
        tuning: new Array(candidateCount).fill(0),
        planIndex,
        bonus: planBaseBonus,
        score: evaluateDamageCachedOptimized(
          damageCache,
          fixedCtx,
          planBaseBonus,
        ).dmg,
      };
    });

    // Sắp xếp và lấy các plan tốt nhất để bắt đầu (nếu số plan > beamWidth)
    beam.sort((a, b) => b.score - a.score);
    if (beam.length > beamWidth) {
      beam = beam.slice(0, beamWidth);
    }

    // Cập nhật kết quả tốt nhất ban đầu
    if (beam.length > 0 && beam[0].score > bestDamage) {
      const bestState = beam[0];
      const plan = specialPlans[bestState.planIndex];
      bestDamage = bestState.score;
      bestBonus = bestState.bonus;
      bestSpecialLines = plan.lines;
      bestAllocations = buildTotalCountsSnapshot(
        candidateStats,
        bestState.tuning.map((count, idx) => count + plan.counts[idx]),
        ruleSet.fixedLineStats,
      );
    }

    // 2. CHẠY BEAM SEARCH 32 BƯỚC (RANDOM LINES)
    const EPSILON = 1e-6;
    for (let i = 0; i < randomLineCount; i++) {
      throwIfCancelled();
      if (options?.onProgress) {
        options.onProgress(i, randomLineCount);
      }

      // Yield to event loop
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      const nextBeamMap = new Map<string, BeamState>();
      let evalCount = 0;

      for (const state of beam) {
        const plan = specialPlans[state.planIndex];

        for (let statIndex = 0; statIndex < candidateCount; statIndex++) {
          if (++evalCount % 10000 === 0) {
            if (signal?.aborted) throw new IdealGearCancelledError();
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
          }

          const fixedCount =
            ruleSet.fixedLineStats[candidateStats[statIndex]]?.lines ?? 0;
          const stat = candidateStats[statIndex];

          // Limit 8 check
          if (
            !SINGLE_LINE_STATS.has(stat) &&
            state.tuning[statIndex] + fixedCount >= MAX_LINES_PER_STAT
          ) {
            continue;
          }

          // Exclusive check
          const totalExclusiveCount =
            state.tuning[statIndex] + plan.counts[statIndex] + fixedCount;
          if (SINGLE_LINE_STATS.has(stat) && totalExclusiveCount >= 1) continue;

          const nextTuning = [...state.tuning];
          nextTuning[statIndex]++;

          // Deduplicate bằng tuning key + planIndex
          const tuningKey = `${state.planIndex}|${nextTuning.join(",")}`;
          if (nextBeamMap.has(tuningKey)) continue;

          const nextBonus = { ...state.bonus };
          nextBonus[stat] = (nextBonus[stat] || 0) + perLineValues[statIndex];

          const cacheKey = `${fixedCtx.staticHashKey}|${tuningKey}`;

          const dmg = evaluateDamageCachedWithKey(
            damageCache,
            fixedCtx,
            nextBonus,
            cacheKey,
          ).dmg;

          nextBeamMap.set(tuningKey, {
            tuning: nextTuning,
            planIndex: state.planIndex,
            bonus: nextBonus,
            score: dmg,
          });
        }
      }

      const nextBeam = Array.from(nextBeamMap.values());
      nextBeam.sort((a, b) => b.score - a.score);
      beam = nextBeam.slice(0, beamWidth);

      // CẬP NHẬT KẾT QUẢ TỐT NHẤT: Ưu tiên damage cao nhất, nếu bằng nhau thì ưu tiên bước muộn hơn (nhiều dòng hơn)
      if (beam.length > 0) {
        const stepBest = beam[0];
        if (stepBest.score >= bestDamage - EPSILON) {
          const plan = specialPlans[stepBest.planIndex];
          bestDamage = stepBest.score;
          bestBonus = stepBest.bonus;
          bestSpecialLines = plan.lines;
          bestAllocations = buildTotalCountsSnapshot(
            candidateStats,
            stepBest.tuning.map((count, idx) => count + plan.counts[idx]),
            ruleSet.fixedLineStats,
          );

          if (shardIndex === 0) {
            const totalLines = Object.values(bestAllocations).reduce(
              (a, b) => a + b,
              0,
            );
            console.log(
              `Step ${i + 1}: Best Damage = ${bestDamage.toFixed(2)} (Lines: ${totalLines})`,
            );
          }
        }
      }

      // Cắt bớt cache nếu quá lớn để tránh OOM
      if (damageCache.size > 20000) {
        damageCache.clear();
      }
    }

    if (options?.onProgress) {
      options.onProgress(randomLineCount, randomLineCount);
    }
  } catch (e: unknown) {
    if (!(e instanceof IdealGearCancelledError)) throw e;
    // On cancel, keep the best result found so far as a partial result
    return {
      path,
      maxDamage: bestDamage === -Infinity ? 0 : bestDamage,
      allocations: bestAllocations ?? {},
      stats: bestBonus ?? {},
      specialLines: bestSpecialLines ?? [],
      mode: "exhaustive",
      elapsedMs: Date.now() - startTime,
    };
  }

  return {
    path,
    maxDamage: bestDamage === -Infinity ? 0 : bestDamage,
    allocations: bestAllocations ?? {},
    stats: bestBonus ?? {},
    specialLines: bestSpecialLines ?? [],
    mode: "exhaustive",
    elapsedMs: Date.now() - startTime,
  };
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

  const finalizeBellstrikeSlot6Order = () => {
    if (path !== "bellstrike") return;

    for (const gear of gears) {
      const fixedStat = getSlot6Stat(gear.id);
      if (!fixedStat) continue;
      const fixedIdx = gear.tuningLines.indexOf(fixedStat);
      if (fixedIdx !== -1) {
        gear.tuningLines.splice(fixedIdx, 1);
        gear.tuningLines.push(fixedStat);
      }
    }
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

  remainingStats.forEach(({ count }, statIndex) => {
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
    const remaining: Record<string, number> = {};
    for (const s of remainingStats) remaining[s.stat] = s.count;

    const cap = remainingCapacity.slice();

    const statsByCount = Object.keys(remaining).sort(
      (a, b) => remaining[b] - remaining[a],
    );
    for (const stat of statsByCount) {
      let toAssign = remaining[stat];
      while (toAssign > 0) {
        let bestGear = -1;
        let bestCap = -1;
        for (let i = 0; i < gears.length; i += 1) {
          if (cap[i] <= 0) continue;
          if (gears[i].tuningLines.includes(stat)) continue;
          if (cap[i] > bestCap) {
            bestCap = cap[i];
            bestGear = i;
          }
        }
        if (bestGear === -1) break;
        gears[bestGear].tuningLines.push(stat);
        cap[bestGear] -= 1;
        toAssign -= 1;
      }
      remaining[stat] = toAssign;
    }

    finalizeBellstrikeSlot6Order();
    return gears;
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

  finalizeBellstrikeSlot6Order();

  return gears;
}
