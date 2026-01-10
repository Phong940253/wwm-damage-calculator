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
 * TEMPORARILY DISABLED: Passive modifiers are not applied to avoid calculation errors
 * UI components remain intact for future use
 */
export function useDamageContextWithModifiers(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>,
  rotation?: Rotation
): DamageContext {
  // TODO: Re-enable passive modifiers once issues are resolved
  // const passiveModifiers = usePassiveModifiers(rotation);
  // const combinedBonus = {
  //   ...gearBonus,
  //   ...passiveModifiers,
  // };

  // For now, use only gearBonus (no passive modifiers)
  const ctx = buildDamageContext(stats, elementStats, gearBonus);
  return ctx;
}
