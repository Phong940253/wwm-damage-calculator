import { ElementKey } from "@/app/constants";
import { DamageResult } from "../damage/type";

export type WeaponType =
  | "Umbrella"
  | "Fan"
  | "Sword"
  | "Spear"
  | "Horizontal Blade"
  | "Mo Blade"
  | "Rope Dart"
  | "Dual Blades";

export interface SkillHitScaleTo {
  physicalMultiplier: number;
  elementMultiplier: number;
  flatPhysical?: number;
  flatAttribute?: number;
}

export interface SkillHitScale {
  /** Which RotationSkill.params key to read (e.g. chargePct). */
  paramKey: string;
  /** Input range used for normalization. Defaults to 0..100. */
  inputMin?: number;
  inputMax?: number;
  /** Target ("to") values; base hit values are treated as the "from" endpoint. */
  to: SkillHitScaleTo;
  /** Round flat values after interpolation. Defaults to true. */
  roundFlats?: boolean;
}

export interface SkillHit {
  physicalMultiplier: number; // e.g. 1.2 = 120%
  elementMultiplier: number; // e.g. 0.8 = 80%
  flatPhysical?: number; // flat physical damage per hit
  flatAttribute?: number; // flat attribute damage per hit
  hits: number;

  /** Optional linear scaling of this hit using RotationSkill.params[paramKey]. */
  scale?: SkillHitScale;
}

export type CategorySkill =
  | "martial-art-skill"
  | "special-skill"
  | "dual-weapon-skill"
  | "basic"
  | "ultimate"
  | "mystic-skill";

export type DamageSkillType = "normal" | "charged" | "ballistic";

export interface Skill {
  id: string;
  name: string;
  martialArtId?: string;
  weaponType?: WeaponType;

  /** martial-art-skill / special-skill / dual-weapon-skill / basic / ultimate */
  category: CategorySkill;

  hits: SkillHit[];

  /**
   * Damage-type tags used by the calculator for conditional stats.
   * - "charged": charged skill (uses ChargeSkillDamageBoost)
   * - "normal": default
   */
  damageSkillType?: DamageSkillType[];

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
