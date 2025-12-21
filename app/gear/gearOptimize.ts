import { CustomGear, GearSlot, InputStats, ElementStats } from "@/app/types";
import { GEAR_SLOTS } from "@/app/constants";
import { aggregateGearStats } from "@/app/utils/gear";
import { calculateDamageUnified } from "@/app/utils/calcDamageUnified";

export const MAX_COMBINATIONS = 200_000;
export const MAX_RESULTS_CAP = 10_000;

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

export function computeOptimizeResults(
  stats: InputStats,
  elementStats: ElementStats,
  customGears: CustomGear[],
  equipped: Partial<Record<GearSlot, string | undefined>>,
  desiredDisplay: number
): OptimizeComputation {
  const baseBonus = aggregateGearStats(customGears, equipped ?? {});
  const baseDamage = calculateDamageUnified(
    stats,
    elementStats,
    baseBonus
  ).normal;

  if (customGears.length === 0) {
    return { baseDamage, totalCombos: 0, results: [] };
  }

  const slotOptions = GEAR_SLOTS.map(({ key }) => {
    const items = customGears.filter((g) => g.slot === key);
    return { slot: key, items: items.length ? items : [null] };
  });

  const estimated = slotOptions.reduce(
    (acc, { items }) => acc * items.length,
    1
  );

  if (estimated > MAX_COMBINATIONS) {
    throw new Error(`Too many combinations (${estimated.toLocaleString()}).`);
  }

  const limit = Math.min(Math.max(desiredDisplay, 1), MAX_RESULTS_CAP);

  const bonus: Record<string, number> = {};
  const selection: Partial<Record<GearSlot, CustomGear>> = {};
  const results: OptimizeResult[] = [];
  let total = 0;

  const addGear = (gear: CustomGear, dir: 1 | -1) => {
    const attrs = [...gear.mains, ...gear.subs];
    if (gear.addition) attrs.push(gear.addition);
    attrs.forEach((a) => {
      bonus[a.stat] = (bonus[a.stat] || 0) + dir * a.value;
    });
  };

  const dfs = (i: number) => {
    if (i === slotOptions.length) {
      total++;
      const damage = calculateDamageUnified(stats, elementStats, bonus).normal;

      results.push({
        key: GEAR_SLOTS.map(({ key }) => selection[key]?.id ?? "none").join(
          "|"
        ),
        damage,
        percentGain:
          baseDamage === 0 ? 0 : ((damage - baseDamage) / baseDamage) * 100,
        selection: { ...selection },
      });
      return;
    }

    const { slot, items } = slotOptions[i];

    items.forEach((gear) => {
      if (gear) {
        selection[slot] = gear;
        addGear(gear, 1);
        dfs(i + 1);
        addGear(gear, -1);
        delete selection[slot];
      } else {
        delete selection[slot];
        dfs(i + 1);
      }
    });
  };

  dfs(0);

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
