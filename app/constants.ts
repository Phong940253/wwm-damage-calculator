export const STAT_GROUPS: Record<string, string[]> = {
  Core: [
    "MinPhysicalAttack",
    "MaxPhysicalAttack",
    "PhysicalAttackMultiplier",
    "FlatDamage",
  ],
  Element: [
    "MINAttributeAttackOfYOURType",
    "MAXAttributeAttackOfYOURType",
    "MainElementMultiplier",
    "AttributeAttackPenetrationOfYOURType",
    "AttributeAttackDMGBonusOfYOURType",
  ],
  Secondary: [
    "MINAttributeAttackOfOtherType",
    "MAXAttributeAttackOfOtherType",
  ],
  Rates: [
    "PrecisionRate",
    "CriticalRate",
    "CriticalDMGBonus",
    "AffinityRate",
    "AffinityDMGBonus",
  ],
  Defense: [
    "HP",
    "PhysicalDefense",
    "PhysicalResistance",
    "PhysicalDMGReduction",
  ],
};

export const GEAR_SLOTS = [
  "weapon_1",
  "weapon_2",
  "ring",
  "talisman",
  "head",
  "chest",
  "hand",
  "leg",
] as const;
