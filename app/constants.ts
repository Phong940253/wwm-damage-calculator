// app\constants.ts
import { ElementStats, GearSlot, InputStats } from "./types";

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
  Attributes: ["Body", "Power", "Defense", "Agility", "Momentum"],
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
    "PhysicalPenetration",
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
  // ---- Attributes ----
  Body: "Body",
  Power: "Power",
  Defense: "Defense",
  Agility: "Agility",
  Momentum: "Momentum",

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
  PhysicalPenetration: "Physical Penetration",

  // ---- Element (generic parts) ----
  Min: "Min",
  Max: "Max",
  Penetration: "Penetration",
  DMGBonus: "DMG Bonus",
  DamageBoost: "Damage Boost",
};

/* =========================
   INITIAL BASE STATS
========================= */

export const INITIAL_STATS: InputStats = {
  HP: { current: 50000, increase: 0 },

  MinPhysicalAttack: { current: 500, increase: 0 },
  MaxPhysicalAttack: { current: 1000, increase: 0 },
  PhysicalAttackMultiplier: { current: 326.29, increase: 0 },
  FlatDamage: { current: 378, increase: 0 },

  PrecisionRate: { current: 85, increase: 0 },
  CriticalRate: { current: 35, increase: 0 },
  CriticalDMGBonus: { current: 50, increase: 0 },
  AffinityRate: { current: 25, increase: 0 },
  AffinityDMGBonus: { current: 35, increase: 0 },

  DamageBoost: { current: 0, increase: 0 },

  PhysicalDefense: { current: 179, increase: 0 },
  PhysicalResistance: { current: 1.8, increase: 0 },
  PhysicalDMGBonus: { current: 0, increase: 0 },
  PhysicalDMGReduction: { current: 0, increase: 0 },
  PhysicalPenetration: { current: 10, increase: 0 },

  /* ---------- Attributes ---------- */
  Body: { current: 0, increase: 0 },
  Power: { current: 0, increase: 0 },
  Defense: { current: 0, increase: 0 },
  Agility: { current: 0, increase: 0 },
  Momentum: { current: 0, increase: 0 },
};

/* =========================
   INITIAL ELEMENT STATS
========================= */

export const INITIAL_ELEMENT_STATS: ElementStats = {
  selected: "bellstrike",

  /* ---------- Bellstrike ---------- */
  bellstrikeMin: {
    current: ELEMENT_DEFAULTS.bellstrike.min,
    increase: 0,
  },
  bellstrikeMax: {
    current: ELEMENT_DEFAULTS.bellstrike.max,
    increase: 0,
  },
  bellstrikePenetration: {
    current: ELEMENT_DEFAULTS.bellstrike.penetration,
    increase: 0,
  },
  bellstrikeDMGBonus: {
    current: ELEMENT_DEFAULTS.bellstrike.bonus,
    increase: 0,
  },

  /* ---------- Stonesplit ---------- */
  stonesplitMin: {
    current: ELEMENT_DEFAULTS.stonesplit.min,
    increase: 0,
  },
  stonesplitMax: {
    current: ELEMENT_DEFAULTS.stonesplit.max,
    increase: 0,
  },
  stonesplitPenetration: {
    current: ELEMENT_DEFAULTS.stonesplit.penetration,
    increase: 0,
  },
  stonesplitDMGBonus: {
    current: ELEMENT_DEFAULTS.stonesplit.bonus,
    increase: 0,
  },

  /* ---------- Silkbind ---------- */
  silkbindMin: {
    current: ELEMENT_DEFAULTS.silkbind.min,
    increase: 0,
  },
  silkbindMax: {
    current: ELEMENT_DEFAULTS.silkbind.max,
    increase: 0,
  },
  silkbindPenetration: {
    current: ELEMENT_DEFAULTS.silkbind.penetration,
    increase: 0,
  },
  silkbindDMGBonus: {
    current: ELEMENT_DEFAULTS.silkbind.bonus,
    increase: 0,
  },

  /* ---------- Bamboocut ---------- */
  bamboocutMin: {
    current: ELEMENT_DEFAULTS.bamboocut.min,
    increase: 0,
  },
  bamboocutMax: {
    current: ELEMENT_DEFAULTS.bamboocut.max,
    increase: 0,
  },
  bamboocutPenetration: {
    current: ELEMENT_DEFAULTS.bamboocut.penetration,
    increase: 0,
  },
  bamboocutDMGBonus: {
    current: ELEMENT_DEFAULTS.bamboocut.bonus,
    increase: 0,
  },
};
