import { GearSlot, InputStats } from "./types";

/* =======================
   Stat groups (UI only)
======================= */

export const STAT_GROUPS: Record<string, (keyof InputStats)[]> = {
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

/* =======================
   Gear slots
======================= */

export const GEAR_SLOTS: {
  key: GearSlot;
  label: string;
  icon: string; // image key (future)
}[] = [
  { key: "weapon_1", label: "Weapon I", icon: "weapon" },
  { key: "weapon_2", label: "Weapon II", icon: "weapon" },
  { key: "ring", label: "Ring", icon: "ring" },
  { key: "talisman", label: "Talisman", icon: "talisman" },
  { key: "head", label: "Head", icon: "head" }, // paint
  { key: "chest", label: "Chest", icon: "chest" },
  { key: "hand", label: "Hand", icon: "hand" },
  { key: "leg", label: "Leg", icon: "leg" },
];
