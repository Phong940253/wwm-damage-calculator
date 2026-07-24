import { describe, it, expect } from "vitest";
import { calculateDamage } from "@/app/domain/damage/damageCalculator";
import type { DamageContext } from "@/app/domain/damage/damageContext";
import { gpuCalculateDamage, STAT_COUNT, SI } from "@/app/workers/gpuFormula";
import { verifyGpuFormulaAgainstCpu } from "@/app/workers/gearOptimize.gpu";
import { encodeStatArray } from "@/app/workers/gpuFormula";

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Build a mock DamageContext.get from a 24-element stat array */
function mockContextFromArray(arr: Float32Array): DamageContext {
  const STAT_KEY_MAP: Record<string, number> = {
    MinPhysicalAttack: SI.MinPhysAtk,
    MaxPhysicalAttack: SI.MaxPhysAtk,
    PhysicalPenetration: SI.PhysPen,
    PhysicalAttackMultiplier: SI.PhysMul,
    MINAttributeAttackOfOtherType: SI.MinOtherAttr,
    MAXAttributeAttackOfOtherType: SI.MaxOtherAttr,
    FlatDamage: SI.FlatDmg,
    MINAttributeAttackOfYOURType: SI.MinYourAttr,
    MAXAttributeAttackOfYOURType: SI.MaxYourAttr,
    MainElementMultiplier: SI.EleMul,
    AttributeAttackPenetrationOfYOURType: SI.ElePen,
    AttributeAttackDMGBonusOfYOURType: SI.AttrDmgBonus,
    PhysicalDMGBonus: SI.PhysDmgBonus,
    DamageBoost: SI.DmgBoost,
    CombatBoostAgainstBossUnits: SI.BossDmgBoost,
    FamilyDMGBoost: SI.FamilyDmgBonus,
    CriticalDMGBonus: SI.CritDmgBonus,
    AffinityDMGBonus: SI.AffinityDmgBonus,
    BossDef: SI.BossDef,
    SkillPhysicalMultiplier: SI.SkillPhysMult,
    SkillElementMultiplier: SI.SkillElemMult,
    PrecisionRate: SI.PrecisionRate,
    FinalAffinityRate: SI.FinalAffinityRate,
    FinalCriticalRate: SI.FinalCriticalRate,
  };

  return {
    get: (key: string): number => {
      const idx = STAT_KEY_MAP[key];
      if (idx !== undefined) return arr[idx];
      // Fallback: try treating as number stat
      const fallback: Record<string, number> = {};
      return fallback[key] ?? 0;
    },
  };
}

/** Generate a random realistic stat array */
function randomStatArray(): Float32Array {
  const arr = new Float32Array(STAT_COUNT);
  const minAtk = randomInRange(500, 5000);
  arr[SI.MinPhysAtk] = minAtk;
  arr[SI.MaxPhysAtk] = minAtk + randomInRange(100, 3000);
  arr[SI.PhysPen] = randomInRange(0, 2000);
  arr[SI.PhysMul] = randomInRange(50, 250);
  arr[SI.MinOtherAttr] = randomInRange(0, 500);
  arr[SI.MaxOtherAttr] = arr[SI.MinOtherAttr] + randomInRange(0, 500);
  arr[SI.FlatDmg] = randomInRange(0, 500);
  arr[SI.MinYourAttr] = randomInRange(100, 3000);
  arr[SI.MaxYourAttr] = arr[SI.MinYourAttr] + randomInRange(0, 1000);
  arr[SI.EleMul] = randomInRange(50, 200);
  arr[SI.ElePen] = randomInRange(0, 2000);
  arr[SI.AttrDmgBonus] = randomInRange(0, 200);
  arr[SI.PhysDmgBonus] = randomInRange(0, 200);
  arr[SI.DmgBoost] = randomInRange(0, 100);
  arr[SI.BossDmgBoost] = randomInRange(0, 50);
  arr[SI.FamilyDmgBonus] = randomInRange(0, 30);
  arr[SI.CritDmgBonus] = randomInRange(0, 300);
  arr[SI.AffinityDmgBonus] = randomInRange(0, 200);
  arr[SI.BossDef] = randomInRange(0, 3000);
  arr[SI.SkillPhysMult] = 1;
  arr[SI.SkillElemMult] = 1;
  arr[SI.PrecisionRate] = randomInRange(0, 100);
  arr[SI.FinalAffinityRate] = Math.min(randomInRange(0, 60), 40);
  arr[SI.FinalCriticalRate] = Math.min(randomInRange(0, 100), 80);
  return arr;
}

describe("gpuCalculateDamage vs calculateDamage", () => {
  it("matches CPU calculateDamage for 1000 random inputs (within 0.001 tolerance)", () => {
    const tolerance = 0.001;
    // Run multiple iterations for thorough testing
    for (let iter = 0; iter < 1000; iter++) {
      const arr = randomStatArray();
      const ctx = mockContextFromArray(arr);
      const gpuDmg = gpuCalculateDamage(arr);
      const cpuDmg = calculateDamage(ctx).normal;

      // Both should be finite positive numbers
      expect(Number.isFinite(gpuDmg)).toBe(true);
      expect(Number.isFinite(cpuDmg)).toBe(true);
      expect(gpuDmg).toBeGreaterThanOrEqual(0);
      expect(cpuDmg).toBeGreaterThanOrEqual(0);

      // Should match within tolerance
      const diff = Math.abs(gpuDmg - cpuDmg);
      const maxVal = Math.max(gpuDmg, cpuDmg, 1);
      if (diff / maxVal > tolerance) {
        // Print details for debugging
        console.log(`Mismatch at iter ${iter}: GPU=${gpuDmg} CPU=${cpuDmg} diff=${diff} rel=${diff / maxVal}`);
        console.log("Stat array:", Array.from(arr));
      }
      expect(diff / maxVal).toBeLessThanOrEqual(tolerance);
    }
  });

  it("produces consistent results for edge cases", () => {
    // Zero stats
    const zeroArr = new Float32Array(STAT_COUNT);
    zeroArr[SI.SkillPhysMult] = 1;
    zeroArr[SI.SkillElemMult] = 1;
    const zeroCtx = mockContextFromArray(zeroArr);
    const gpuZero = gpuCalculateDamage(zeroArr);
    const cpuZero = calculateDamage(zeroCtx).normal;
    expect(gpuZero).toBeCloseTo(cpuZero, 6);

    // Very large stats
    const largeArr = new Float32Array(STAT_COUNT);
    largeArr[SI.MinPhysAtk] = 100000;
    largeArr[SI.MaxPhysAtk] = 150000;
    largeArr[SI.PhysMul] = 300;
    largeArr[SI.EleMul] = 200;
    largeArr[SI.MinYourAttr] = 50000;
    largeArr[SI.MaxYourAttr] = 80000;
    largeArr[SI.SkillPhysMult] = 1;
    largeArr[SI.SkillElemMult] = 1;
    const largeCtx = mockContextFromArray(largeArr);
    const gpuLarge = gpuCalculateDamage(largeArr);
    const cpuLarge = calculateDamage(largeCtx).normal;
    const largeDiff = Math.abs(gpuLarge - cpuLarge) / Math.max(gpuLarge, cpuLarge, 1);
    expect(largeDiff).toBeLessThanOrEqual(0.001);
  });

  it("verifyGpuFormulaAgainstCpu passes", () => {
    expect(verifyGpuFormulaAgainstCpu(50)).toBe(true);
  });
});

describe("encodeStatArray", () => {
  it("builds valid stat array from partial inputs", () => {
    const stats = { Agility: { current: 100, increase: 0 } };
    const elementStats = {
      bellstrikeMin: { current: 200, increase: 0 },
      bellstrikeMax: { current: 500, increase: 0 },
      bellstrikePenetration: { current: 50, increase: 0 },
      bellstrikeDMGBonus: { current: 10, increase: 0 },
      MainElementMultiplier: { current: 100, increase: 0 },
    };
    const gearBonus: Record<string, number> = {};
    const result = encodeStatArray(
      stats as any,
      elementStats as any,
      gearBonus,
      "bellstrike",
      100,
      0.2,
    );
    expect(result.length).toBe(STAT_COUNT);
    expect(Number.isFinite(result[SI.MinPhysAtk])).toBe(true);
    // Agility * 0.9 derived stat (no base stat or gear)
    expect(result[SI.MinPhysAtk]).toBe(90);
    expect(result[SI.SkillPhysMult]).toBe(1); // default
    expect(result[SI.SkillElemMult]).toBe(1); // default
    expect(result[SI.MinOtherAttr]).toBe(0); // no other elements with data
    expect(result[SI.BossDef]).toBe(100);
  });

  it("handles gear bonus correctly", () => {
    const stats = { MinPhysicalAttack: { current: 100, increase: 0 } };
    const elementStats: any = {};
    const gearBonus = { MinPhysicalAttack: 50 };
    const result = encodeStatArray(
      stats as any,
      elementStats as any,
      gearBonus,
      "bellstrike",
      200,
      0,
    );
    // MinPhysAtk should be cur + gear
    expect(result[SI.MinPhysAtk]).toBe(150);
  });
});
