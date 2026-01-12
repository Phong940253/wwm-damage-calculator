import { clamp01 } from "@/app/utils/clamp";

/* =========================
   Shared calculation helpers
========================= */

// Cache for frequently accessed values to reduce getter calls
type DamageCache = Record<string, number>;

const buildDamageCache = (g: (k: string) => number): DamageCache => ({
  minPhysAtk: g("MinPhysicalAttack"),
  maxPhysAtk: g("MaxPhysicalAttack"),
  physPenetration: g("PhysicalPenetration"),
  physDmgBonus: g("PhysicalDMGBonus"),
  minOtherAttr: g("MINAttributeAttackOfOtherType"),
  maxOtherAttr: g("MAXAttributeAttackOfOtherType"),
  physAtkMult: g("PhysicalAttackMultiplier"),
  flatDmg: g("FlatDamage"),
  minYourAttr: g("MINAttributeAttackOfYOURType"),
  maxYourAttr: g("MAXAttributeAttackOfYOURType"),
  elementMult: g("MainElementMultiplier"),
  attrPenetration: g("AttributeAttackPenetrationOfYOURType"),
  attrDmgBonus: g("AttributeAttackDMGBonusOfYOURType"),
  critDmgBonus: g("CriticalDMGBonus"),
  affinityDmgBonus: g("AffinityDMGBonus"),
  dmgBoost: g("DamageBoost"),
});

export interface CalcExpectedNormalSteps {
  cache: DamageCache;
  dmgBoost: number;
  physModifier: number;
  physBonus: number;
  elementModifier: number;
  avgPhysAtk: number;
  avgOtherAttr: number;
  avgOtherAttrMode: "min" | "avg";
  avgYourAttr: number;
  base: number;
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
  affinityDamage: number
): CalcExpectedNormalSteps => {
  const cache = buildDamageCache(g);
  const dmgBoost = 1 + cache.dmgBoost / 100;
  const physModifier = 1 + cache.physPenetration / 200;
  const physBonus = 1 + cache.physDmgBonus / 100;
  const elementModifier =
    1 + cache.attrPenetration / 200 + cache.attrDmgBonus / 100;

  const avgPhysAtk = (cache.minPhysAtk + cache.maxPhysAtk) / 2;
  const avgOtherAttrMode: "min" | "avg" =
    cache.minOtherAttr >= cache.maxOtherAttr ? "min" : "avg";
  const avgOtherAttr =
    avgOtherAttrMode === "min"
      ? cache.minOtherAttr
      : (cache.minOtherAttr + cache.maxOtherAttr) / 2;
  const avgYourAttr = (cache.minYourAttr + cache.maxYourAttr) / 2;

  const base =
    ((avgPhysAtk * physModifier * physBonus + avgOtherAttr) *
      (cache.physAtkMult / 100) +
      cache.flatDmg +
      avgYourAttr * (cache.elementMult / 100) * elementModifier) *
    dmgBoost;

  const minDamage = calcMinimumDamage(g);
  const maxDamage = affinityDamage;

  const P_raw = g("PrecisionRate") / 100;
  const A_raw = g("AffinityRate") / 100;
  const C_raw = g("CriticalRate") / 100;
  const P = clamp01(P_raw);
  const A = clamp01(A_raw);
  const C = clamp01(C_raw);
  const CD = g("CriticalDMGBonus") / 100;

  const scale = A + C > 1 ? 1 / (A + C) : 1;
  const As = A * scale;
  const Cs = C * scale;

  const noPrecision = As * maxDamage + (1 - As) * minDamage;
  const precision =
    As * maxDamage + Cs * base * (1 + CD) + (1 - As - Cs) * base;

  const expected = (1 - P) * noPrecision + P * precision;

  return {
    cache,
    dmgBoost,
    physModifier,
    physBonus,
    elementModifier,
    avgPhysAtk,
    avgOtherAttr,
    avgOtherAttrMode,
    avgYourAttr,
    base,
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

/* =========================
   Minimum Damage
========================= */
export const calcMinimumDamage = (g: (k: string) => number) => {
  const cache = buildDamageCache(g);

  const dmg =
    ((cache.minPhysAtk *
      (1 + cache.physPenetration / 200) *
      (1 + cache.physDmgBonus / 100) +
      cache.minOtherAttr) *
      (cache.physAtkMult / 100) +
      cache.flatDmg +
      cache.minYourAttr *
        (cache.elementMult / 100) *
        (1 + cache.attrPenetration / 200 + cache.attrDmgBonus / 100)) *
    1.02 *
    (1 + cache.dmgBoost / 100);

  return Math.round(dmg * 10) / 10;
};

/* =========================
   Critical (Max) Damage
========================= */
export const calcCriticalDamage = (g: (k: string) => number) => {
  const cache = buildDamageCache(g);

  return (
    ((cache.maxPhysAtk *
      (1 + cache.physPenetration / 200) *
      (1 + cache.physDmgBonus / 100) +
      Math.max(cache.minOtherAttr, cache.maxOtherAttr)) *
      (cache.physAtkMult / 100) +
      cache.flatDmg +
      cache.maxYourAttr *
        (cache.elementMult / 100) *
        (1 + cache.attrPenetration / 200 + cache.attrDmgBonus / 100)) *
    (1 + cache.critDmgBonus / 100) *
    (1 + cache.dmgBoost / 100)
  );
};

/* =========================
   Affinity (Max) Damage
========================= */
export const calcAffinityDamage = (g: (k: string) => number) => {
  const cache = buildDamageCache(g);

  return (
    ((cache.maxPhysAtk *
      (1 + cache.physPenetration / 200) *
      (1 + cache.physDmgBonus / 100) +
      Math.max(cache.minOtherAttr, cache.maxOtherAttr)) *
      (cache.physAtkMult / 100) +
      cache.flatDmg +
      cache.maxYourAttr *
        (cache.elementMult / 100) *
        (1 + cache.attrPenetration / 200 + cache.attrDmgBonus / 100)) *
    (1 + cache.affinityDmgBonus / 100) *
    (1 + cache.dmgBoost / 100)
  );
};

/* =========================
   Expected Average Damage
========================= */

// Helper to calculate base damage components (shared by breakdown and expected)
const calcBaseDamageComponents = (g: (k: string) => number) => {
  const cache = buildDamageCache(g);
  const dmgBoost = 1 + cache.dmgBoost / 100;
  const physModifier = 1 + cache.physPenetration / 200;
  const physBonus = 1 + cache.physDmgBonus / 100;
  const elementModifier =
    1 + cache.attrPenetration / 200 + cache.attrDmgBonus / 100;

  const avgPhysAtk = (cache.minPhysAtk + cache.maxPhysAtk) / 2;
  const avgOtherAttr =
    cache.minOtherAttr >= cache.maxOtherAttr
      ? cache.minOtherAttr
      : (cache.minOtherAttr + cache.maxOtherAttr) / 2;
  const avgYourAttr = (cache.minYourAttr + cache.maxYourAttr) / 2;

  return {
    base:
      ((avgPhysAtk * physModifier * physBonus + avgOtherAttr) *
        (cache.physAtkMult / 100) +
        cache.flatDmg +
        avgYourAttr * (cache.elementMult / 100) * elementModifier) *
      dmgBoost,
    cache,
  };
};

export const calcExpectedNormal = (
  g: (k: string) => number,
  affinityDamage: number
) => {
  const cache = buildDamageCache(g);
  const dmgBoost = 1 + cache.dmgBoost / 100;
  const physModifier = 1 + cache.physPenetration / 200;
  const physBonus = 1 + cache.physDmgBonus / 100;
  const elementModifier =
    1 + cache.attrPenetration / 200 + cache.attrDmgBonus / 100;

  // Average physical attack
  const avgPhysAtk = (cache.minPhysAtk + cache.maxPhysAtk) / 2;

  // Average attribute attack from other types
  const avgOtherAttr =
    cache.minOtherAttr >= cache.maxOtherAttr
      ? cache.minOtherAttr
      : (cache.minOtherAttr + cache.maxOtherAttr) / 2;

  // Average attribute attack of your type
  const avgYourAttr = (cache.minYourAttr + cache.maxYourAttr) / 2;

  // Base damage calculation (optimized)
  const base =
    ((avgPhysAtk * physModifier * physBonus + avgOtherAttr) *
      (cache.physAtkMult / 100) +
      cache.flatDmg +
      avgYourAttr * (cache.elementMult / 100) * elementModifier) *
    dmgBoost;

  const minDamage = calcMinimumDamage(g);
  const maxDamage = affinityDamage;

  // Probability calculations with clamping
  const P = clamp01(g("PrecisionRate") / 100);
  const A = clamp01(g("AffinityRate") / 100);
  const C = clamp01(g("CriticalRate") / 100);
  const CD = g("CriticalDMGBonus") / 100;

  // Normalize probabilities if sum exceeds 1
  const scale = A + C > 1 ? 1 / (A + C) : 1;
  const As = A * scale;
  const Cs = C * scale;

  // Without precision: affinity uses max damage, others use min
  const noPrecision = As * maxDamage + (1 - As) * minDamage;

  // With precision: affinity uses max, critical gets bonus, normal uses base
  const precision =
    As * maxDamage + Cs * base * (1 + CD) + (1 - As - Cs) * base;

  return (1 - P) * noPrecision + P * precision;
};

export const calcExpectedNormalBreakdown = (
  g: (k: string) => number,
  affinityDamage: number
) => {
  const minDamage = calcMinimumDamage(g);
  const maxDamage = affinityDamage;

  const { base } = calcBaseDamageComponents(g);

  const P = clamp01(g("PrecisionRate") / 100);
  const A = clamp01(g("AffinityRate") / 100);
  const C = clamp01(g("CriticalRate") / 100);
  const CD = g("CriticalDMGBonus") / 100;

  // Normalize probabilities if sum exceeds 1
  const scale = A + C > 1 ? 1 / (A + C) : 1;
  const As = A * scale;
  const Cs = C * scale;

  // Calculate each damage type contribution
  const abrasionDmg = (1 - P) * (1 - As) * minDamage;
  const affinityDmg = ((1 - P) * As + P * As) * maxDamage;
  const criticalDmg = P * Cs * base * (1 + CD);
  const normalDmg = P * (1 - As - Cs) * base;

  return {
    abrasion: abrasionDmg,
    affinity: affinityDmg,
    critical: criticalDmg,
    normal: normalDmg,
  };
};
