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
  /** Optional, best-effort stat backpropagation for UI/debug. */
  explain?: (key: string) => StatExplanation | null;
}

export type StatSourceKind =
  | "base"
  | "increase"
  | "gear"
  | "derived"
  | "element-other";

export interface StatSourceLine {
  kind: StatSourceKind;
  label: string;
  value: number;
  note?: string;
}

export interface StatExplanation {
  key: string;
  total: number;
  lines: StatSourceLine[];
  formula?: string;
}

export function buildDamageContext(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>
): DamageContext {
  /* ============================
     Helpers
  ============================ */

  // Base stat + increase + gear (all additive)
  const cur = (k: keyof InputStats): number => {
    return (
      Number(stats[k]?.current || 0) +
      Number(stats[k]?.increase || 0) +
      (gearBonus[k] || 0)
    );
  };

  // Element stat + increase + gear (all additive)
  const ele = (k: ElementStatKey): number => {
    return (
      Number(elementStats[k]?.current || 0) +
      Number(elementStats[k]?.increase || 0) +
      (gearBonus[k] || 0)
    );
  };

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

  const cachedOtherMaxAttr = otherElementsFilter.reduce((sum, e) => {
    const min = ele(elementKey(e.key, "Min"));
    const max = ele(elementKey(e.key, "Max"));

    // If user input makes Min > Max, treat Max as Min for calculations.
    return sum + Math.max(max, min);
  }, 0);

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

  const explain = (k: string): StatExplanation | null => {
    const total = get(k);

    const explainInputStat = (key: keyof InputStats): StatSourceLine[] => {
      const base = Number(stats[key]?.current || 0);
      const inc = Number(stats[key]?.increase || 0);
      const gear = gearBonus[String(key)] || 0;
      return [
        { kind: "base", label: "Base", value: base },
        { kind: "increase", label: "Increase", value: inc },
        { kind: "gear", label: "Gear/Modifiers", value: gear },
      ].filter((x) => x.value !== 0);
    };

    const explainElementStat = (key: ElementStatKey): StatSourceLine[] => {
      const base = Number(elementStats[key]?.current || 0);
      const inc = Number(elementStats[key]?.increase || 0);
      const gear = gearBonus[String(key)] || 0;
      return [
        { kind: "base", label: "Base", value: base },
        { kind: "increase", label: "Increase", value: inc },
        { kind: "gear", label: "Gear/Modifiers", value: gear },
      ].filter((x) => x.value !== 0);
    };

    // YOUR element keys
    if (k === "MINAttributeAttackOfYOURType") {
      const key = elementKey(elementStats.selected, "Min");
      return { key: k, total, lines: explainElementStat(key) };
    }
    if (k === "MAXAttributeAttackOfYOURType") {
      const key = elementKey(elementStats.selected, "Max");
      return { key: k, total, lines: explainElementStat(key) };
    }
    if (k === "AttributeAttackPenetrationOfYOURType") {
      const key = elementKey(elementStats.selected, "Penetration");
      return { key: k, total, lines: explainElementStat(key) };
    }
    if (k === "AttributeAttackDMGBonusOfYOURType") {
      const key = elementKey(elementStats.selected, "DMGBonus");
      return { key: k, total, lines: explainElementStat(key) };
    }
    if (k === "MainElementMultiplier") {
      return {
        key: k,
        total,
        lines: explainElementStat("MainElementMultiplier"),
      };
    }

    // OTHER elements (cached): report by source-kind sums for transparency.
    if (k === "MINAttributeAttackOfOtherType") {
      let baseSum = 0;
      let incSum = 0;
      let gearSum = 0;
      for (const e of otherElementsFilter) {
        const ek = elementKey(e.key, "Min");
        baseSum += Number(elementStats[ek]?.current || 0);
        incSum += Number(elementStats[ek]?.increase || 0);
        gearSum += gearBonus[String(ek)] || 0;
      }
      const lines: StatSourceLine[] = [
        {
          kind: "element-other",
          label: "Other elements (base)",
          value: baseSum,
          note: "Sum of Min across all non-selected elements",
        },
        { kind: "increase", label: "Other elements (increase)", value: incSum },
        { kind: "gear", label: "Other elements (gear/mods)", value: gearSum },
      ].filter((x) => x.value !== 0);
      return { key: k, total, lines };
    }

    if (k === "MAXAttributeAttackOfOtherType") {
      let baseSum = 0;
      let incSum = 0;
      let gearSum = 0;

      for (const e of otherElementsFilter) {
        const minK = elementKey(e.key, "Min");
        const maxK = elementKey(e.key, "Max");

        const baseMin = Number(elementStats[minK]?.current || 0);
        const baseMax = Number(elementStats[maxK]?.current || 0);
        baseSum += Math.max(baseMax, baseMin);

        const incMin = Number(elementStats[minK]?.increase || 0);
        const incMax = Number(elementStats[maxK]?.increase || 0);
        incSum += Math.max(incMax, incMin);

        const gearMin = gearBonus[String(minK)] || 0;
        const gearMax = gearBonus[String(maxK)] || 0;
        gearSum += Math.max(gearMax, gearMin);
      }

      const lines: StatSourceLine[] = [
        {
          kind: "element-other",
          label: "Other elements (base)",
          value: baseSum,
          note: "Sum of Max (clamped by Min) across all non-selected elements",
        },
        { kind: "increase", label: "Other elements (increase)", value: incSum },
        { kind: "gear", label: "Other elements (gear/mods)", value: gearSum },
      ].filter((x) => x.value !== 0);

      return { key: k, total, lines };
    }

    // Derived stats: show base stat + attribute-derived component.
    if (k === "MinPhysicalAttack") {
      const agility = cur("Agility");
      const power = cur("Power");
      return {
        key: k,
        total,
        formula: "Agility×1 + Power×0.246",
        lines: [
          ...explainInputStat("MinPhysicalAttack"),
          { kind: "derived", label: "From Agility", value: agility * 1 },
          { kind: "derived", label: "From Power", value: power * 0.246 },
        ].filter((x) => x.value !== 0),
      };
    }

    if (k === "MaxPhysicalAttack") {
      const momentum = cur("Momentum");
      const power = cur("Power");

      return {
        key: k,
        total,
        formula: "Momentum×0.9 + Power×1.315",
        lines: [
          ...explainInputStat("MaxPhysicalAttack"),
          { kind: "derived", label: "From Momentum", value: momentum * 0.9 },
          { kind: "derived", label: "From Power", value: power * 1.315 },
        ].filter((x) => x.value !== 0),
      };
    }

    if (k === "CriticalRate") {
      const agility = cur("Agility");
      return {
        key: k,
        total,
        formula: "Agility×0.075",
        lines: [
          ...explainInputStat("CriticalRate"),
          { kind: "derived", label: "From Agility", value: agility * 0.075 },
        ].filter((x) => x.value !== 0),
      };
    }

    if (k === "AffinityRate") {
      const momentum = cur("Momentum");
      return {
        key: k,
        total,
        formula: "Momentum×0.04",
        lines: [
          ...explainInputStat("AffinityRate"),
          { kind: "derived", label: "From Momentum", value: momentum * 0.04 },
        ].filter((x) => x.value !== 0),
      };
    }

    // Fallback: if the key exists in stats or elementStats, expose (base/increase/gear).
    if (k in stats) {
      return { key: k, total, lines: explainInputStat(k as keyof InputStats) };
    }
    if (k in elementStats) {
      return { key: k, total, lines: explainElementStat(k as ElementStatKey) };
    }

    return { key: k, total, lines: [] };
  };

  return { get, explain };
}
