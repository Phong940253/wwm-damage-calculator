import { InputStats, ElementStats } from "@/app/types";
import { ELEMENT_TYPES } from "@/app/constants";
import { computeDerivedStats } from "../stats/derivedStats";

export interface DamageContext {
  get: (key: string) => number;
}

export function buildDamageContext(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>
): DamageContext {
  const cur = (k: keyof InputStats) =>
    Number(stats[k]?.current || 0) + (gearBonus[k] || 0);

  const derived = computeDerivedStats(stats, gearBonus);

  const get = (k: string): number => {
    // ===== Element YOUR =====
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

    // ===== Element OTHER =====
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

    // ===== Derived =====
    if (k === "MinPhysicalAttack")
      return cur("MinPhysicalAttack") + derived.minAtk;
    if (k === "MaxPhysicalAttack")
      return cur("MaxPhysicalAttack") + derived.maxAtk;
    if (k === "CriticalRate") return cur("CriticalRate") + derived.critRate;
    if (k === "AffinityRate") return cur("AffinityRate") + derived.affinityRate;

    return cur(k as keyof InputStats);
  };

  return { get };
}
