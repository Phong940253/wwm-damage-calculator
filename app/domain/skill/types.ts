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

export interface MartialArt {
  id: string; // bellstrike_splendor
  name: string; // Bellstrike – Splendor
  element: ElementKey;
  role: "dps" | "support" | "tank";
}

export interface SkillDamageResult {
  total: DamageResult;
  perHit: DamageResult[];
}
