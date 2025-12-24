import { CustomGear, GearSlot, InputStats, ElementStats } from "@/app/types";
import { GEAR_SLOTS } from "@/app/constants";
import { aggregateEquippedGearBonus } from "./gearAggregate";
import { buildDamageContext } from "../damage/damageContext";
import { calculateDamage } from "../damage/damageCalculator";

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

export const MAX_RESULTS_CAP = 10_000;
export const MAX_COMBINATIONS = 1_000_000_000;

export function computeOptimizeResults(
  stats: InputStats,
  elementStats: ElementStats,
  customGears: CustomGear[],
  equipped: Partial<Record<GearSlot, string | undefined>>,
  desiredDisplay: number
): OptimizeComputation {
  /* ---------- base damage ---------- */

  const emptyEquipped: Partial<Record<GearSlot, string>> = {};

  const baseBonus = aggregateEquippedGearBonus(customGears, emptyEquipped);
  const baseCtx = buildDamageContext(stats, elementStats, baseBonus);
  const baseDamage = calculateDamage(baseCtx).normal;

  const baseBonusWithGears = aggregateEquippedGearBonus(customGears, equipped);
  const baseCtxWithGears = buildDamageContext(
    stats,
    elementStats,
    baseBonusWithGears
  );
  const baseDamageWithGears = calculateDamage(baseCtxWithGears).normal;

  if (customGears.length === 0) {
    return { baseDamage: baseDamageWithGears, totalCombos: 0, results: [] };
  }

  /* ---------- slot options ---------- */
  const slotOptions = GEAR_SLOTS.map(({ key }) => {
    const items = customGears.filter((g) => g.slot === key);
    return { slot: key, items: items.length ? items : [null] };
  });

  const estimated = slotOptions.reduce(
    (acc, { items }) => acc * items.length,
    1
  );

  if (estimated > MAX_COMBINATIONS) {
    throw new Error(`Too many combinations (${estimated.toLocaleString()})`);
  }

  const limit = Math.min(Math.max(desiredDisplay, 1), MAX_RESULTS_CAP);

  /* ---------- DFS ---------- */
  const results: OptimizeResult[] = [];
  let total = 0;

  const selection: Partial<Record<GearSlot, CustomGear>> = {};
  const bonus: Record<string, number> = { ...baseBonus };

  const applyGear = (gear: CustomGear, dir: 1 | -1) => {
    [...gear.mains, ...gear.subs, gear.addition]
      .filter(Boolean)
      .forEach((a) => {
        bonus[a!.stat] = (bonus[a!.stat] || 0) + dir * a!.value;
      });
  };

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
          baseDamageWithGears === 0
            ? 0
            : ((dmg - baseDamageWithGears) / baseDamageWithGears) * 100,
        selection: { ...selection },
      });
      return;
    }

    const { slot, items } = slotOptions[i];

    items.forEach((gear) => {
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
    });
  };

  dfs(0);

  /* ---------- sort ---------- */
  results.sort((a, b) =>
    b.percentGain === a.percentGain
      ? b.damage - a.damage
      : b.percentGain - a.percentGain
  );

  return {
    baseDamage: baseDamageWithGears,
    totalCombos: total,
    results: results.slice(0, limit),
  };
}
