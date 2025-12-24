// app/domain/gear/gearOptimize.ts

import { CustomGear, GearSlot, InputStats, ElementStats } from "@/app/types";
import { GEAR_SLOTS } from "@/app/constants";
import { aggregateEquippedGearBonus } from "./gearAggregate";
import { buildDamageContext } from "../damage/damageContext";
import { calculateDamage } from "../damage/damageCalculator";

/* ============================================================
   RESULT TYPES
============================================================ */

/**
 * Một kết quả optimize duy nhất
 */
export interface OptimizeResult {
  /** key duy nhất đại diện cho combo gear */
  key: string;

  /** damage trung bình (normal damage) */
  damage: number;

  /** % tăng so với base damage */
  percentGain: number;

  /** gear được chọn cho mỗi slot */
  selection: Partial<Record<GearSlot, CustomGear>>;
}

/**
 * Kết quả cuối của optimizer
 */
export interface OptimizeComputation {
  baseDamage: number; // damage khi KHÔNG có gear
  totalCombos: number; // tổng số combo đã duyệt
  results: OptimizeResult[];
}

/* ============================================================
   SAFETY LIMITS
============================================================ */

export const MAX_RESULTS_CAP = 10_000; // giới hạn số kết quả trả về
export const MAX_COMBINATIONS = 1_000_000_000; // tránh nổ máy

/* ============================================================
   MAIN OPTIMIZER FUNCTION
============================================================ */

/**
 * Tính toán các combination gear tốt nhất
 *
 * ❗ QUY TẮC CỐT LÕI:
 * - Base damage = KHÔNG có gear
 * - DFS bắt đầu với bonus rỗng {}
 * - Mỗi slot chỉ có 1 gear
 */
export function computeOptimizeResults(
  stats: InputStats,
  elementStats: ElementStats,
  customGears: CustomGear[],
  equipped: Partial<Record<GearSlot, string | undefined>>, // (không dùng để cộng)
  desiredDisplay: number
): OptimizeComputation {
  /* ============================================================
     1️⃣ BASE DAMAGE (NO GEAR)
     ------------------------------------------------------------
     Đây là damage "chuẩn gốc" để tính % gain
     ❌ KHÔNG được dùng gear equipped ở đây
  ============================================================ */

  const emptyEquipped: Partial<Record<GearSlot, string>> = {};

  // bonus = {} vì emptyEquipped
  const baseBonus = aggregateEquippedGearBonus(customGears, emptyEquipped);

  const baseCtx = buildDamageContext(stats, elementStats, baseBonus);
  const baseDamage = calculateDamage(baseCtx).normal;

  /* ============================================================
     2️⃣ BUILD SLOT OPTIONS
     ------------------------------------------------------------
     Mỗi slot có danh sách gear hợp lệ
     Nếu slot không có gear nào → cho phép null (empty slot)
  ============================================================ */

  const slotOptions = GEAR_SLOTS.map(({ key }) => {
    const items = customGears.filter((g) => g.slot === key);

    return {
      slot: key,
      items: items.length > 0 ? items : [null],
    };
  });

  /* ============================================================
     3️⃣ ESTIMATE COMBINATION COUNT (SAFETY)
  ============================================================ */

  const estimated = slotOptions.reduce(
    (acc, { items }) => acc * items.length,
    1
  );

  if (estimated > MAX_COMBINATIONS) {
    throw new Error(`Too many combinations (${estimated.toLocaleString()})`);
  }

  const limit = Math.min(Math.max(desiredDisplay, 1), MAX_RESULTS_CAP);

  /* ============================================================
     4️⃣ DFS STATE
     ------------------------------------------------------------
     bonus: stat bonus hiện tại của combo đang duyệt
     selection: gear được chọn cho từng slot
  ============================================================ */

  const results: OptimizeResult[] = [];
  let total = 0;

  // lưu selection hiện tại (mutable trong DFS)
  const selection: Partial<Record<GearSlot, CustomGear>> = {};

  // ❗ CỰC KỲ QUAN TRỌNG
  // bonus KHỞI ĐẦU LÀ RỖNG → KHÔNG DUPLICATE GEAR
  const bonus: Record<string, number> = {};

  /**
   * Apply hoặc rollback stat của 1 gear
   * dir = +1 → apply
   * dir = -1 → rollback
   */
  const applyGear = (gear: CustomGear, dir: 1 | -1) => {
    [...gear.mains, ...gear.subs, gear.addition]
      .filter(Boolean)
      .forEach((attr) => {
        bonus[attr!.stat] = (bonus[attr!.stat] || 0) + dir * attr!.value;
      });
  };

  /* ============================================================
     5️⃣ DFS (DEPTH-FIRST SEARCH)
  ============================================================ */

  const dfs = (index: number) => {
    // ✅ Đã chọn xong gear cho tất cả slot
    if (index === slotOptions.length) {
      total++;

      // build damage context từ bonus hiện tại
      const ctx = buildDamageContext(stats, elementStats, bonus);
      const dmg = calculateDamage(ctx).normal;

      results.push({
        key: GEAR_SLOTS.map(({ key }) => selection[key]?.id ?? "none").join(
          "|"
        ),

        damage: dmg,

        percentGain:
          baseDamage === 0 ? 0 : ((dmg - baseDamage) / baseDamage) * 100,

        // clone để tránh mutation
        selection: { ...selection },
      });

      return;
    }

    const { slot, items } = slotOptions[index];

    // thử từng gear trong slot
    for (const gear of items) {
      if (gear) {
        // chọn gear cho slot
        selection[slot] = gear;

        // cộng stat
        applyGear(gear, +1);

        // đi tiếp slot sau
        dfs(index + 1);

        // rollback stat
        applyGear(gear, -1);

        // bỏ chọn
        delete selection[slot];
      } else {
        // slot trống
        delete selection[slot];
        dfs(index + 1);
      }
    }
  };

  // bắt đầu DFS
  dfs(0);

  /* ============================================================
     6️⃣ SORT + LIMIT RESULT
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
