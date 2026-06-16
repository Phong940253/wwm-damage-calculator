// Centralized file for ALL skill-specific logic.
// When adding/modifying skill behaviors, ONLY edit this file.
// Do NOT scatter `if (skill.id === "...")` elsewhere.

import { Skill, SkillHit } from "./types";
import { RotationSkill } from "@/app/types";

export interface ParamsSchemaItem {
  key: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  default?: number;
}

/**
 * Which params a skill accepts in the rotation panel & admin modal.
 */
export function getSkillParamSchema(skill: Skill): ParamsSchemaItem[] {
  const common: ParamsSchemaItem[] = [
    { key: "buffDmgBoostPct", label: "Buff DMG Boost (%)", min: 0, default: 0 },
    { key: "distance", label: "Distance (m)", min: 0, max: 9, step: 0.1, default: 0 },
  ];

  switch (skill.id) {
    case "vernal_unfaded_flower":
      return [
        ...common,
        { key: "blossoms", label: "Blossoms", min: 0, default: 100 },
      ];
    case "vernal_umbrella_light_spring_away":
      return [
        ...common,
        { key: "duration", label: "Duration (s)", min: 0, step: 0.1, default: 1 },
      ];
    case "vernal_apricot_heaven":
      return [
        ...common,
        { key: "chargePct", label: "Charge (%)", min: 0, max: 100, default: 100 },
      ];
    default:
      return common;
  }
}

/**
 * Per-skill hit count/type scaling (e.g. Blossoms → time-based hits).
 */
export function applySkillHitScaling(
  skill: Skill,
  hits: SkillHit[],
  params?: Record<string, number>,
): SkillHit[] {
  if (skill.id === "vernal_unfaded_flower") {
    const blossomsRaw = params?.blossoms;
    const blossoms = Math.max(
      0,
      Number.isFinite(blossomsRaw as number) ? (blossomsRaw as number) : 100,
    );
    const seconds = Math.max(1, Math.floor(blossoms / 10));
    const template = hits[0] ?? {
      physicalMultiplier: 1,
      elementMultiplier: 1,
      hits: 1,
    };
    return [{ ...template, hits: seconds }];
  }
  return hits;
}

/**
 * Per-skill damage duration multiplier (e.g. DPS-based skills).
 * Returns 1 when no scaling applies.
 */
export function getSkillDurationScale(
  skill: Skill,
  params?: Record<string, number>,
): number {
  if (skill.id === "vernal_umbrella_light_spring_away") {
    const v = Number.isFinite(params?.duration as number)
      ? (params?.duration as number)
      : 1;
    return Math.max(0, v);
  }
  return 1;
}

/**
 * Conditional modifiers per skill (SpringAwayDamageBoost, Moonlit crit bonus, etc.)
 * Returns { stat, value } pairs to be added to the respective stats.
 */
export function getSkillConditionalModifiers(
  skillId: string | undefined,
  getStat: (key: string) => number,
): Array<{ stat: string; value: number }> {
  const result: Array<{ stat: string; value: number }> = [];
  if (!skillId) return result;

  if (skillId === "vernal_umbrella_light_spring_away") {
    const v = getStat("SpringAwayDamageBoost");
    if (v > 0) result.push({ stat: "DamageBoost", value: v });
  }

  if (
    skillId === "inkwell_moonlit_shatter_spring" ||
    skillId === "inkwell_moonlit_shatter_spring_enhanced"
  ) {
    const v = getStat("MoonlitShatterSpringPursuitCriticalDMGBonus");
    if (v > 0) result.push({ stat: "CriticalDMGBonus", value: v });
  }

  return result;
}

/**
 * Compute extra DamageBoost % from Flute of the Tides' distance-based party buff
 * for a specific skill. Each skill has its own distance parameter.
 * Buff is only active when Tides is in the rotation.
 * Formula: 0→5m = 0→50/9%, 5→9m = 50/9%→20%.
 */
export function computeRotationPartyBuff(
  currentSkillParams: Record<string, number> | undefined,
  rotationSkills: RotationSkill[] | undefined,
): number {
  if (!rotationSkills) return 0;
  const hasTides = rotationSkills.some(
    (rs) => rs.id === "mystic_flute_of_the_tides" && !rs.cancelled,
  );
  if (!hasTides) return 0;

  const d = Math.max(0, Math.min(9, Number(currentSkillParams?.distance ?? 0)));
  if (d <= 5) return (d / 5) * (50 / 9);
  return Math.min(20, (50 / 9) + ((d - 5) / 4) * (20 - 50 / 9));
}
