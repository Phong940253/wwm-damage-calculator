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
  /* ============================
     Helpers
  ============================ */

  // Base stat + increase + gear
  const cur = (k: keyof InputStats) =>
    Number(stats[k]?.current || 0) +
    Number(stats[k]?.increase || 0) +
    (gearBonus[k] || 0);

  // Element stat + increase
  const ele = (k: keyof Omit<ElementStats, "selected">) =>
    Number(elementStats[k]?.current || 0) +
    Number(elementStats[k]?.increase || 0);

  /* ============================
     Derived stats (increase-aware)
  ============================ */

  // Build derived-input stats that already include increase + gear
  const derivedInput: InputStats = Object.fromEntries(
    Object.keys(stats).map((k) => [
      k,
      { current: cur(k as keyof InputStats), increase: 0 },
    ])
  ) as InputStats;

  const derived = computeDerivedStats(derivedInput, {});

  /* ============================
     Context getter
  ============================ */

  const get = (k: string): number => {
    /* ---------- YOUR Element ---------- */

    if (k === "MINAttributeAttackOfYOURType")
      return ele(`${elementStats.selected}Min` as any);

    if (k === "MAXAttributeAttackOfYOURType")
      return ele(`${elementStats.selected}Max` as any);

    if (k === "AttributeAttackPenetrationOfYOURType")
      return ele(`${elementStats.selected}Penetration` as any);

    if (k === "AttributeAttackDMGBonusOfYOURType")
      return ele(`${elementStats.selected}DMGBonus` as any);

    /* ---------- OTHER Elements ---------- */

    if (k === "MINAttributeAttackOfOtherType") {
      return ELEMENT_TYPES.filter(
        (e) => e.key !== elementStats.selected
      ).reduce((s, e) => s + ele(`${e.key}Min` as any), 0);
    }

    if (k === "MAXAttributeAttackOfOtherType") {
      return ELEMENT_TYPES.filter(
        (e) => e.key !== elementStats.selected
      ).reduce((s, e) => s + ele(`${e.key}Max` as any), 0);
    }

    /* ---------- Derived ---------- */

    if (k === "MinPhysicalAttack")
      return cur("MinPhysicalAttack") + derived.minAtk;
    if (k === "MaxPhysicalAttack")
      return cur("MaxPhysicalAttack") + derived.maxAtk;
    if (k === "CriticalRate") return cur("CriticalRate") + derived.critRate;
    if (k === "AffinityRate") return cur("AffinityRate") + derived.affinityRate;

    /* ---------- Fallback ---------- */

    return cur(k as keyof InputStats);
  };

  return { get };
}
