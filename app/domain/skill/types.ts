import { ElementKey } from "@/app/constants";
import { DamageResult } from "../damage/type";

export interface SkillHit {
  physicalMultiplier: number; // e.g. 1.2 = 120%
  elementMultiplier: number; // e.g. 0.8 = 80%
  hits: number;
}

export interface Skill {
  id: string;
  name: string;
  martialArtId: string;

  /** normal / skill / ult */
  category: "basic" | "skill" | "ultimate";

  hits: SkillHit[];

  /** whether skill can crit / affinity */
  canCrit?: boolean;
  canAffinity?: boolean;

  /** purely for UI */
  notes?: string;
}

export type MartialArtId =
  | "bellstrike_splendor"
  | "bellstrike_umbra"
  | "silkbind_deluge"
  | "silkbind_jade"
  | "stonesplit_might"
  | "bamboocut_wind";

export interface MartialArt {
  id: MartialArtId;
  name: string; // Bellstrike – Splendor
  element: ElementKey;
  role: "dps" | "support" | "tank";
}

export const LIST_MARTIAL_ARTS: MartialArt[] = [
  {
    id: "bellstrike_splendor",
    name: "Bellstrike – Splendor",
    element: "bellstrike",
    role: "dps",
  },
  {
    id: "bellstrike_umbra",
    name: "Bellstrike – Umbra",
    element: "bellstrike",
    role: "dps",
  },
  {
    id: "silkbind_deluge",
    name: "Silkbind – Deluge",
    element: "silkbind",
    role: "support",
  },
  {
    id: "silkbind_jade",
    name: "Silkbind – Jade",
    element: "silkbind",
    role: "dps",
  },
  {
    id: "stonesplit_might",
    name: "Stonesplit – Might",
    element: "stonesplit",
    role: "tank",
  },
  {
    id: "bamboocut_wind",
    name: "Bamboocut – Wind",
    element: "bamboocut",
    role: "dps",
  },
];

export interface SkillDamageResult {
  total: DamageResult;
  perHit: DamageResult[];
}
