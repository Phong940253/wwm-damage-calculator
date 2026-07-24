export const STAT_COUNT = 24;

export const SI = {
  MinPhysAtk: 0,
  MaxPhysAtk: 1,
  PhysPen: 2,
  PhysMul: 3,
  MinOtherAttr: 4,
  MaxOtherAttr: 5,
  FlatDmg: 6,
  MinYourAttr: 7,
  MaxYourAttr: 8,
  EleMul: 9,
  ElePen: 10,
  AttrDmgBonus: 11,
  PhysDmgBonus: 12,
  DmgBoost: 13,
  BossDmgBoost: 14,
  FamilyDmgBonus: 15,
  CritDmgBonus: 16,
  AffinityDmgBonus: 17,
  BossDef: 18,
  SkillPhysMult: 19,
  SkillElemMult: 20,
  PrecisionRate: 21,
  FinalAffinityRate: 22,
  FinalCriticalRate: 23,
} as const;

export const DAMAGE_CACHE_KEYS: readonly (keyof typeof SI)[] = [
  "MinPhysAtk", "MaxPhysAtk", "PhysPen", "PhysMul",
  "MinOtherAttr", "MaxOtherAttr", "FlatDmg",
  "MinYourAttr", "MaxYourAttr", "EleMul", "ElePen", "AttrDmgBonus",
  "PhysDmgBonus", "DmgBoost", "BossDmgBoost", "FamilyDmgBonus",
  "CritDmgBonus", "AffinityDmgBonus", "BossDef",
  "SkillPhysMult", "SkillElemMult",
];

export const CACHE_STAT_COUNT = 21;

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function calcPhysComp(
  physAtk: number, otherAttr: number,
  skillPhysMult: number, mul: number, pen: number, dmgBonus: number, flat: number,
): number {
  return (physAtk + otherAttr) * skillPhysMult * (mul / 100) * (1 + pen / 173) * (1 + dmgBonus / 100) + flat;
}

export function calcEleComp(
  attr: number, skillElemMult: number, mul: number, pen: number, dmgBonus: number,
): number {
  return attr * skillElemMult * (mul / 100) * (1 + pen / 173) * (1 + dmgBonus / 100);
}

export function calcBaseDamage(arr: Float32Array): number {
  const physComp = calcPhysComp(arr[0], arr[4], arr[19], arr[3], arr[2], arr[12], arr[6]);
  const eleComp = calcEleComp(arr[7], arr[20], arr[9], arr[10], arr[11]);
  return Math.max(0, physComp - arr[18]) + eleComp;
}

export function gpuCalcMinimumDamage(arr: Float32Array): number {
  const base = calcBaseDamage(arr);
  const familyMult = 1 + arr[15] / 100;
  const dmgBonusTotal = arr[13] + arr[14];
  const dmgMult = 1 + dmgBonusTotal / 100;
  return base * familyMult * dmgMult;
}

export function gpuCalcCriticalDamage(arr: Float32Array): number {
  const otherMax = Math.max(arr[4], arr[5]);
  const physComp = calcPhysComp(arr[1], otherMax, arr[19], arr[3], arr[2], arr[12], arr[6]);
  const eleComp = calcEleComp(arr[8], arr[20], arr[9], arr[10], arr[11]);
  const base = Math.max(0, physComp - arr[18]) + eleComp;
  const familyMult = 1 + arr[15] / 100;
  const dmgBonusTotal = arr[13] + arr[14];
  const dmgMult = 1 + dmgBonusTotal / 100;
  return base * familyMult * dmgMult * (1 + arr[16] / 100);
}

export function gpuCalcAffinityDamage(arr: Float32Array): number {
  const otherMax = Math.max(arr[4], arr[5]);
  const physComp = calcPhysComp(arr[1], otherMax, arr[19], arr[3], arr[2], arr[12], arr[6]);
  const eleComp = calcEleComp(arr[8], arr[20], arr[9], arr[10], arr[11]);
  const base = Math.max(0, physComp - arr[18]) + eleComp;
  const familyMult = 1 + arr[15] / 100;
  const dmgBonusTotal = arr[13] + arr[14];
  const dmgMult = 1 + dmgBonusTotal / 100;
  return base * familyMult * dmgMult * (1 + arr[17] / 100);
}

export function gpuCalcExpectedNormal(arr: Float32Array, affinityDamage: number): number {
  const avgPhysAtk = (arr[0] + arr[1]) / 2;
  const avgOtherAttr = arr[4] >= arr[5] ? arr[4] : (arr[4] + arr[5]) / 2;
  const avgYourAttr = (arr[7] + arr[8]) / 2;

  const avgPhysComp = calcPhysComp(avgPhysAtk, avgOtherAttr, arr[19], arr[3], arr[2], arr[12], arr[6]);
  const avgEleComp = calcEleComp(avgYourAttr, arr[20], arr[9], arr[10], arr[11]);
  const base = Math.max(0, avgPhysComp - arr[18]) + avgEleComp;

  const familyMult = 1 + arr[15] / 100;
  const dmgBonusTotal = arr[13] + arr[14];
  const dmgMult = 1 + dmgBonusTotal / 100;
  const baseHit = base * familyMult * dmgMult;

  const minDamage = gpuCalcMinimumDamage(arr);
  const maxDamage = affinityDamage;

  const P = clamp01(arr[21] / 100);
  const A = clamp01(arr[22] / 100);
  const C = clamp01(arr[23] / 100);
  const CD = arr[16] / 100;

  const scale = A + C > 1 ? 1 / (A + C) : 1;
  const As = A * scale;
  const Cs = C * scale;

  const critHit = baseHit * (1 + CD);

  const noPrecision = As * maxDamage + (1 - As) * minDamage;
  const precision = As * maxDamage + Cs * critHit + (1 - As - Cs) * baseHit;

  return (1 - P) * noPrecision + P * precision;
}

export function gpuCalculateDamage(arr: Float32Array): number {
  const affinity = gpuCalcAffinityDamage(arr);
  return gpuCalcExpectedNormal(arr, affinity);
}

/* ====================================
   CPU-side stat array encoder
   Builds the 24-element Float32Array from gear bonus + context.
   This is the CPU-to-GPU bridge: one call per combination.
==================================== */

type ElementStatSuffix = "Min" | "Max" | "Penetration" | "DMGBonus";

function elementKey(element: string, suffix: ElementStatSuffix): string {
  return `${element}${suffix}`;
}

export function encodeStatArray(
  stats: Record<string, { current: number; increase: number }>,
  elementStats: Record<string, { current: number; increase: number }>,
  gearBonus: Record<string, number>,
  selectedElement: string,
  bossDef: number,
  bossResistancePct: number,
): Float32Array {
  const AFFINITY_RATE_CAP_PCT = 40;
  const CRITICAL_RATE_CAP_PCT = 80;

  const cur = (k: string): number => {
    const s = stats[k];
    const base = s ? Number(s.current) + Number(s.increase) : 0;
    return base + (gearBonus[k] || 0);
  };

  const ele = (k: string): number => {
    const s = elementStats[k];
    const base = s ? Number(s.current) + Number(s.increase) : 0;
    return base + (gearBonus[k] || 0);
  };

  const agility = cur("Agility");
  const power = cur("Power");
  const momentum = cur("Momentum");

  const derivedMinAtk = agility * 0.9 + power * 0.22;
  const derivedMaxAtk = momentum * 0.9 + power * 1.36;
  const derivedCritRate = agility * 0.076;
  const derivedAffinityRate = momentum * 0.038;

  const applyResistToRate = (basePct: number) => basePct * (1 - bossResistancePct);
  const applyResistToPrecision = (basePct: number) => 65 + (basePct - 65) * (1 - bossResistancePct);

  const YOUR_MIN = ele(elementKey(selectedElement, "Min"));
  const YOUR_MAX = ele(elementKey(selectedElement, "Max"));
  const YOUR_PEN = ele(elementKey(selectedElement, "Penetration"));
  const YOUR_DMG = ele(elementKey(selectedElement, "DMGBonus"));
  const ELE_MUL = ele("MainElementMultiplier");

  const otherElements = ["bellstrike", "stonesplit", "silkbind", "bamboocut", "void"]
    .filter((e) => e !== selectedElement);

  const otherMinSum = otherElements.reduce((sum, e) => sum + ele(elementKey(e, "Min")), 0);
  const otherMaxSum = otherElements.reduce((sum, e) => {
    const min = ele(elementKey(e, "Min"));
    const max = ele(elementKey(e, "Max"));
    return sum + Math.max(max, min);
  }, 0);

  const out = new Float32Array(STAT_COUNT);

  out[SI.MinPhysAtk] = cur("MinPhysicalAttack") + derivedMinAtk;
  out[SI.MaxPhysAtk] = cur("MaxPhysicalAttack") + derivedMaxAtk;
  out[SI.PhysPen] = cur("PhysicalPenetration");
  out[SI.PhysMul] = cur("PhysicalAttackMultiplier");
  out[SI.MinOtherAttr] = otherMinSum;
  out[SI.MaxOtherAttr] = otherMaxSum;
  out[SI.FlatDmg] = cur("FlatDamage");
  out[SI.MinYourAttr] = YOUR_MIN;
  out[SI.MaxYourAttr] = YOUR_MAX;
  out[SI.EleMul] = ELE_MUL;
  out[SI.ElePen] = YOUR_PEN;
  out[SI.AttrDmgBonus] = YOUR_DMG;
  out[SI.PhysDmgBonus] = cur("PhysicalDMGBonus");
  out[SI.DmgBoost] = cur("DamageBoost");
  out[SI.BossDmgBoost] = cur("CombatBoostAgainstBossUnits");
  out[SI.FamilyDmgBonus] = cur("FamilyDMGBoost");
  out[SI.CritDmgBonus] = cur("CriticalDMGBonus");
  out[SI.AffinityDmgBonus] = cur("AffinityDMGBonus");
  out[SI.BossDef] = bossDef;
  out[SI.SkillPhysMult] = cur("SkillPhysicalMultiplier") || 1;
  out[SI.SkillElemMult] = cur("SkillElementMultiplier") || 1;

  const precisionBase = cur("PrecisionRate");
  out[SI.PrecisionRate] = applyResistToPrecision(precisionBase);

  const affinityBase = cur("AffinityRate") + derivedAffinityRate;
  const directAffinity = cur("DirectAffinityRate");
  out[SI.FinalAffinityRate] = Math.min(applyResistToRate(affinityBase), AFFINITY_RATE_CAP_PCT) + directAffinity;

  const critBase = cur("CriticalRate") + derivedCritRate;
  const directCrit = cur("DirectCriticalRate");
  out[SI.FinalCriticalRate] = Math.min(applyResistToRate(critBase), CRITICAL_RATE_CAP_PCT) + directCrit;

  return out;
}
