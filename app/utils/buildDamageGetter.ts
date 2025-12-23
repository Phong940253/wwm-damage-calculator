import { InputStats, ElementStats } from "@/app/types";
import { ELEMENT_TYPES } from "@/app/constants";

export function buildDamageGetter(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>
) {
  const cur = (k: keyof InputStats) => Number(stats[k]?.current || 0);
  const gear = (k: keyof InputStats) => Number(gearBonus[k] || 0);

  const agility = cur("Agility") + gear("Agility");
  const momentum = cur("Momentum") + gear("Momentum");
  const power = cur("Power") + gear("Power");

  const derived = {
    minAtk: agility * 1 + power * 0.246,
    maxAtk: momentum * 0.9 + power * 1.315,
    critRate: agility * 0.075,
    affinityRate: momentum * 0.04,
  };

  return (k: string): number => {
    // ===== ELEMENT (YOUR TYPE) =====
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

    // ===== ELEMENT (OTHER 4 TYPES) =====
    if (k === "MINAttributeAttackOfOtherType") {
      return ELEMENT_TYPES.filter(
        (e) => e.key !== elementStats.selected
      ).reduce(
        (s, e) => s + Number(elementStats[`${e.key}Min`]?.current || 0),
        0
      );
    }

    if (k === "MAXAttributeAttackOfOtherType") {
      return ELEMENT_TYPES.filter(
        (e) => e.key !== elementStats.selected
      ).reduce(
        (s, e) => s + Number(elementStats[`${e.key}Max`]?.current || 0),
        0
      );
    }

    // ===== PHYSICAL + DERIVED =====
    if (k === "MinPhysicalAttack")
      return (
        cur("MinPhysicalAttack") + gear("MinPhysicalAttack") + derived.minAtk
      );

    if (k === "MaxPhysicalAttack")
      return (
        cur("MaxPhysicalAttack") + gear("MaxPhysicalAttack") + derived.maxAtk
      );

    if (k === "CriticalRate")
      return cur("CriticalRate") + gear("CriticalRate") + derived.critRate;

    if (k === "AffinityRate")
      return cur("AffinityRate") + gear("AffinityRate") + derived.affinityRate;

    // ===== DEFAULT =====
    return cur(k as keyof InputStats) + gear(k as keyof InputStats);
  };
}
