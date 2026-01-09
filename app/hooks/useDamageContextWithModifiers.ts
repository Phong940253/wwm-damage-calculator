import { InputStats, ElementStats, Rotation } from "@/app/types";
import {
  buildDamageContext,
  DamageContext,
} from "@/app/domain/damage/damageContext";
import {
  usePassiveModifiers,
  applyPercentageModifier,
} from "./usePassiveModifiers";

/**
 * Enhanced version of buildDamageContext that includes passive skills + inner ways
 */
export function useDamageContextWithModifiers(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>,
  rotation?: Rotation
): DamageContext {
  // Lấy bonus từ passive skills + inner ways
  const passiveModifiers = usePassiveModifiers(rotation);

  // Merge gearBonus + passiveModifiers
  const combinedBonus = {
    ...gearBonus,
    ...passiveModifiers,
  };

  // Build base context (nó sẽ sử dụng combinedBonus)
  return buildDamageContext(stats, elementStats, combinedBonus);
}
