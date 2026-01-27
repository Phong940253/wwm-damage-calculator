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
import { calculateSkillDamage } from "../skill/skillDamage";
import { computeRotationBonuses, sumBonuses } from "../skill/modifierEngine";

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
    const cached = deltasByGearId.get(gear.id);
    if (cached) return cached;
    const deltas: StatDelta[] = [...gear.mains, ...gear.subs, gear.addition]
      .filter(Boolean)
      .map((a) => ({ stat: a!.stat, value: a!.value }));
    deltasByGearId.set(gear.id, deltas);
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

  const computeTotalDamage = (gearBonus: Record<string, number>) => {
    const rotationBonuses = computeRotationBonuses(
      stats,
      elementStats,
      gearBonus,
      rotation,
    );
    const ctx = buildDamageContext(
      stats,
      elementStats,
      sumBonuses(gearBonus, rotationBonuses),
    );

    if (rotationPlan && rotationPlan.length > 0) {
      let rotationTotal = 0;
      for (const rotSkill of rotationPlan) {
        throwIfCancelled();
        const skill = rotSkill.skill;
        if (!skill) continue;
        const skillDamage = calculateSkillDamage(ctx, skill, {
          params: rotSkill.params,
        });
        rotationTotal += skillDamage.total.normal.value * rotSkill.count;
      }
      return rotationTotal;
    }

    return calculateDamage(ctx).normal;
  };

  /* ============================================================
     1️⃣ BASE DAMAGE = WITH EQUIPPED GEAR
  ============================================================ */

  throwIfCancelled();

  const baseBonus = aggregateEquippedGearBonus(customGears, equipped);
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
    const equippedGear =
      equipped[key] && customGears.find((g) => g.id === equipped[key]);

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
    const items = equippedGear
      ? filteredItems.some((g) => g.id === equippedGear.id)
        ? filteredItems
        : [equippedGear, ...filteredItems]
      : filteredItems;

    return {
      slot: key,
      items: items.length ? items : [null],
      equippedGear,
    };
  });

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

  const reduceSlotOptionsIfNeeded = async () => {
    // Reduce only when the estimated search space is huge.
    if (estimated <= autoReduceIfOverCombos) return slotOptions;

    const slotCount = slotOptions.length || 1;
    const capFromTarget = Math.max(
      2,
      Math.floor(Math.pow(reduceTargetCombos, 1 / slotCount)),
    );
    const perSlotCap = reducePerSlotCap > 0 ? reducePerSlotCap : capFromTarget;

    const reduced = await Promise.all(
      slotOptions.map(async ({ slot, items, equippedGear }) => {
        throwIfCancelled();
        if (items.length <= perSlotCap) return { slot, items, equippedGear };

        // Single-swap scoring vs base equipped state.
        const scratchBonus: Record<string, number> = { ...baseBonus };
        if (equippedGear) applyGear(scratchBonus, equippedGear, -1);

        const scored: Array<{ gear: CustomGear | null; dmg: number }> = [];

        // Score the "no gear" option (only if present).
        if (items.some((x) => x === null)) {
          const dmg = computeTotalDamage(scratchBonus);
          scored.push({ gear: null, dmg });
        }

        for (const gear of items) {
          throwIfCancelled();
          if (!gear) continue;
          applyGear(scratchBonus, gear, +1);
          const dmg = computeTotalDamage(scratchBonus);
          scored.push({ gear, dmg });
          applyGear(scratchBonus, gear, -1);
        }

        scored.sort((a, b) => b.dmg - a.dmg);

        const kept: Array<CustomGear | null> = [];
        const seen = new Set<string>();
        const keep = (g: CustomGear | null) => {
          const id = g ? g.id : "__null__";
          if (seen.has(id)) return;
          seen.add(id);
          kept.push(g);
        };

        // Always keep equipped (if any) to ensure "no change" remains possible.
        if (equippedGear) keep(equippedGear);

        // Keep best-scoring up to cap.
        for (const s of scored) {
          if (kept.length >= perSlotCap) break;
          keep(s.gear);
        }

        // Ensure null is kept if it existed originally.
        if (items.some((x) => x === null)) keep(null);

        return { slot, items: kept.length ? kept : [null], equippedGear };
      }),
    );

    return reduced;
  };

  const finalSlotOptions = await reduceSlotOptionsIfNeeded();

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

      const worst = heap.peek();
      if (!worst || compareOptimizeResults(candidate, worst) > 0) {
        candidate.key = finalSlotOptions
          .map(({ slot }) => selection[slot]?.id ?? "none")
          .join("|");
        candidate.selection = { ...selection };
        heap.push(candidate);
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

  return {
    baseDamage,
    totalCombos: total,
    results,
  };
}
