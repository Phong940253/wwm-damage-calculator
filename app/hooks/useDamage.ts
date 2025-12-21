// app\hooks\useDamage.ts
import { useMemo } from "react";
import { InputStats } from "../types";
import {
  calcMinimumDamage,
  calcAffinityDamage,
  calcExpectedNormal,
} from "../utils/damage";

interface DamageValue {
  value: number;
  percent: number;
}

export interface DamageResult {
  min: DamageValue;
  normal: DamageValue;
  affinity: DamageValue;
}

import { ELEMENT_TYPES } from "../constants";
import { ElementStats } from "../types";

export const useDamage = (
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>
) => {
  const getDerivedFromAttributes = (useFinal: boolean) => {
    const cur = (k: keyof InputStats) => Number(stats[k]?.current || 0);

    const inc = (k: keyof InputStats) => Number(stats[k]?.increase || 0);

    const gear = (k: keyof InputStats) => Number(gearBonus[k] || 0);

    // value used for damage calculation
    const v = (k: keyof InputStats) =>
      useFinal ? cur(k) + inc(k) + gear(k) : cur(k) + gear(k);

    const agility = v("Agility");
    const momentum = v("Momentum");
    const power = v("Power");

    return {
      // ---- Derived Physical Attack ----
      minAtk: agility * 1 + power * 0.246,

      maxAtk: momentum * 0.9 + power * 1.315,

      // ---- Derived Rates ----
      critRate: agility * 0.075,

      affinityRate: momentum * 0.04,
    };
  };

  // ---------- helpers ----------
  const gBase = (k: string) => {
    const derived = getDerivedFromAttributes(true);

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
      const otherElements = ELEMENT_TYPES.filter(
        (e) => e.key !== elementStats.selected
      );
      return otherElements.reduce(
        (acc, e) => acc + Number(elementStats[`${e.key}Min`]?.current || 0),
        0
      );
    }
    if (k === "MAXAttributeAttackOfOtherType") {
      const otherElements = ELEMENT_TYPES.filter(
        (e) => e.key !== elementStats.selected
      );
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

  const gFinal = (k: string) => {
    const derived = getDerivedFromAttributes(false);

    if (k === "MINAttributeAttackOfYOURType")
      return (
        Number(elementStats[`${elementStats.selected}Min`]?.current || 0) +
        Number(elementStats[`${elementStats.selected}Min`]?.increase || 0)
      );
    if (k === "MAXAttributeAttackOfYOURType")
      return (
        Number(elementStats[`${elementStats.selected}Max`]?.current || 0) +
        Number(elementStats[`${elementStats.selected}Max`]?.increase || 0)
      );
    if (k === "AttributeAttackPenetrationOfYOURType")
      return (
        Number(
          elementStats[`${elementStats.selected}Penetration`]?.current || 0
        ) +
        Number(
          elementStats[`${elementStats.selected}Penetration`]?.increase || 0
        )
      );
    if (k === "AttributeAttackDMGBonusOfYOURType")
      return (
        Number(elementStats[`${elementStats.selected}DMGBonus`]?.current || 0) +
        Number(elementStats[`${elementStats.selected}DMGBonus`]?.increase || 0)
      );
    if (k === "MINAttributeAttackOfOtherType") {
      const otherElements = ELEMENT_TYPES.filter(
        (e) => e.key !== elementStats.selected
      );
      return otherElements.reduce(
        (acc, e) =>
          acc +
          (Number(elementStats[`${e.key}Min`]?.current || 0) +
            Number(elementStats[`${e.key}Min`]?.increase || 0)),
        0
      );
    }
    if (k === "MAXAttributeAttackOfOtherType") {
      const otherElements = ELEMENT_TYPES.filter(
        (e) => e.key !== elementStats.selected
      );
      return otherElements.reduce(
        (acc, e) =>
          acc +
          (Number(elementStats[`${e.key}Max`]?.current || 0) +
            Number(elementStats[`${e.key}Max`]?.increase || 0)),
        0
      );
    }

    if (k === "MinPhysicalAttack") {
      return (
        Number(stats.MinPhysicalAttack?.current || 0) +
        Number(stats.MinPhysicalAttack?.increase || 0) +
        (gearBonus.MinPhysicalAttack || 0) +
        derived.minAtk
      );
    }

    if (k === "MaxPhysicalAttack") {
      return (
        Number(stats.MaxPhysicalAttack?.current || 0) +
        Number(stats.MaxPhysicalAttack?.increase || 0) +
        (gearBonus.MaxPhysicalAttack || 0) +
        derived.maxAtk
      );
    }

    if (k === "CriticalRate") {
      return (
        Number(stats.CriticalRate?.current || 0) +
        Number(stats.CriticalRate?.increase || 0) +
        (gearBonus.CriticalRate || 0) +
        derived.critRate
      );
    }

    if (k === "AffinityRate") {
      return (
        Number(stats.AffinityRate?.current || 0) +
        Number(stats.AffinityRate?.increase || 0) +
        (gearBonus.AffinityRate || 0) +
        derived.affinityRate
      );
    }

    return (
      Number(stats[k]?.current || 0) +
      Number(stats[k]?.increase || 0) +
      (gearBonus[k] || 0)
    );
  };

  // ---------- main damage ----------
  const result = useMemo<DamageResult>(() => {
    const calc = (g: (k: string) => number) => {
      const affinity = calcAffinityDamage(g);
      return {
        min: calcMinimumDamage(g),
        normal: calcExpectedNormal(g, affinity),
        affinity,
      };
    };

    const base = calc(gBase);
    const final = calc(gFinal);

    const pct = (b: number, f: number) => (b === 0 ? 0 : ((f - b) / b) * 100);

    return {
      min: {
        value: final.min,
        percent: pct(base.min, final.min),
      },
      normal: {
        value: Math.round(final.normal * 10) / 10,
        percent: pct(base.normal, final.normal),
      },
      affinity: {
        value: Math.round(final.affinity * 10) / 10,
        percent: pct(base.affinity, final.affinity),
      },
    };
  }, [stats, elementStats, gearBonus]);

  // ---------- stat impact ----------
  const statImpact = useMemo<Record<string, number>>(() => {
    const baseDmg = calcExpectedNormal(gBase, calcAffinityDamage(gBase));
    const impact: Record<string, number> = {};

    Object.keys(stats).forEach((key) => {
      const inc = Number(stats[key].increase || 0);
      if (inc === 0 || baseDmg === 0) {
        impact[key] = 0;
        return;
      }

      const testG = (k: string) =>
        k === key
          ? Number(stats[k]?.current || 0) + inc + (gearBonus[k] || 0)
          : gBase(k);

      const dmg = calcExpectedNormal(testG, calcAffinityDamage(testG));

      impact[key] = ((dmg - baseDmg) / baseDmg) * 100;
    });

    return impact;
  }, [stats, elementStats, gearBonus]);

  return { result, statImpact };
};
