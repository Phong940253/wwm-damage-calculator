import {
  CustomGear,
  GearSlot,
  InputStats,
  ElementStats,
  Rotation,
} from "@/app/types";
import { GEAR_SLOTS } from "@/app/constants";
import { aggregateEquippedGearBonus } from "./gearAggregate";
import { buildDamageContext } from "../damage/damageContext";
import { calculateDamage } from "../damage/damageCalculator";
import { SKILLS } from "../skill/skills";
import {
  calculateSkillDamage,
  createRotationSkillRuntimeState,
  advanceRotationSkillRuntimeState,
  buildSkillUseCountsInRotation,
  buildRotationSkillDamageOptions,
} from "../skill/skillDamage";
import { computeRotationBonuses, sumBonuses, computeExhaustedBonuses } from "../skill/modifierEngine";
import type { LevelContext } from "../level/levelSettings";
import { computeIncludedInStatsGearBonus } from "../skill/includedInStatsImpact";
import { LIST_MARTIAL_ARTS, MartialArtWeaponType } from "../skill/types";
import { generateTuneVariants, computeRelayedSubValue, getTuneSystemStatPool, isTuneTargetAllowedBySubRules } from "./tuneAdvisor";
import { MAIN_STAT_BY_LEVEL } from "./gearConstants";

/* =======================
   Types
======================= */

export interface OptimizeResult {
  key: string;
  damage: number;
  percentGain: number;
  selection: Partial<Record<GearSlot, CustomGear>>;
}

export interface OptimizeComputation {
  baseDamage: number; // ✅ base = damage với gear đang equip
  totalCombos: number;
  results: OptimizeResult[];
}

export const MAX_RESULTS_CAP = 10_000;
export const MAX_COMBINATIONS = 1_000_000_000;

export class OptimizeCancelledError extends Error {
  constructor() {
    super("Optimization cancelled");
    this.name = "OptimizeCancelledError";
  }
}

type StatDelta = { stat: string | number; value: number };

type GearWithTune = CustomGear & { __tuneId?: string; __tuneLabel?: string; __tuneFrom?: string };

function compareOptimizeResults(a: OptimizeResult, b: OptimizeResult) {
  // Ascending: "worse" first. Used for min-heap.
  if (a.percentGain !== b.percentGain) return a.percentGain - b.percentGain;
  return a.damage - b.damage;
}

class TopKMinHeap<T> {
  private data: T[] = [];
  constructor(
    private readonly k: number,
    private readonly compare: (a: T, b: T) => number,
  ) {}

  get size() {
    return this.data.length;
  }

  peek(): T | undefined {
    return this.data[0];
  }

  toArray(): T[] {
    return [...this.data];
  }

  push(item: T) {
    if (this.k <= 0) return;

    if (this.data.length < this.k) {
      this.data.push(item);
      this.bubbleUp(this.data.length - 1);
      return;
    }

    // Replace root only if item is better than current worst.
    if (this.data.length && this.compare(item, this.data[0]) > 0) {
      this.data[0] = item;
      this.bubbleDown(0);
    }
  }

  private bubbleUp(index: number) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(this.data[index], this.data[parent]) >= 0) break;
      [this.data[index], this.data[parent]] = [
        this.data[parent],
        this.data[index],
      ];
      index = parent;
    }
  }

  private bubbleDown(index: number) {
    const n = this.data.length;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;

      if (left < n && this.compare(this.data[left], this.data[smallest]) < 0) {
        smallest = left;
      }
      if (
        right < n &&
        this.compare(this.data[right], this.data[smallest]) < 0
      ) {
        smallest = right;
      }

      if (smallest === index) break;
      [this.data[index], this.data[smallest]] = [
        this.data[smallest],
        this.data[index],
      ];
      index = smallest;
    }
  }
}

/* =======================
   ASYNC OPTIMIZER (non-blocking)
======================= */

export async function computeOptimizeResultsAsync(
  stats: InputStats,
  elementStats: ElementStats,
  customGears: CustomGear[],
  equipped: Partial<Record<GearSlot, string | undefined>>,
  desiredDisplay: number,
  rotation?: Rotation,
  levelContext?: LevelContext,
  options?: {
    candidateGears?: CustomGear[];
    slotsToOptimize?: GearSlot[];
    /**
     * Lock a slot to a specific gear id (or null for empty) for partitioned search.
     * When provided, that slot's candidates are replaced with exactly that choice.
     */
    lockedSlots?: Partial<Record<GearSlot, string | null>>;
    /**
     * Restrict a slot to a subset of candidate ids (or null for empty).
     * Useful for partitioning search across workers while still covering all combos.
     */
    restrictSlots?: Partial<Record<GearSlot, Array<string | null>>>;
    /**
     * Yield to the event loop during the search (keeps UI responsive on main thread).
     * In workers you can set this to false for higher throughput.
     */
    yieldToEventLoop?: boolean;
    /** If estimated combos exceed this, auto-reduce per-slot candidates via single-swap scoring. */
    autoReduceIfOverCombos?: number;
    /** Target max combos after reduction. */
    reduceTargetCombos?: number;
    /** Hard cap per slot after reduction (minimum 2). */
    reducePerSlotCap?: number;
    /** If true, expand gear candidates with tune variants for slots that have tunable gears. */
    considerTune?: boolean;
    /** Beam width for context-aware pre-reduction (default 200). */
    beamWidth?: number;
  },
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal,
): Promise<OptimizeComputation> {
  const throwIfCancelled = () => {
    if (signal?.aborted) throw new OptimizeCancelledError();
  };

  const skillById = new Map(SKILLS.map((s) => [s.id, s] as const));
  const rotationPlan =
    rotation && rotation.skills.length > 0
      ? rotation.skills
          .map((rs) => ({
            ...rs,
            skill: skillById.get(rs.id),
          }))
          .filter((x) => !!x.skill)
      : null;

  const deltasByGearId = new Map<string, StatDelta[]>();
  const getGearDeltas = (gear: CustomGear): StatDelta[] => {
    const tuneKey = (gear as GearWithTune).__tuneId ?? "";
    const cacheKey = gear.id + tuneKey;
    const cached = deltasByGearId.get(cacheKey);
    if (cached) return cached;
    const deltas: StatDelta[] = [...gear.mains, ...gear.subs, gear.addition]
      .filter(Boolean)
      .map((a) => ({ stat: a!.stat, value: a!.value }));
    deltasByGearId.set(cacheKey, deltas);
    return deltas;
  };

  const applyGear = (
    bonus: Record<string, number>,
    gear: CustomGear,
    dir: 1 | -1,
  ) => {
    for (const d of getGearDeltas(gear)) {
      const key = String(d.stat);
      bonus[key] = (bonus[key] || 0) + dir * d.value;
    }
  };

  const baseBonus = aggregateEquippedGearBonus(customGears, equipped);
  const currentMartialArt = LIST_MARTIAL_ARTS.find(
    (m) => m.id === elementStats.martialArtsId,
  );

  const requiredWeaponBySlot: Partial<
    Record<GearSlot, MartialArtWeaponType | undefined>
  > = {
    weapon_1: currentMartialArt?.weapon_1,
    weapon_2: currentMartialArt?.weapon_2,
  };

  const filterWeaponCandidatesForSlot = (
    slot: GearSlot,
    items: CustomGear[],
  ) => {
    if (slot !== "weapon_1" && slot !== "weapon_2") return items;

    const required = requiredWeaponBySlot[slot];
    if (!required) return items;

    const matched = items.filter((g) => g.weaponType === required);

    // Backward-compatibility: older saved gears may not have weaponType yet.
    // If no explicit match exists, keep original candidates instead of dropping all.
    return matched.length > 0 ? matched : items;
  };

  const computeTotalDamage = (gearBonus: Record<string, number>) => {
    // Some passives are already included in the in-game displayed stats.
    // We always add them as an absolute bonus derived from the current gearBonus.
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

    const ctx = buildDamageContext(
      stats,
      elementStats,
      sumBonuses(effectiveGearBonus, rotationBonuses),
      undefined,
      levelContext,
    );

    if (rotationPlan && rotationPlan.length > 0) {
      const skillUseCountsInRotation =
        buildSkillUseCountsInRotation(rotationPlan);

      let rotationTotal = 0;
      const runtimeState = createRotationSkillRuntimeState();

      const exhaustedBonuses = computeExhaustedBonuses(
        rotation,
        elementStats.martialArtsId,
      );

      for (const rotSkill of rotationPlan) {
        throwIfCancelled();
        const skill = rotSkill.skill;
        if (!skill) continue;

        const entryOpts = buildRotationSkillDamageOptions(
          rotSkill.id,
          rotSkill.params,
          rotation?.activeInnerWays,
          skillUseCountsInRotation,
          rotSkill.count,
          rotation?.activePassiveSkills,
          runtimeState.priorHitsBySkill,
          rotSkill.cancelled,
          rotSkill.exhausted,
          exhaustedBonuses,
        );
        entryOpts.rotationSkills = rotation?.skills;

        const skillDamage = calculateSkillDamage(ctx, skill, entryOpts);
        rotationTotal += skillDamage.total.normal.value * rotSkill.count;

        advanceRotationSkillRuntimeState(
          runtimeState,
          skill,
          entryOpts,
          rotSkill.count,
        );
      }
      return rotationTotal;
    }

    return calculateDamage(ctx).normal;
  };

  /* ============================================================
     1️⃣ BASE DAMAGE = WITH EQUIPPED GEAR
  ============================================================ */

  throwIfCancelled();

  const baseDamage = computeTotalDamage(baseBonus);

  /* ============================================================
      2️⃣ PREPARE SLOT OPTIONS
    ============================================================ */

  const candidateGears = options?.candidateGears ?? customGears;
  const optimizeSlots =
    options?.slotsToOptimize && options.slotsToOptimize.length > 0
      ? new Set<GearSlot>(options.slotsToOptimize)
      : null;

  const lockedSlots = options?.lockedSlots;
  const restrictSlots = options?.restrictSlots;

  const slotOptions = GEAR_SLOTS.filter(({ key }) =>
    optimizeSlots ? optimizeSlots.has(key) : true,
  ).map(({ key }) => {
    const equippedGear: CustomGear | undefined =
      equipped[key] ? customGears.find((g) => g.id === equipped[key]) : undefined;

    // If this slot is locked, override candidates to exactly the locked choice.
    if (lockedSlots && Object.prototype.hasOwnProperty.call(lockedSlots, key)) {
      const locked = lockedSlots[key];
      const lockedGear =
        typeof locked === "string"
          ? (customGears.find((g) => g.id === locked) ??
            candidateGears.find((g) => g.id === locked))
          : null;

      return {
        slot: key,
        items: [lockedGear ?? null],
        equippedGear,
      };
    }

    // If slot is restricted, override candidates to the provided subset.
    if (
      restrictSlots &&
      Object.prototype.hasOwnProperty.call(restrictSlots, key)
    ) {
      const allowed = restrictSlots[key] ?? [];
      const items: Array<CustomGear | null> = allowed.map((id) => {
        if (id === null) return null;
        return (
          customGears.find((g) => g.id === id) ??
          candidateGears.find((g) => g.id === id) ??
          null
        );
      });

      return {
        slot: key,
        items: items.length ? items : [null],
        equippedGear,
      };
    }

    // Respect UI filters via candidateGears, but always allow keeping currently-equipped
    // gear (otherwise filters could accidentally force "no gear" for a slot).
    const filteredItems = candidateGears.filter((g) => g.slot === key);
    const slotFilteredItems = filterWeaponCandidatesForSlot(key, filteredItems);
    const items = equippedGear
      ? slotFilteredItems.some((g) => g.id === equippedGear.id)
        ? slotFilteredItems
        : [equippedGear, ...slotFilteredItems]
      : slotFilteredItems;

    return {
      slot: key,
      items: items.length ? items : [null],
      equippedGear,
    };
  });

  // Expand gear candidates with tune + addition swap variants when considerTune is enabled.
  if (options?.considerTune) {
    // Find the sub line (index 1..n-1) that contributes least to total damage
    // (used to decide which line to tune on an untuned item).
    function findWeakestSubLineIndex(
      item: CustomGear,
      equippedGear: CustomGear | undefined,
    ): number {
      const scratch = { ...baseBonus };
      if (equippedGear) applyGear(scratch, equippedGear, -1);
      applyGear(scratch, item, 1);
      const fullDmg = computeTotalDamage(scratch);
      let weakest = 1;
      let minDelta = Infinity;
      for (let si = 1; si < item.subs.length; si++) {
        const sub = item.subs[si];
        if (!sub) continue;
        const key = String(sub.stat);
        scratch[key] = (scratch[key] || 0) - sub.value;
        const dmg = computeTotalDamage(scratch);
        scratch[key] = (scratch[key] || 0) + sub.value;
        const delta = fullDmg - dmg;
        if (delta < minDelta) {
          minDelta = delta;
          weakest = si;
        }
      }
      return weakest;
    }

    // Pre-compute the best addition stat per slot (marginal gain vs equipped addition)
    const bestSwapStatBySlot = new Map<GearSlot, { stat: string; value: number }>();
    for (const slotDef of slotOptions) {
      const eqGear = slotDef.equippedGear;
      const eqAddition = eqGear && typeof eqGear === "object" ? eqGear.addition : undefined;
      const seen = new Set<string>();
      let best: { stat: string; value: number; dmg: number } | null = null;
      // Use ALL candidate gears for this slot (not just slotDef.items which may be
      // restricted by sharding) so the best addition pre-computation is not fragmented.
      const slotItems = candidateGears.filter(g => g.slot === slotDef.slot) ?? slotDef.items;
      for (const item of slotItems) {
        if (!item?.addition) continue;
        const key = `${item.addition.stat}:${item.addition.value}`;
        if (seen.has(key)) continue;
        seen.add(key);
        // Start from baseBonus (includes equipped gear's addition).
        // Remove equipped gear's addition, then apply candidate addition
        // to measure the true marginal gain of swapping.
        const scratch = { ...baseBonus };
        if (eqAddition) {
          const s = String(eqAddition.stat);
          scratch[s] = (scratch[s] || 0) - eqAddition.value;
        }
        scratch[String(item.addition.stat)] = (scratch[String(item.addition.stat)] || 0) + item.addition.value;
        const dmg = computeTotalDamage(scratch);
        if (!best || dmg > best.dmg) {
          best = { stat: String(item.addition.stat), value: item.addition.value, dmg };
        }
      }
      if (best) {
        bestSwapStatBySlot.set(slotDef.slot, { stat: best.stat, value: best.value });
      }
    }

    for (const slotDef of slotOptions) {
      const expanded: Array<CustomGear | null> = [];
      for (const item of slotDef.items) {
        expanded.push(item);
        // Tune variants — only for the relevant sub line:
        //   - already tuned → re-tune that same line
        //   - untuned → tune the weakest-contributing sub line
        if (item && item.subs && item.subs.length >= 2) {
          const tuneSubIndex = item.tunedSubIndex && item.tunedSubIndex > 0
            ? item.tunedSubIndex
            : findWeakestSubLineIndex(item, slotDef.equippedGear);
          for (const v of generateTuneVariants(item, elementStats.selected, tuneSubIndex)) {
            const variantGear: GearWithTune = {
              ...item,
              subs: v.overrideSubs,
              __tuneId: `::tune::${v.subIndex}::${v.targetStat}`,
              __tuneLabel: v.label,
              __tuneFrom: `${String(item.subs[v.subIndex]?.stat ?? "")} +${item.subs[v.subIndex]?.value ?? 0}`,
            };
            expanded.push(variantGear);
            // Combined tune + swap variant
            const swapBest = bestSwapStatBySlot.get(slotDef.slot);
            if (swapBest && item.addition) {
              const currentStat = String(item.addition.stat);
              if (currentStat !== swapBest.stat || item.addition.value !== swapBest.value) {
                expanded.push({
                  ...item,
                  subs: v.overrideSubs,
                  addition: { stat: swapBest.stat, value: swapBest.value },
                  __tuneId: `::tune-swap::${v.subIndex}::${v.targetStat}::${swapBest.stat}`,
                  __tuneLabel: `${v.label} + Swap → ${swapBest.stat} +${swapBest.value}`,
                  __tuneFrom: `${String(item.subs[v.subIndex]?.stat ?? "")} +${item.subs[v.subIndex]?.value ?? 0}, ${String(item.addition.stat)} +${item.addition.value}`,
                } as GearWithTune);
              }
            }
          }
        }
        // Addition swap variant (only if best stat differs from current)
        if (item && item.addition) {
          const best = bestSwapStatBySlot.get(slotDef.slot);
          if (best) {
            const currentStat = String(item.addition.stat);
            if (currentStat !== best.stat || item.addition.value !== best.value) {
              const swapGear: GearWithTune = {
                ...item,
                addition: { stat: best.stat, value: best.value },
                __tuneId: `::swap::${best.stat}`,
                __tuneLabel: `Swap → ${best.stat} +${best.value}`,
                __tuneFrom: `${String(item.addition.stat)} +${item.addition.value}`,
              };
              expanded.push(swapGear);
            } else {
            }
          }
        }
        // Relayed variants — only for base items (not tune/swap variants)
        if (item && item.subs && item.subs.length >= 2 && !(item as GearWithTune).__tuneId) {
          const lv96Mains = MAIN_STAT_BY_LEVEL[96]?.[slotDef.slot];
          const relayedSubs = item.subs.map(s => ({
            ...s,
            value: computeRelayedSubValue(s.stat as Parameters<typeof computeRelayedSubValue>[0]),
          }));
          const relayedMains = lv96Mains
            ? item.mains.map(m => {
              const override = lv96Mains[m.stat];
              return override !== undefined ? { stat: m.stat, value: override } : m;
            })
            : item.mains;
          // Base relayed
          const relayedGear: GearWithTune = {
            ...item,
            level: 96,
            mains: relayedMains,
            subs: relayedSubs,
            tunedSubIndex: undefined,
            tuneHistory: undefined,
            __tuneId: "::relayed::",
            __tuneLabel: "Relayed (lv96)",
            __tuneFrom: "Relayed",
          };
          expanded.push(relayedGear);
          const tuneSubIndex = item.tunedSubIndex && item.tunedSubIndex > 0
            ? item.tunedSubIndex
            : findWeakestSubLineIndex(item, slotDef.equippedGear);
          // Relayed + tune (sub values stay at 94% lv96 max, not 100%)
          if (tuneSubIndex > 0) {
            const relayedPool = getTuneSystemStatPool(elementStats.selected);
            const relayedSubStatKeys = relayedSubs.map((s) => String(s.stat ?? ""));
            for (const targetStat of relayedPool) {
              const currentRelayedStat = relayedSubStatKeys[tuneSubIndex];
              if (currentRelayedStat && currentRelayedStat === targetStat) continue;
              if (!isTuneTargetAllowedBySubRules(relayedSubStatKeys, tuneSubIndex, targetStat)) continue;

              const relayedTargetValue = computeRelayedSubValue(targetStat);
              const relayedTuneSubs = relayedSubs.map((s, i) =>
                i === tuneSubIndex ? { stat: targetStat, value: relayedTargetValue } : { ...s },
              );

              const label = `→ ${targetStat} (+${relayedTargetValue})`;
              const relayedTuneGear: GearWithTune = {
                ...relayedGear,
                subs: relayedTuneSubs,
                __tuneId: `::relayed-tune::${tuneSubIndex}::${targetStat}`,
                __tuneLabel: `Relayed + ${label}`,
                __tuneFrom: `${String(relayedSubs[tuneSubIndex]?.stat ?? "")} +${relayedSubs[tuneSubIndex]?.value ?? 0}`,
              };
              expanded.push(relayedTuneGear);
              // Relayed + tune + swap
              const swapBest = bestSwapStatBySlot.get(slotDef.slot);
              if (swapBest && item.addition) {
                const currentStat = String(item.addition.stat);
                if (currentStat !== swapBest.stat || item.addition.value !== swapBest.value) {
                  expanded.push({
                    ...relayedTuneGear,
                    addition: { stat: swapBest.stat, value: swapBest.value },
                    __tuneId: `::relayed-tune-swap::${tuneSubIndex}::${targetStat}::${swapBest.stat}`,
                    __tuneLabel: `Relayed + ${label} + Swap → ${swapBest.stat} +${swapBest.value}`,
                    __tuneFrom: `${String(relayedSubs[tuneSubIndex]?.stat ?? "")} +${relayedSubs[tuneSubIndex]?.value ?? 0}, ${String(item.addition.stat)} +${item.addition.value}`,
                  } as GearWithTune);
                }
              }
            }
          }
          // Relayed + swap
          if (item.addition) {
            const best = bestSwapStatBySlot.get(slotDef.slot);
            if (best) {
              const currentStat = String(item.addition.stat);
              if (currentStat !== best.stat || item.addition.value !== best.value) {
                expanded.push({
                  ...relayedGear,
                  addition: { stat: best.stat, value: best.value },
                  __tuneId: `::relayed-swap::${best.stat}`,
                  __tuneLabel: `Relayed + Swap → ${best.stat} +${best.value}`,
                  __tuneFrom: `Relayed + ${String(item.addition.stat)} +${item.addition.value}`,
                } as GearWithTune);
              }
            }
          }
        }
      }
      slotDef.items = expanded;
    }
  }

  const estimated = slotOptions.reduce(
    (acc, { items }) => acc * items.length,
    1,
  );

  throwIfCancelled();

  // Default reduction triggers earlier so medium search spaces (e.g. 5^8 ~= 390k)
  // can still be trimmed when desired.
  const autoReduceIfOverCombos = options?.autoReduceIfOverCombos ?? 200_000;
  const reduceTargetCombos = options?.reduceTargetCombos ?? 200_000;
  const reducePerSlotCapRaw = options?.reducePerSlotCap ?? 0;
  const reducePerSlotCap =
    reducePerSlotCapRaw > 0 ? Math.max(2, reducePerSlotCapRaw) : 0;

  const beamSearchReduceSlotOptions = async (): Promise<typeof slotOptions> => {
    if (estimated <= autoReduceIfOverCombos) return slotOptions;

    const slotCount = slotOptions.length || 1;
    const capFromTarget = Math.max(
      2,
      Math.floor(Math.pow(reduceTargetCombos, 1 / slotCount)),
    );
    const autoCap = options?.considerTune && reducePerSlotCap === 0
      ? Math.max(12, capFromTarget)
      : capFromTarget;
    const perSlotCap = reducePerSlotCap > 0 ? reducePerSlotCap : autoCap;
    const beamWidth = Math.max(1, options?.beamWidth ?? 200);

    // Track which slots actually need reduction
    const needsReduce = slotOptions.map(({ items }) => items.length > perSlotCap);
    if (!needsReduce.some(Boolean)) return slotOptions;

    const result = [...slotOptions];
    // beam: accumulated bonus for each partial selection
    let beam: Record<string, number>[] = [{ ...baseBonus }];

    const getItemKey = (g: CustomGear | null): string => {
      if (!g) return "__null__";
      return g.id + ((g as GearWithTune).__tuneId ?? "");
    };
    const getItemGroupKey = (g: CustomGear | null): string => {
      if (!g) return "__null__";
      return g.id;
    };

    for (let i = 0; i < slotCount; i++) {
      throwIfCancelled();
      const { slot, items, equippedGear } = slotOptions[i];
      if (!needsReduce[i]) {
        // Still advance beam: expand with existing items
        const newBeam: Record<string, number>[] = [];
        for (const bonus of beam) {
          if (equippedGear) applyGear(bonus, equippedGear, -1);
          for (const gear of items) {
            if (gear) applyGear(bonus, gear, +1);
            newBeam.push({ ...bonus });
            if (gear) applyGear(bonus, gear, -1);
          }
          if (equippedGear) applyGear(bonus, equippedGear, +1);
        }
        beam = newBeam;
        continue;
      }

      // Phase A: Score each item across all beam contexts.
      // Track both per-item (for extended beam) and per-group (for ranking).
      const groupBest = new Map<string, number>();
      const extended: Array<{
        bonus: Record<string, number>;
        dmg: number;
        itemKey: string;
        groupKey: string;
      }> = [];

      for (const bonus of beam) {
        if (equippedGear) applyGear(bonus, equippedGear, -1);
        for (const gear of items) {
          throwIfCancelled();
          if (gear) applyGear(bonus, gear, +1);
          const dmg = computeTotalDamage(bonus);

          const key = getItemKey(gear);
          const gKey = getItemGroupKey(gear);
          groupBest.set(gKey, Math.max(dmg, groupBest.get(gKey) ?? -Infinity));
          extended.push({ bonus: { ...bonus }, dmg, itemKey: key, groupKey: gKey });

          if (gear) applyGear(bonus, gear, -1);
        }
        if (equippedGear) applyGear(bonus, equippedGear, +1);
      }

      // Phase B: Rank groups (by their best variant's damage) and keep top N groups.
      // This ensures items with great tune/swap potential get group-level credit.
      const ranked = Array.from(groupBest.entries())
        .sort((a, b) => b[1] - a[1]);
      const keptGroupKeys = new Set<string>();
      if (equippedGear) keptGroupKeys.add(getItemGroupKey(equippedGear));
      for (const [groupKey] of ranked) {
        if (keptGroupKeys.size >= perSlotCap) break;
        keptGroupKeys.add(groupKey);
      }

      // From kept groups, pick the top perSlotCap individual items by their
      // own best-context damage.  This bounds the output size while still
      // benefiting from group-level ranking (keeping groups with high potential).
      const individualBest = new Map<string, number>();
      for (const e of extended) {
        if (keptGroupKeys.has(e.groupKey)) {
          individualBest.set(e.itemKey, Math.max(e.dmg, individualBest.get(e.itemKey) ?? -Infinity));
        }
      }
      const keptIndividual = Array.from(individualBest.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, perSlotCap)
        .map(([key]) => key);
      const keptIndividualSet = new Set(keptIndividual);
      if (equippedGear) keptIndividualSet.add(getItemKey(equippedGear));

      // Apply reduction — keep only the selected individual items
      result[i] = {
        slot,
        items: items.filter((g) => keptIndividualSet.has(getItemKey(g))),
        equippedGear,
      };

      // Phase C: Build new beam from extended entries with kept individual items
      const scoredBeam = extended
        .filter((e) => keptIndividualSet.has(e.itemKey))
        .sort((a, b) => b.dmg - a.dmg);
      beam = scoredBeam.slice(0, beamWidth).map((e) => e.bonus);
    }

    return result;
  };

  const finalSlotOptions = await beamSearchReduceSlotOptions();

  const finalEstimated = finalSlotOptions.reduce(
    (acc, { items }) => acc * items.length,
    1,
  );

  throwIfCancelled();

  if (finalEstimated > MAX_COMBINATIONS) {
    throw new Error(
      `Too many combinations (${finalEstimated.toLocaleString()})`,
    );
  }

  const limit = Math.min(Math.max(desiredDisplay, 1), MAX_RESULTS_CAP);
  const totalCombos = finalEstimated;

  // Provide an initial total so the UI can render a correct denominator
  // even before the first time-based progress tick.
  if (onProgress) {
    onProgress(0, totalCombos);
  }

  /* ============================================================
     3️⃣ ASYNC DFS STATE
  ============================================================ */

  const heap = new TopKMinHeap<OptimizeResult>(limit, compareOptimizeResults);
  let total = 0;

  const selection: Partial<Record<GearSlot, CustomGear>> = {};
  const bonus: Record<string, number> = { ...baseBonus };

  // Time-based progress tracking
  let lastProgressTime = Date.now();
  const PROGRESS_INTERVAL_MS = 100; // Update every 100ms
  const yieldToEventLoop = options?.yieldToEventLoop ?? true;

  /* Async DFS with time-based progress updates */
  const dfs = async (i: number) => {
    throwIfCancelled();
    if (i === finalSlotOptions.length) {
      total++;

      // Report progress based on elapsed time (every 100ms)
      const now = Date.now();
      if (onProgress && now - lastProgressTime >= PROGRESS_INTERVAL_MS) {
        onProgress(total, totalCombos);
        lastProgressTime = now;
        // Yield to event loop when desired (main thread); disable in workers for max throughput.
        if (yieldToEventLoop) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          throwIfCancelled();
        }
      }

      throwIfCancelled();
      const dmg = computeTotalDamage(bonus);
      const percentGain =
        baseDamage === 0 ? 0 : ((dmg - baseDamage) / baseDamage) * 100;

      const candidate: OptimizeResult = {
        key: "",
        damage: dmg,
        percentGain,
        selection: {},
      };

      // IMPORTANT: always fill the heap up to `limit` first.
      // Only once full, apply the "better than current worst" check.
      const buildKey = () =>
        finalSlotOptions
          .map(({ slot }) => {
            const g = selection[slot];
            if (!g) return "none";
            const tuneId = (g as GearWithTune).__tuneId ?? "";
            return g.id + tuneId;
          })
          .join("|");

      if (heap.size < limit) {
        candidate.key = buildKey();
        candidate.selection = { ...selection };
        heap.push(candidate);
      } else {
        const worst = heap.peek();
        if (worst && compareOptimizeResults(candidate, worst) > 0) {
          candidate.key = buildKey();
          candidate.selection = { ...selection };
          heap.push(candidate);
        }
      }

      return;
    }

    const { slot, items, equippedGear } = finalSlotOptions[i];

    // Remove currently-equipped gear once for this slot level.
    if (equippedGear) applyGear(bonus, equippedGear, -1);

    for (const gear of items) {
      throwIfCancelled();

      if (gear) {
        selection[slot] = gear;
        applyGear(bonus, gear, +1);
      } else {
        delete selection[slot];
      }

      await dfs(i + 1);

      // Rollback
      if (gear) {
        applyGear(bonus, gear, -1);
        delete selection[slot];
      }
    }

    // Restore equipped gear once after exploring all candidates.
    if (equippedGear) applyGear(bonus, equippedGear, +1);
  };

  await dfs(0);

  /* Report final progress */
  if (onProgress) {
    onProgress(totalCombos, totalCombos);
  }

  /* ============================================================
     4️⃣ SORT + LIMIT
  ============================================================ */

  const results = heap
    .toArray()
    .sort((a, b) =>
      b.percentGain === a.percentGain
        ? b.damage - a.damage
        : b.percentGain - a.percentGain,
    );

  // Safety dedup — prevents duplicate keys reaching React
  const seenKeys = new Set<string>();
  const deduped: OptimizeResult[] = [];
  for (const r of results) {
    if (seenKeys.has(r.key)) continue;
    seenKeys.add(r.key);
    deduped.push(r);
  }

  return {
    baseDamage,
    totalCombos: total,
    results: deduped,
  };
}
