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
  },
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal
): Promise<OptimizeComputation> {
  const throwIfCancelled = () => {
    if (signal?.aborted) throw new OptimizeCancelledError();
  };

  /* ============================================================
     1️⃣ BASE DAMAGE = WITH EQUIPPED GEAR
  ============================================================ */

  throwIfCancelled();

  const baseBonus = aggregateEquippedGearBonus(customGears, equipped);
  const baseRotationBonuses = computeRotationBonuses(
    stats,
    elementStats,
    baseBonus,
    rotation
  );
  const baseCtx = buildDamageContext(
    stats,
    elementStats,
    sumBonuses(baseBonus, baseRotationBonuses)
  );

  /* Calculate base damage - rotation-aware */
  let baseDamage: number;
  if (rotation && rotation.skills.length > 0) {
    let rotationTotal = 0;
    for (const rotSkill of rotation.skills) {
      throwIfCancelled();
      const skill = SKILLS.find((s) => s.id === rotSkill.id);
      if (!skill) continue;
      const skillDamage = calculateSkillDamage(baseCtx, skill);
      rotationTotal += skillDamage.total.normal.value * rotSkill.count;
    }
    baseDamage = rotationTotal;
  } else {
    baseDamage = calculateDamage(baseCtx).normal;
  }

  /* ============================================================
     2️⃣ PREPARE SLOT OPTIONS
  ============================================================ */

  const candidateGears = options?.candidateGears ?? customGears;
  const optimizeSlots =
    options?.slotsToOptimize && options.slotsToOptimize.length > 0
      ? new Set<GearSlot>(options.slotsToOptimize)
      : null;

  const slotOptions = GEAR_SLOTS.filter(({ key }) =>
    optimizeSlots ? optimizeSlots.has(key) : true
  ).map(({ key }) => {
    const equippedGear =
      equipped[key] && customGears.find((g) => g.id === equipped[key]);

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
    1
  );

  throwIfCancelled();

  if (estimated > MAX_COMBINATIONS) {
    throw new Error(`Too many combinations (${estimated.toLocaleString()})`);
  }

  const limit = Math.min(Math.max(desiredDisplay, 1), MAX_RESULTS_CAP);
  const totalCombos = estimated;

  /* ============================================================
     3️⃣ ASYNC DFS STATE
  ============================================================ */

  const results: OptimizeResult[] = [];
  let total = 0;

  const selection: Partial<Record<GearSlot, CustomGear>> = {};
  const bonus: Record<string, number> = { ...baseBonus };

  // Time-based progress tracking
  let lastProgressTime = Date.now();
  const PROGRESS_INTERVAL_MS = 100; // Update every 100ms

  const applyGear = (gear: CustomGear, dir: 1 | -1) => {
    [...gear.mains, ...gear.subs, gear.addition]
      .filter(Boolean)
      .forEach((a) => {
        bonus[a!.stat] = (bonus[a!.stat] || 0) + dir * a!.value;
      });
  };

  /* Async DFS with time-based progress updates */
  const dfs = async (i: number) => {
    throwIfCancelled();
    if (i === slotOptions.length) {
      total++;

      // Report progress based on elapsed time (every 100ms)
      const now = Date.now();
      if (onProgress && now - lastProgressTime >= PROGRESS_INTERVAL_MS) {
        onProgress(total, totalCombos);
        lastProgressTime = now;
        // Yield to browser to update UI
        await new Promise((resolve) => setTimeout(resolve, 0));
        throwIfCancelled();
      }

      throwIfCancelled();
      const rotationBonuses = computeRotationBonuses(
        stats,
        elementStats,
        bonus,
        rotation
      );
      const ctxWithModifiers = buildDamageContext(
        stats,
        elementStats,
        sumBonuses(bonus, rotationBonuses)
      );

      let dmg: number;
      if (rotation && rotation.skills.length > 0) {
        let rotationTotal = 0;
        for (const rotSkill of rotation.skills) {
          throwIfCancelled();
          const skill = SKILLS.find((s) => s.id === rotSkill.id);
          if (!skill) continue;
          const skillDamage = calculateSkillDamage(ctxWithModifiers, skill);
          rotationTotal += skillDamage.total.normal.value * rotSkill.count;
        }
        dmg = rotationTotal;
      } else {
        dmg = calculateDamage(ctxWithModifiers).normal;
      }

      results.push({
        key: slotOptions
          .map(({ slot }) => selection[slot]?.id ?? "none")
          .join("|"),
        damage: dmg,
        percentGain:
          baseDamage === 0 ? 0 : ((dmg - baseDamage) / baseDamage) * 100,
        selection: { ...selection },
      });

      return;
    }

    const { slot, items, equippedGear } = slotOptions[i];

    for (const gear of items) {
      throwIfCancelled();
      // Remove old gear
      if (equippedGear) {
        applyGear(equippedGear, -1);
      }

      if (gear) {
        selection[slot] = gear;
        applyGear(gear, +1);
      } else {
        delete selection[slot];
      }

      await dfs(i + 1);

      // Rollback
      if (gear) {
        applyGear(gear, -1);
        delete selection[slot];
      }

      if (equippedGear) {
        applyGear(equippedGear, +1);
      }
    }
  };

  await dfs(0);

  /* Report final progress */
  if (onProgress) {
    onProgress(totalCombos, totalCombos);
  }

  /* ============================================================
     4️⃣ SORT + LIMIT
  ============================================================ */

  results.sort((a, b) =>
    b.percentGain === a.percentGain
      ? b.damage - a.damage
      : b.percentGain - a.percentGain
  );

  return {
    baseDamage,
    totalCombos: total,
    results: results.slice(0, limit),
  };
}
