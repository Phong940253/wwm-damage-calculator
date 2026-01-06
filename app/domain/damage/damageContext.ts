import {
  InputStats,
  ElementStats,
  ElementStatKey,
  ElementStatSuffix,
} from "@/app/types";
import { ELEMENT_TYPES, ElementKey } from "@/app/constants";
import { computeDerivedStats } from "../stats/derivedStats";

function elementKey(
  element: ElementKey,
  suffix: ElementStatSuffix
): ElementStatKey {
  return `${element}${suffix}` as ElementStatKey;
}

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
  const ele = (k: ElementStatKey) =>
    Number(elementStats[k]?.current || 0) +
    Number(elementStats[k]?.increase || 0) +
    (gearBonus[k] || 0);

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
     Cache for OTHER elements
  ============================ */
  
  // Pre-calculate other elements min/max to avoid filtering on every call
  const otherElementsFilter = ELEMENT_TYPES.filter(
    (e) => e.key !== elementStats.selected
  );

  const cachedOtherMinAttr = otherElementsFilter.reduce(
    (sum, e) => sum + ele(elementKey(e.key, "Min")),
    0
  );

  const cachedOtherMaxAttr = otherElementsFilter.reduce(
    (sum, e) => sum + ele(elementKey(e.key, "Max")),
    0
  );

  /* ============================
     Context getter
  ============================ */

  const get = (k: string): number => {
    /* ---------- YOUR Element ---------- */

    if (k === "MINAttributeAttackOfYOURType")
      return ele(elementKey(elementStats.selected, "Min"));

    if (k === "MAXAttributeAttackOfYOURType")
      return ele(elementKey(elementStats.selected, "Max"));

    if (k === "AttributeAttackPenetrationOfYOURType")
      return ele(elementKey(elementStats.selected, "Penetration"));

    if (k === "AttributeAttackDMGBonusOfYOURType")
      return ele(elementKey(elementStats.selected, "DMGBonus"));

    if (k === "MainElementMultiplier") return ele("MainElementMultiplier");

    /* ---------- OTHER Elements (cached) ---------- */

    if (k === "MINAttributeAttackOfOtherType") {
      return cachedOtherMinAttr;
    }

    if (k === "MAXAttributeAttackOfOtherType") {
      return cachedOtherMaxAttr;
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
