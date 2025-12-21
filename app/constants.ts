// app\constants.ts
import { GearSlot, InputStats } from "./types";

export const ELEMENT_TYPES = [
  { key: "bellstrike", label: "Bellstrike" },
  { key: "stonesplit", label: "Stonesplit" },
  { key: "silkbind", label: "Silkbind" },
  { key: "bamboocut", label: "Bamboocut" },
] as const;

export type ElementKey = (typeof ELEMENT_TYPES)[number]["key"];

export const ELEMENT_DEFAULTS: Record<
  ElementKey,
  { min: number; max: number; penetration: number; bonus: number }
> = {
  bellstrike: { min: 100, max: 300, penetration: 3.1, bonus: 1.6 },
  stonesplit: { min: 10, max: 30, penetration: 0, bonus: 0 },
  silkbind: { min: 10, max: 30, penetration: 0, bonus: 0 },
  bamboocut: { min: 10, max: 30, penetration: 0, bonus: 0 },
};

const ELEMENT_STAT_KEYS = ELEMENT_TYPES.flatMap(({ key }) => [
  `${key}Min`,
  `${key}Max`,
  `${key}Penetration`,
  `${key}DMGBonus`,
]) as (keyof InputStats)[];

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
  Element: ["MainElementMultiplier", ...ELEMENT_STAT_KEYS],
  Rates: [
    "PrecisionRate",
    "CriticalRate",
    "CriticalDMGBonus",
    "AffinityRate",
    "AffinityDMGBonus",
    "DamageBoost",
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

export const STAT_LABELS: Partial<Record<keyof InputStats | string, string>> = {
  // ---- Core ----
  MinPhysicalAttack: "Min Physical Attack",
  MaxPhysicalAttack: "Max Physical Attack",
  PhysicalAttackMultiplier: "Physical ATK Multiplier",
  FlatDamage: "Flat Damage",

  // ---- Rates ----
  PrecisionRate: "Precision Rate",
  CriticalRate: "Critical Rate",
  CriticalDMGBonus: "Critical DMG",
  AffinityRate: "Affinity Rate",
  AffinityDMGBonus: "Affinity DMG",

  // ---- Defense ----
  HP: "Max HP",
  PhysicalDefense: "Physical Defense",
  PhysicalResistance: "Physical Resistance",
  PhysicalDMGReduction: "Physical DMG Reduction",

  // ---- Element (generic parts) ----
  Min: "Min",
  Max: "Max",
  Penetration: "Penetration",
  DMGBonus: "DMG Bonus",
  DamageBoost: "Damage Boost",
};
