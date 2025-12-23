import { CustomGear, GearSlot, InputStats, ElementStats } from "@/app/types";
import { GEAR_SLOTS } from "@/app/constants";

import { aggregateGearStats } from "@/app/utils/gear";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { calculateDamage } from "@/app/domain/damage/damageCalculator";

/* =======================
   Limits
======================= */

export const MAX_COMBINATIONS = 1_000_000_000;
export const MAX_RESULTS_CAP = 10_000;

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
  baseDamage: number;
  totalCombos: number;
  results: OptimizeResult[];
}

/* =======================
   Core Optimize
======================= */

export function computeOptimizeResults(
  stats: InputStats,
  elementStats: ElementStats,
  customGears: CustomGear[],
  equipped: Partial<Record<GearSlot, string | undefined>>,
  desiredDisplay: number
): OptimizeComputation {
  /* ---------- Base damage (currently equipped) ---------- */
  const baseGearBonus = aggregateGearStats(customGears, equipped);

  const baseCtx = buildDamageContext(stats, elementStats, baseGearBonus);
  const baseDamage = calculateDamage(baseCtx).normal;

  if (customGears.length === 0) {
    return {
      baseDamage,
      totalCombos: 0,
      results: [],
    };
  }

  /* ---------- Slot → available gears ---------- */
  const slotOptions = GEAR_SLOTS.map(({ key }) => {
    const items = customGears.filter((g) => g.slot === key);
    return {
      slot: key,
      items: items.length > 0 ? items : [null],
    };
  });

  /* ---------- Estimate combinations ---------- */
  const estimatedCombos = slotOptions.reduce(
    (acc, s) => acc * s.items.length,
    1
  );

  if (estimatedCombos > MAX_COMBINATIONS) {
    throw new Error(
      `Too many combinations (${estimatedCombos.toLocaleString()}).`
    );
  }

  const limit = Math.min(Math.max(desiredDisplay, 1), MAX_RESULTS_CAP);

  /* ---------- DFS state ---------- */
  const bonus: Record<string, number> = {};
  const selection: Partial<Record<GearSlot, CustomGear>> = {};
  const results: OptimizeResult[] = [];
  let total = 0;

  /* ---------- Helpers ---------- */
  const applyGear = (gear: CustomGear, dir: 1 | -1) => {
    const attrs = [...gear.mains, ...gear.subs];
    if (gear.addition) attrs.push(gear.addition);

    for (const a of attrs) {
      bonus[a.stat] = (bonus[a.stat] || 0) + dir * a.value;
    }
  };

  /* ---------- DFS ---------- */
  const dfs = (i: number) => {
    if (i === slotOptions.length) {
      total++;

      const ctx = buildDamageContext(stats, elementStats, bonus);
      const dmg = calculateDamage(ctx).normal;

      results.push({
        key: GEAR_SLOTS.map(({ key }) => selection[key]?.id ?? "none").join(
          "|"
        ),
        damage: dmg,
        percentGain:
          baseDamage === 0 ? 0 : ((dmg - baseDamage) / baseDamage) * 100,
        selection: { ...selection },
      });

      return;
    }

    const { slot, items } = slotOptions[i];

    for (const gear of items) {
      if (gear) {
        selection[slot] = gear;
        applyGear(gear, 1);
        dfs(i + 1);
        applyGear(gear, -1);
        delete selection[slot];
      } else {
        delete selection[slot];
        dfs(i + 1);
      }
    }
  };

  dfs(0);

  /* ---------- Sort & trim ---------- */
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
