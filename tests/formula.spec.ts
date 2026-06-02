import { describe, it, expect } from "vitest";
import { INITIAL_STATS, INITIAL_ELEMENT_STATS } from "@/app/constants";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { calculateDamage } from "@/app/domain/damage/damageCalculator";
import {
  calcMinimumDamage,
  calcAffinityDamage,
  calcExpectedNormal,
  calcExpectedNormalBreakdown,
  explainCalcExpectedNormal,
} from "@/app/domain/damage/damageFormula";

describe("damage formula invariants", () => {
  it("explainCalcExpectedNormal matches calcExpectedNormal (initial stats)", () => {
    const ctx = buildDamageContext(INITIAL_STATS, INITIAL_ELEMENT_STATS, {});
    const g = ctx.get;
    const affinity = calcAffinityDamage(g);
    const expected = calcExpectedNormal(g, affinity);
    const explained = explainCalcExpectedNormal(g, affinity);
    expect(expected).toBeCloseTo(explained.expected, 6);
  });

  it("breakdown sums to expected", () => {
    const ctx = buildDamageContext(INITIAL_STATS, INITIAL_ELEMENT_STATS, {});
    const g = ctx.get;
    const affinity = calcAffinityDamage(g);
    const expected = calcExpectedNormal(g, affinity);
    const breakdown = calcExpectedNormalBreakdown(g, affinity);
    const sum =
      breakdown.abrasion +
      breakdown.affinity +
      breakdown.critical +
      breakdown.normal;
    expect(sum).toBeCloseTo(expected, 6);
  });

  it("P=0 -> expected equals noPrecision", () => {
    // build a minimal getter map with P=0
    const baseMap: Record<string, number> = {
      MinPhysicalAttack: 100,
      MaxPhysicalAttack: 200,
      PhysicalPenetration: 0,
      PhysicalDMGBonus: 0,
      MINAttributeAttackOfOtherType: 0,
      MAXAttributeAttackOfOtherType: 0,
      PhysicalAttackMultiplier: 100,
      FlatDamage: 0,
      MINAttributeAttackOfYOURType: 0,
      MAXAttributeAttackOfYOURType: 0,
      MainElementMultiplier: 100,
      AttributeAttackPenetrationOfYOURType: 0,
      AttributeAttackDMGBonusOfYOURType: 0,
      CriticalDMGBonus: 50,
      AffinityDMGBonus: 50,
      DamageBoost: 0,
      CombatBoostAgainstBossUnits: 0,
      PrecisionRate: 0,
      FinalAffinityRate: 0.3 * 100,
      FinalCriticalRate: 0.2 * 100,
    };
    const g = (k: string) => baseMap[k] ?? 0;
    const affinity = calcAffinityDamage(g);
    const explained = explainCalcExpectedNormal(g, affinity);
    const expected = calcExpectedNormal(g, affinity);
    expect(explained.P).toBe(0);
    expect(expected).toBeCloseTo(explained.noPrecision, 6);
  });

  it("P=1 -> expected equals precision expression", () => {
    const baseMap: Record<string, number> = {
      MinPhysicalAttack: 100,
      MaxPhysicalAttack: 200,
      PhysicalPenetration: 0,
      PhysicalDMGBonus: 0,
      MINAttributeAttackOfOtherType: 0,
      MAXAttributeAttackOfOtherType: 0,
      PhysicalAttackMultiplier: 100,
      FlatDamage: 0,
      MINAttributeAttackOfYOURType: 0,
      MAXAttributeAttackOfYOURType: 0,
      MainElementMultiplier: 100,
      AttributeAttackPenetrationOfYOURType: 0,
      AttributeAttackDMGBonusOfYOURType: 0,
      CriticalDMGBonus: 50,
      AffinityDMGBonus: 50,
      DamageBoost: 0,
      CombatBoostAgainstBossUnits: 0,
      PrecisionRate: 100,
      FinalAffinityRate: 0.2 * 100,
      FinalCriticalRate: 0.1 * 100,
    };
    const g = (k: string) => baseMap[k] ?? 0;
    const affinity = calcAffinityDamage(g);
    const explained = explainCalcExpectedNormal(g, affinity);
    const expected = calcExpectedNormal(g, affinity);
    expect(explained.P).toBeCloseTo(1, 6);
    expect(expected).toBeCloseTo(explained.precision, 6);
  });

  it("normalizes A+C > 1 via scale", () => {
    const baseMap: Record<string, number> = {
      MinPhysicalAttack: 100,
      MaxPhysicalAttack: 200,
      PhysicalPenetration: 0,
      PhysicalDMGBonus: 0,
      MINAttributeAttackOfOtherType: 0,
      MAXAttributeAttackOfOtherType: 0,
      PhysicalAttackMultiplier: 100,
      FlatDamage: 0,
      MINAttributeAttackOfYOURType: 0,
      MAXAttributeAttackOfYOURType: 0,
      MainElementMultiplier: 100,
      AttributeAttackPenetrationOfYOURType: 0,
      AttributeAttackDMGBonusOfYOURType: 0,
      CriticalDMGBonus: 50,
      AffinityDMGBonus: 0,
      DamageBoost: 0,
      CombatBoostAgainstBossUnits: 0,
      PrecisionRate: 50,
      FinalAffinityRate: 0.7 * 100,
      FinalCriticalRate: 0.6 * 100,
    };
    const g = (k: string) => baseMap[k] ?? 0;
    const affinity = calcAffinityDamage(g);
    const explained = explainCalcExpectedNormal(g, affinity);
    // A + C = 1.3 -> scale = 1 / 1.3
    expect(explained.scale).toBeCloseTo(1 / (0.7 + 0.6), 6);
    // After scaling, As + Cs should equal 1 (within float eps)
    expect(explained.As + explained.Cs).toBeCloseTo(1, 6);
  });
});
