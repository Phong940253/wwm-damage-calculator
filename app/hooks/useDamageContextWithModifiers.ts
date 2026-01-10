import { InputStats, ElementStats, Rotation } from "@/app/types";
import {
  buildDamageContext,
  DamageContext,
} from "@/app/domain/damage/damageContext";
import { usePassiveModifiers } from "./usePassiveModifiers";
import { sumBonuses } from "@/app/domain/skill/modifierEngine";

/**
 * Enhanced version of buildDamageContext that includes passive skills + inner ways
 * TEMPORARILY DISABLED: Passive modifiers are not applied to avoid calculation errors
 * UI components remain intact for future use
 */
export function useDamageContextWithModifiers(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>,
  rotation?: Rotation
): DamageContext {
  const passiveBonuses = usePassiveModifiers(
    stats,
    elementStats,
    gearBonus,
    rotation
  );

  const combinedBonus = sumBonuses(gearBonus, passiveBonuses);
  return buildDamageContext(stats, elementStats, combinedBonus);
}
