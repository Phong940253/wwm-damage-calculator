import { InputStats, ElementStats } from "../types";
import { calcMinimumDamage, calcAffinityDamage, calcExpectedNormal } from "./damage";
import { ELEMENT_TYPES } from "../constants";

export interface DamageResult {
  min: number;
  normal: number;
  affinity: number;
}

export function calculateDamageWithGear(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>
): DamageResult {
  const getDerivedFromAttributes = () => {
    const v = (k: keyof InputStats) =>
      Number(stats[k]?.current || 0) + Number(gearBonus[k] || 0);

    const agility = v("Agility");
    const momentum = v("Momentum");
    const power = v("Power");

    return {
      minAtk: agility * 1 + power * 0.246,
      maxAtk: momentum * 0.9 + power * 1.315,
      critRate: agility * 0.075,
      affinityRate: momentum * 0.04,
    };
  };

  const derived = getDerivedFromAttributes();

  const g = (k: string): number => {
    if (k === "MINAttributeAttackOfYOURType")
      return Number(elementStats[`${elementStats.selected}Min`]?.current || 0);
    if (k === "MAXAttributeAttackOfYOURType")
      return Number(elementStats[`${elementStats.selected}Max`]?.current || 0);
    if (k === "AttributeAttackPenetrationOfYOURType")
      return Number(elementStats[`${elementStats.selected}Penetration`]?.current || 0);
    if (k === "AttributeAttackDMGBonusOfYOURType")
      return Number(elementStats[`${elementStats.selected}DMGBonus`]?.current || 0);
    
    if (k === "MINAttributeAttackOfOtherType") {
      const otherElements = ELEMENT_TYPES.filter((e) => e.key !== elementStats.selected);
      return otherElements.reduce(
        (acc, e) => acc + Number(elementStats[`${e.key}Min`]?.current || 0),
        0
      );
    }
    if (k === "MAXAttributeAttackOfOtherType") {
      const otherElements = ELEMENT_TYPES.filter((e) => e.key !== elementStats.selected);
      return otherElements.reduce(
        (acc, e) => acc + Number(elementStats[`${e.key}Max`]?.current || 0),
        0
      );
    }

    if (k === "MinPhysicalAttack") {
      return (
        Number(stats.MinPhysicalAttack?.current || 0) +
        (gearBonus.MinPhysicalAttack || 0) +
        derived.minAtk
      );
    }

    if (k === "MaxPhysicalAttack") {
      return (
        Number(stats.MaxPhysicalAttack?.current || 0) +
        (gearBonus.MaxPhysicalAttack || 0) +
        derived.maxAtk
      );
    }

    if (k === "CriticalRate") {
      return (
        Number(stats.CriticalRate?.current || 0) +
        (gearBonus.CriticalRate || 0) +
        derived.critRate
      );
    }

    if (k === "AffinityRate") {
      return (
        Number(stats.AffinityRate?.current || 0) +
        (gearBonus.AffinityRate || 0) +
        derived.affinityRate
      );
    }

    return Number(stats[k]?.current || 0) + (gearBonus[k] || 0);
  };

  const affinity = calcAffinityDamage(g);
  const normal = calcExpectedNormal(g, affinity);
  const min = calcMinimumDamage(g);

  return {
    min,
    normal: Math.round(normal * 10) / 10,
    affinity: Math.round(affinity * 10) / 10,
  };
}
