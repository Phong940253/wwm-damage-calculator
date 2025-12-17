export interface Stat {
  current: number | "";
  increase: number | "";
}

export interface InputStats {
  [key: string]: Stat;
}

export type GearSlot =
  | "weapon_1"
  | "weapon_2"
  | "ring"
  | "talisman"
  | "head"
  | "chest"
  | "hand"
  | "leg";

export interface GearAttribute {
  stat: keyof InputStats;
  value: number;
}

export interface CustomGear {
  id: string;
  name: string;
  slot: GearSlot;
  main: GearAttribute;
  subs: GearAttribute[];
  addition?: GearAttribute;
}
