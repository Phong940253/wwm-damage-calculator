import { InputStats, ElementStats } from "../types";
import { ELEMENT_TYPES } from "../constants";
import {
  calcAffinityDamage,
  calcExpectedNormal,
  calcMinimumDamage,
} from "../domain/damage/damageFormula";

/**
 * EXACT same logic as useDamage,
 * but usable outside React (gear optimizer)
 */
export function calculateDamageUnified(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>
) {
  const g = (k: string) => {
    if (k === "MINAttributeAttackOfYOURType")
      return Number(elementStats[`${elementStats.selected}Min`]?.current || 0);

    if (k === "MAXAttributeAttackOfYOURType")
      return Number(elementStats[`${elementStats.selected}Max`]?.current || 0);

    if (k === "AttributeAttackPenetrationOfYOURType")
      return Number(
        elementStats[`${elementStats.selected}Penetration`]?.current || 0
      );

    if (k === "AttributeAttackDMGBonusOfYOURType")
      return Number(
        elementStats[`${elementStats.selected}DMGBonus`]?.current || 0
      );

    if (k === "MINAttributeAttackOfOtherType") {
      return ELEMENT_TYPES.filter(
        (e) => e.key !== elementStats.selected
      ).reduce(
        (sum, e) => sum + Number(elementStats[`${e.key}Min`]?.current || 0),
        0
      );
    }

    if (k === "MAXAttributeAttackOfOtherType") {
      return ELEMENT_TYPES.filter(
        (e) => e.key !== elementStats.selected
      ).reduce(
        (sum, e) => sum + Number(elementStats[`${e.key}Max`]?.current || 0),
        0
      );
    }

    return (
      Number(stats[k]?.current || 0) +
      Number(stats[k]?.increase || 0) +
      (gearBonus[k] || 0)
    );
  };

  const affinity = calcAffinityDamage(g);

  return {
    min: calcMinimumDamage(g),
    normal: calcExpectedNormal(g, affinity),
    affinity,
  };
}
