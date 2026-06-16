import { clamp01 } from "@/app/utils/clamp";

type DamageCache = Record<string, number>;

const buildDamageCache = (g: (k: string) => number): DamageCache => {
  const $ = (k: string) => { const v = g(k); return Number.isFinite(v) ? v : 0; };
  return {
    minPhysAtk: $("MinPhysicalAttack"),
    maxPhysAtk: $("MaxPhysicalAttack"),
    physPen: $("PhysicalPenetration"),
    physMul: $("PhysicalAttackMultiplier"),
    minOtherAttr: $("MINAttributeAttackOfOtherType"),
    maxOtherAttr: $("MAXAttributeAttackOfOtherType"),
    flatDmg: $("FlatDamage"),
    minYourAttr: $("MINAttributeAttackOfYOURType"),
    maxYourAttr: $("MAXAttributeAttackOfYOURType"),
    eleMul: $("MainElementMultiplier"),
    elePen: $("AttributeAttackPenetrationOfYOURType"),
    attrDmgBonus: $("AttributeAttackDMGBonusOfYOURType"),
    physDmgBonus: $("PhysicalDMGBonus"),
    dmgBoost: $("DamageBoost"),
    bossDmgBoost: $("CombatBoostAgainstBossUnits"),
    familyDmgBonus: $("FamilyDMGBoost"),
    critDmgBonus: $("CriticalDMGBonus"),
    affinityDmgBonus: $("AffinityDMGBonus"),
    bossDef: $("BossDef"),
  };
};

/* =========================
   Core calculation helpers
========================= */

const calcPhysComp = (
  physAtk: number,
  otherAttr: number,
  mul: number,
  pen: number,
  dmgBonus: number,
  flat: number,
): number => {
  return (physAtk + otherAttr) * (mul / 100) * (1 + pen / 173) * (1 + dmgBonus / 100) + flat;
};

const calcEleComp = (
  attr: number,
  mul: number,
  pen: number,
  dmgBonus: number,
): number => {
  const raw = attr * (mul / 100) * (1 + pen / 173);
  return raw * (1 + dmgBonus / 100);
};

const calcBaseDamage = (
  physAtk: number,
  otherAttr: number,
  yourAttr: number,
  cache: DamageCache,
): number => {
  const physComp = calcPhysComp(physAtk, otherAttr, cache.physMul, cache.physPen, cache.physDmgBonus, cache.flatDmg);
  const eleComp = calcEleComp(yourAttr, cache.eleMul, cache.elePen, cache.attrDmgBonus);
  const basePhys = Math.max(0, physComp - cache.bossDef);
  return basePhys + eleComp;
};

/* =========================
   Minimum Damage
========================= */

export const calcMinimumDamage = (g: (k: string) => number) => {
  const cache = buildDamageCache(g);
  const base = calcBaseDamage(cache.minPhysAtk, cache.minOtherAttr, cache.minYourAttr, cache);

  const dmgBonusTotal = cache.dmgBoost + cache.bossDmgBoost;
  const familyMult = 1 + cache.familyDmgBonus / 100;
  const dmgMult = 1 + dmgBonusTotal / 100;

  return base * familyMult * dmgMult;
};

/* =========================
   Critical Damage
========================= */

export const calcCriticalDamage = (g: (k: string) => number) => {
  const cache = buildDamageCache(g);
  const otherMax = Math.max(cache.minOtherAttr, cache.maxOtherAttr);
  const base = calcBaseDamage(cache.maxPhysAtk, otherMax, cache.maxYourAttr, cache);

  const dmgBonusTotal = cache.dmgBoost + cache.bossDmgBoost;
  const familyMult = 1 + cache.familyDmgBonus / 100;
  const dmgMult = 1 + dmgBonusTotal / 100;

  return base * familyMult * dmgMult * (1 + cache.critDmgBonus / 100);
};

/* =========================
   Affinity Damage
========================= */

export const calcAffinityDamage = (g: (k: string) => number) => {
  const cache = buildDamageCache(g);
  const otherMax = Math.max(cache.minOtherAttr, cache.maxOtherAttr);
  const base = calcBaseDamage(cache.maxPhysAtk, otherMax, cache.maxYourAttr, cache);

  const dmgBonusTotal = cache.dmgBoost + cache.bossDmgBoost;
  const familyMult = 1 + cache.familyDmgBonus / 100;
  const dmgMult = 1 + dmgBonusTotal / 100;

  return base * familyMult * dmgMult * (1 + cache.affinityDmgBonus / 100);
};

/* =========================
   Expected Average Damage
========================= */

export const calcExpectedNormal = (
  g: (k: string) => number,
  affinityDamage: number,
) => {
  const cache = buildDamageCache(g);

  const avgPhysAtk = (cache.minPhysAtk + cache.maxPhysAtk) / 2;
  const avgOtherAttr =
    cache.minOtherAttr >= cache.maxOtherAttr
      ? cache.minOtherAttr
      : (cache.minOtherAttr + cache.maxOtherAttr) / 2;
  const avgYourAttr = (cache.minYourAttr + cache.maxYourAttr) / 2;
  const base = calcBaseDamage(avgPhysAtk, avgOtherAttr, avgYourAttr, cache);

  const dmgBonusTotal = cache.dmgBoost + cache.bossDmgBoost;
  const familyMult = 1 + cache.familyDmgBonus / 100;
  const dmgMult = 1 + dmgBonusTotal / 100;

  const baseHit = base * familyMult * dmgMult;
  const minDamage = calcMinimumDamage(g);
  const maxDamage = affinityDamage;

  const P = clamp01(g("PrecisionRate") / 100);
  const A = clamp01(g("FinalAffinityRate") / 100);
  const C = clamp01(g("FinalCriticalRate") / 100);
  const CD = cache.critDmgBonus / 100;

  const scale = A + C > 1 ? 1 / (A + C) : 1;
  const As = A * scale;
  const Cs = C * scale;

  const critHit = baseHit * (1 + CD);

  const noPrecision = As * maxDamage + (1 - As) * minDamage;
  const precision =
    As * maxDamage + Cs * critHit + (1 - As - Cs) * baseHit;

  return (1 - P) * noPrecision + P * precision;
};

/* =========================
   Breakdown (UI debug)
========================= */

export const calcExpectedNormalBreakdown = (
  g: (k: string) => number,
  affinityDamage: number,
) => {
  const cache = buildDamageCache(g);

  const avgPhysAtk = (cache.minPhysAtk + cache.maxPhysAtk) / 2;
  const avgOtherAttr =
    cache.minOtherAttr >= cache.maxOtherAttr
      ? cache.minOtherAttr
      : (cache.minOtherAttr + cache.maxOtherAttr) / 2;
  const avgYourAttr = (cache.minYourAttr + cache.maxYourAttr) / 2;
  const base = calcBaseDamage(avgPhysAtk, avgOtherAttr, avgYourAttr, cache);

  const dmgBonusTotal = cache.dmgBoost + cache.bossDmgBoost;
  const familyMult = 1 + cache.familyDmgBonus / 100;
  const dmgMult = 1 + dmgBonusTotal / 100;

  const baseHit = base * familyMult * dmgMult;
  const minDamage = calcMinimumDamage(g);
  const maxDamage = affinityDamage;

  const P = clamp01(g("PrecisionRate") / 100);
  const A = clamp01(g("FinalAffinityRate") / 100);
  const C = clamp01(g("FinalCriticalRate") / 100);
  const CD = cache.critDmgBonus / 100;

  const scale = A + C > 1 ? 1 / (A + C) : 1;
  const As = A * scale;
  const Cs = C * scale;

  const critHit = baseHit * (1 + CD);

  const abrasionDmg = (1 - P) * (1 - As) * minDamage;
  const affinityDmg = ((1 - P) * As + P * As) * maxDamage;
  const criticalDmg = P * Cs * critHit;
  const normalDmg = P * (1 - As - Cs) * baseHit;

  return {
    abrasion: abrasionDmg,
    affinity: affinityDmg,
    critical: criticalDmg,
    normal: normalDmg,
  };
};

/* =========================
   Explain / debug steps
========================= */

export interface CalcExpectedNormalSteps {
  cache: DamageCache;
  dmgBonusTotal: number;
  familyMult: number;
  dmgMult: number;
  avgPhysAtk: number;
  avgOtherAttr: number;
  avgYourAttr: number;
  physComp: number;
  eleComp: number;
  basePhys: number;
  base: number;
  baseHit: number;
  minDamage: number;
  maxDamage: number;
  P_raw: number;
  A_raw: number;
  C_raw: number;
  P: number;
  A: number;
  C: number;
  CD: number;
  scale: number;
  As: number;
  Cs: number;
  noPrecision: number;
  precision: number;
  expected: number;
}

export const explainCalcExpectedNormal = (
  g: (k: string) => number,
  affinityDamage: number,
): CalcExpectedNormalSteps => {
  const cache = buildDamageCache(g);

  const avgPhysAtk = (cache.minPhysAtk + cache.maxPhysAtk) / 2;
  const avgOtherAttr =
    cache.minOtherAttr >= cache.maxOtherAttr
      ? cache.minOtherAttr
      : (cache.minOtherAttr + cache.maxOtherAttr) / 2;
  const avgYourAttr = (cache.minYourAttr + cache.maxYourAttr) / 2;

  const physComp = calcPhysComp(avgPhysAtk, avgOtherAttr, cache.physMul, cache.physPen, cache.physDmgBonus, cache.flatDmg);
  const eleComp = calcEleComp(avgYourAttr, cache.eleMul, cache.elePen, cache.attrDmgBonus);
  const basePhys = Math.max(0, physComp - cache.bossDef);
  const base = basePhys + eleComp;

  const dmgBonusTotal = cache.dmgBoost + cache.bossDmgBoost;
  const familyMult = 1 + cache.familyDmgBonus / 100;
  const dmgMult = 1 + dmgBonusTotal / 100;

  const baseHit = base * familyMult * dmgMult;
  const minDamage = calcMinimumDamage(g);
  const maxDamage = affinityDamage;

  const P_raw = g("PrecisionRate") / 100;
  const A_raw = g("FinalAffinityRate") / 100;
  const C_raw = g("FinalCriticalRate") / 100;
  const P = clamp01(P_raw);
  const A = clamp01(A_raw);
  const C = clamp01(C_raw);
  const CD = cache.critDmgBonus / 100;

  const scale = A + C > 1 ? 1 / (A + C) : 1;
  const As = A * scale;
  const Cs = C * scale;

  const critHit = baseHit * (1 + CD);

  const noPrecision = As * maxDamage + (1 - As) * minDamage;
  const precision =
    As * maxDamage + Cs * critHit + (1 - As - Cs) * baseHit;

  const expected = (1 - P) * noPrecision + P * precision;

  return {
    cache,
    dmgBonusTotal,
    familyMult,
    dmgMult,
    avgPhysAtk,
    avgOtherAttr,
    avgYourAttr,
    physComp,
    eleComp,
    basePhys,
    base,
    baseHit,
    minDamage,
    maxDamage,
    P_raw,
    A_raw,
    C_raw,
    P,
    A,
    C,
    CD,
    scale,
    As,
    Cs,
    noPrecision,
    precision,
    expected,
  };
};
