import { clamp01 } from "./clamp";

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

  const Pp = clamp01(g("PrecisionRate") / 100);
  const PcRaw = clamp01(g("CriticalRate") / 100);
  const PaRaw = clamp01(g("AffinityRate") / 100);

  const scale = PcRaw + PaRaw > 1 ? 1 / (PcRaw + PaRaw) : 1;

  return (
    base +
    Pp * PcRaw * scale * base * (g("CriticalDMGBonus") / 100) +
    Pp * PaRaw * scale * (affinityDamage - base)
  );
};
