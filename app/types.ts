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

/* =======================
   Gear domain
======================= */

export type GearSlot =
  | "weapon_1"
  | "weapon_2"
  | "ring"
  | "talisman"
  | "head"
  | "chest"
  | "hand"
  | "leg";

/**
 * Single attribute on gear
 * stat must be one of InputStats keys
 */
export interface GearAttribute {
  stat: keyof InputStats;
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
}
