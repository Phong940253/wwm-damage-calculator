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
    case "mystic_flute_of_the_tides":
      return [
        ...common,
        { key: "tidesDistance", label: "Distance (m)", min: 0, max: 9, step: 0.1, default: 0 },
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
 * Compute the total extra DamageBoost % from rotation party buffs
 * (e.g. Flute of the Tides distance-based buff applies to all skills
 * including tides itself).
 * Called inside calculateSkillDamage, so callers never need tides-specific code.
 */
export function computeRotationPartyBuff(
  rotationSkills: RotationSkill[] | undefined,
): number {
  if (!rotationSkills || rotationSkills.length === 0) return 0;

  let total = 0;

  for (const rs of rotationSkills) {
    if (rs.cancelled) continue;

    if (rs.id === "mystic_flute_of_the_tides") {
      const distance = rs.params?.tidesDistance ?? 0;
      const d = Math.max(0, Math.min(9, distance));
      if (d <= 5) {
        total += (d / 5) * (50 / 9);
      } else {
        total += (50 / 9) + ((d - 5) / 4) * (20 - 50 / 9);
      }
    }
  }

  return total;
}
