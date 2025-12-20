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

import { ElementKey, ELEMENT_TYPES } from "../constants";
import { ElementStats } from "../types";

export const useDamage = (
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>
) => {
  // ---------- helpers ----------
  const gBase = (k: string) => {
    if (k === "MINAttributeAttackOfYOURType")
      return Number(
        elementStats[`${elementStats.selected}Min`]?.current || 0
      );
    if (k === "MAXAttributeAttackOfYOURType")
      return Number(
        elementStats[`${elementStats.selected}Max`]?.current || 0
      );
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
    return Number(stats[k]?.current || 0) + (gearBonus[k] || 0);
  };

  const gFinal = (k: string) => {
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

    const pct = (b: number, f: number) =>
      b === 0 ? 0 : ((f - b) / b) * 100;

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
          ? Number(stats[k]?.current || 0) +
            inc +
            (gearBonus[k] || 0)
          : gBase(k);

      const dmg = calcExpectedNormal(
        testG,
        calcAffinityDamage(testG)
      );

      impact[key] = ((dmg - baseDmg) / baseDmg) * 100;
    });

    return impact;
  }, [stats, elementStats, gearBonus]);

  return { result, statImpact };
};
