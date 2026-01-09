import { useMemo } from "react";
import { PASSIVE_SKILLS } from "@/app/domain/skill/passiveSkills";
import { INNER_WAYS } from "@/app/domain/skill/innerWays";
import { Rotation } from "@/app/types";

/**
 * Hook để tính toán bonus từ passive skills + inner ways
 * Returns: Record<stat_key, bonus_value>
 */
export function usePassiveModifiers(
  rotation?: Rotation
): Record<string, number> {
  return useMemo(() => {
    const bonuses: Record<string, number> = {};

    if (!rotation) return bonuses;

    // ==================== PASSIVE SKILLS ====================
    rotation.activePassiveSkills.forEach((passiveId) => {
      const passive = PASSIVE_SKILLS.find((p) => p.id === passiveId);
      if (!passive) return;

      passive.modifiers.forEach((modifier) => {
        const key = String(modifier.stat);
        if (!bonuses[key]) bonuses[key] = 0;

        if (modifier.type === "flat") {
          // Thêm giá trị cố định
          bonuses[key] += modifier.value;
        } else if (modifier.type === "stat") {
          // Tạm thời lưu % để xử lý sau (cần biết base stat)
          // Format: "stat:percentage" để phân biệt
          const percentKey = `${key}:percentage`;
          if (!bonuses[percentKey]) bonuses[percentKey] = 0;
          bonuses[percentKey] += modifier.value;
        }
      });
    });

    // ==================== INNER WAYS ====================
    rotation.activeInnerWays.forEach((innerId) => {
      const inner = INNER_WAYS.find((i) => i.id === innerId);
      if (!inner) return;

      // Check applicability
      if (
        inner.applicableToMartialArtId &&
        inner.applicableToMartialArtId !== rotation.martialArtId
      ) {
        return; // Skip nếu inner way không áp dụng
      }

      inner.modifiers.forEach((modifier) => {
        const key = String(modifier.stat);
        if (!bonuses[key]) bonuses[key] = 0;

        if (modifier.type === "flat") {
          bonuses[key] += modifier.value;
        } else if (modifier.type === "stat") {
          const percentKey = `${key}:percentage`;
          if (!bonuses[percentKey]) bonuses[percentKey] = 0;
          bonuses[percentKey] += modifier.value;
        }
      });
    });

    return bonuses;
  }, [rotation]);
}

/**
 * Helper: Apply percentage modifiers (stat-based)
 * Được gọi sau khi có base stat value
 */
export function applyPercentageModifier(
  baseStat: number,
  bonuses: Record<string, number>,
  statKey: string
): number {
  const percentKey = `${statKey}:percentage`;
  const percentBonus = bonuses[percentKey] || 0;
  const flatBonus = bonuses[statKey] || 0;

  // Base + percentage of base + flat
  return baseStat * (1 + percentBonus) + flatBonus;
}
