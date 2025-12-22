import { clamp01 } from "./clamp";

/* =========================
   Minimum Damage
========================= */
export const calcMinimumDamage = (g: (k: string) => number) => {
  const dmg =
    ((g("MinPhysicalAttack") *
      (1 + g("PhysicalPenetration") / 200) *
      (1 + g("PhysicalDMGBonus")) +
      g("MINAttributeAttackOfOtherType")) *
      (g("PhysicalAttackMultiplier") / 100) +
      g("FlatDamage") +
      g("MINAttributeAttackOfYOURType") *
        (g("MainElementMultiplier") / 100) *
        (1 +
          g("AttributeAttackPenetrationOfYOURType") / 200 +
          g("AttributeAttackDMGBonusOfYOURType") / 100)) *
    1.02 *
    (1 + g("DamageBoost") / 100);

  return Math.round(dmg * 10) / 10;
};

/* =========================
   Critical (Max) Damage
========================= */
export const calcCriticalDamage = (g: (k: string) => number) =>
  ((g("MaxPhysicalAttack") *
    (1 + g("PhysicalPenetration") / 200) *
    (1 + g("PhysicalDMGBonus")) +
    Math.max(
      g("MINAttributeAttackOfOtherType"),
      g("MAXAttributeAttackOfOtherType")
    )) *
    (g("PhysicalAttackMultiplier") / 100) +
    g("FlatDamage") +
    g("MAXAttributeAttackOfYOURType") *
      (g("MainElementMultiplier") / 100) *
      (1 +
        g("AttributeAttackPenetrationOfYOURType") / 200 +
        g("AttributeAttackDMGBonusOfYOURType") / 100)) *
  (1 + g("CriticalDMGBonus") / 100) *
  (1 + g("DamageBoost") / 100);

/* =========================
   Affinity (Max) Damage
========================= */
export const calcAffinityDamage = (g: (k: string) => number) =>
  ((g("MaxPhysicalAttack") *
    (1 + g("PhysicalPenetration") / 200) *
    (1 + g("PhysicalDMGBonus")) +
    Math.max(
      g("MINAttributeAttackOfOtherType"),
      g("MAXAttributeAttackOfOtherType")
    )) *
    (g("PhysicalAttackMultiplier") / 100) +
    g("FlatDamage") +
    g("MAXAttributeAttackOfYOURType") *
      (g("MainElementMultiplier") / 100) *
      (1 +
        g("AttributeAttackPenetrationOfYOURType") / 200 +
        g("AttributeAttackDMGBonusOfYOURType") / 100)) *
  (1 + g("AffinityDMGBonus") / 100) *
  (1 + g("DamageBoost") / 100);

/* =========================
   Expected Average Damage
========================= */
export const calcExpectedNormal = (
  g: (k: string) => number,
  affinityDamage: number
) => {
  const base =
    ((((g("MinPhysicalAttack") + g("MaxPhysicalAttack")) *
      (1 + g("PhysicalPenetration") / 200) *
      (1 + g("PhysicalDMGBonus")) +
      (g("MINAttributeAttackOfOtherType") >= g("MAXAttributeAttackOfOtherType")
        ? g("MINAttributeAttackOfOtherType") * 2
        : g("MINAttributeAttackOfOtherType") +
          g("MAXAttributeAttackOfOtherType"))) /
      2) *
      (g("PhysicalAttackMultiplier") / 100) +
      g("FlatDamage") +
      ((g("MINAttributeAttackOfYOURType") + g("MAXAttributeAttackOfYOURType")) /
        2) *
        (g("MainElementMultiplier") / 100) *
        (1 +
          g("AttributeAttackPenetrationOfYOURType") / 200 +
          g("AttributeAttackDMGBonusOfYOURType") / 100)) *
    (1 + g("DamageBoost") / 100);

  const minDamage = calcMinimumDamage(g);
  const maxDamage = affinityDamage;

  const P = clamp01(g("PrecisionRate") / 100);
  const A = clamp01(g("AffinityRate") / 100);
  const C = clamp01(g("CriticalRate") / 100);
  const CD = g("CriticalDMGBonus") / 100;

  // Ensure probabilities are valid
  const scale = A + C > 1 ? 1 / (A + C) : 1;
  const As = A * scale;
  const Cs = C * scale;

  // ❌ Not Precision
  const noPrecision = As * maxDamage + (1 - As) * minDamage;

  // ✅ Precision
  const precision =
    As * maxDamage + Cs * maxDamage * (1 + CD) + (1 - As - Cs) * base;

  return (1 - P) * noPrecision + P * precision;
};
