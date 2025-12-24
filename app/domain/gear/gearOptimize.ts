import { CustomGear, GearSlot, InputStats, ElementStats } from "@/app/types";
import { GEAR_SLOTS } from "@/app/constants";
import { aggregateEquippedGearBonus } from "./gearAggregate";
import { buildDamageContext } from "../damage/damageContext";
import { calculateDamage } from "../damage/damageCalculator";

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

/* =======================
   MAIN OPTIMIZER
======================= */

export function computeOptimizeResults(
  stats: InputStats,
  elementStats: ElementStats,
  customGears: CustomGear[],
  equipped: Partial<Record<GearSlot, string | undefined>>,
  desiredDisplay: number
): OptimizeComputation {
  /* ============================================================
     1️⃣ BASE DAMAGE = WITH EQUIPPED GEAR
  ============================================================ */

  const baseBonus = aggregateEquippedGearBonus(customGears, equipped);
  const baseCtx = buildDamageContext(stats, elementStats, baseBonus);
  const baseDamage = calculateDamage(baseCtx).normal;

  /* ============================================================
     2️⃣ PREPARE SLOT OPTIONS
     ------------------------------------------------------------
     Mỗi slot sẽ:
     - biết gear đang equip (origin)
     - biết các gear có thể thử
  ============================================================ */

  const slotOptions = GEAR_SLOTS.map(({ key }) => {
    const items = customGears.filter((g) => g.slot === key);

    // gear đang equip ở slot này (nếu có)
    const equippedGear =
      equipped[key] && customGears.find((g) => g.id === equipped[key]);

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

  if (estimated > MAX_COMBINATIONS) {
    throw new Error(`Too many combinations (${estimated.toLocaleString()})`);
  }

  const limit = Math.min(Math.max(desiredDisplay, 1), MAX_RESULTS_CAP);

  /* ============================================================
     3️⃣ DFS STATE
  ============================================================ */

  const results: OptimizeResult[] = [];
  let total = 0;

  const selection: Partial<Record<GearSlot, CustomGear>> = {};

  // ❗ bonus KHỞI ĐẦU = baseBonus (gear đang equip)
  const bonus: Record<string, number> = { ...baseBonus };

  /**
   * Apply / rollback stat của 1 gear
   */
  const applyGear = (gear: CustomGear, dir: 1 | -1) => {
    [...gear.mains, ...gear.subs, gear.addition]
      .filter(Boolean)
      .forEach((a) => {
        bonus[a!.stat] = (bonus[a!.stat] || 0) + dir * a!.value;
      });
  };

  /* ============================================================
     4️⃣ DFS
     ------------------------------------------------------------
     - Remove gear cũ
     - Apply gear mới
     - Rollback đúng thứ tự
  ============================================================ */

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

    const { slot, items, equippedGear } = slotOptions[i];

    for (const gear of items) {
      // 1️⃣ remove gear đang equip ở slot này (nếu có)
      if (equippedGear) {
        applyGear(equippedGear, -1);
      }

      if (gear) {
        // 2️⃣ apply gear mới
        selection[slot] = gear;
        applyGear(gear, +1);
      } else {
        delete selection[slot];
      }

      dfs(i + 1);

      // 3️⃣ rollback gear mới
      if (gear) {
        applyGear(gear, -1);
        delete selection[slot];
      }

      // 4️⃣ restore gear cũ
      if (equippedGear) {
        applyGear(equippedGear, +1);
      }
    }
  };

  dfs(0);

  /* ============================================================
     5️⃣ SORT + LIMIT
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
