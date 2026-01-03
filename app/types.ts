/* =======================
   Base stat model
======================= */

export interface Stat {
  current: number | "";
  increase: number | "";
}

import { ElementKey } from "./constants";

export interface InputStats {
  [key: string]: Stat;
}

export interface ElementStats {
  selected: ElementKey;
  MainElementMultiplier: Stat;
  bellstrikeMin: Stat;
  bellstrikeMax: Stat;
  bellstrikePenetration: Stat;
  bellstrikeDMGBonus: Stat;
  stonesplitMin: Stat;
  stonesplitMax: Stat;
  stonesplitPenetration: Stat;
  stonesplitDMGBonus: Stat;
  silkbindMin: Stat;
  silkbindMax: Stat;
  silkbindPenetration: Stat;
  silkbindDMGBonus: Stat;
  bamboocutMin: Stat;
  bamboocutMax: Stat;
  bamboocutPenetration: Stat;
  bamboocutDMGBonus: Stat;
}

export type ElementStatSuffix = "Min" | "Max" | "Penetration" | "DMGBonus";

export type ElementStatKey =
  | "bellstrikeMin"
  | "bellstrikeMax"
  | "bellstrikePenetration"
  | "bellstrikeDMGBonus"
  | "stonesplitMin"
  | "stonesplitMax"
  | "stonesplitPenetration"
  | "stonesplitDMGBonus"
  | "silkbindMin"
  | "silkbindMax"
  | "silkbindPenetration"
  | "silkbindDMGBonus"
  | "bamboocutMin"
  | "bamboocutMax"
  | "bamboocutPenetration"
  | "bamboocutDMGBonus"
  | "MainElementMultiplier";

/* =======================
   Gear domain
======================= */

export type GearSlot =
  | "weapon_1"
  | "weapon_2"
  | "disc" // was ring
  | "pendant" // was talisman
  | "head"
  | "chest"
  | "hand"
  | "leg";

/**
 * Single attribute on gear
 * stat must be one of InputStats keys
 */
// app/types.ts
export interface GearAttribute {
  stat: keyof InputStats | ElementStatKey; // ✅ allow element stats
  value: number;
}

/**
 * Custom gear definition
 */
export interface CustomGear {
  id: string;
  name: string;
  slot: GearSlot;

  /** exactly 1 */
  main?: GearAttribute | null;
  mains: GearAttribute[];

  /** 0..n */
  subs: GearAttribute[];

  /** optional */
  addition?: GearAttribute;

  rarity?: string;
}

export type RootTabKey = "main" | "gear";
export type MainTabKey = "stats" | "import-export";
export type GearTabKey = "equipped" | "custom" | "compare";
