// app/domain/skill/skillDamage.ts
import { calculateDamage } from "../damage/damageCalculator";
import { DamageContext } from "../damage/damageContext";
import { Skill } from "./types";
import { createSkillContext } from "./skillContext";
import { DamageResult, SkillDamageResult } from "../damage/type";
import { calcExpectedNormalBreakdown } from "../damage/damageFormula";

export interface SkillDamageOptions {
  /** Optional per-skill parameters (typically sourced from RotationSkill.params). */
  params?: Record<string, number>;
}

function getEffectiveSkillHits(skill: Skill, opts?: SkillDamageOptions) {
  // Default: use JSON hits as-is.
  const baseHits = skill.hits ?? [];

  // Unfaded Flower: model as a time-based projectile skill.
  // Tooltip: consumes 10 Blossoms per second; user can input Blossoms to scale duration.
  if (skill.id === "vernal_unfaded_flower") {
    const blossomsRaw = opts?.params?.blossoms;
    const blossoms = Math.max(
      0,
      Number.isFinite(blossomsRaw as number) ? (blossomsRaw as number) : 50,
    );
    const seconds = Math.max(1, Math.floor(blossoms / 10));

    // Interpret the first hit entry as "one projectile" and scale its hit count by duration seconds.
    const template = baseHits[0] ?? {
      physicalMultiplier: 1,
      elementMultiplier: 1,
      hits: 1,
    };

    return [
      {
        ...template,
        hits: seconds,
      },
    ];
  }

  return baseHits;
}

export function calculateSkillDamage(
  ctx: DamageContext,
  skill: Skill,
  opts?: SkillDamageOptions,
): SkillDamageResult {
  const perHit: DamageResult[] = [];

  const damageSkillTypes = skill.damageSkillType ?? ["normal"];

  const effectiveHits = getEffectiveSkillHits(skill, opts);

  // Process each hit type and multiply by hit count
  for (const hit of effectiveHits) {
    const hitCtx = createSkillContext(ctx, {
      physicalMultiplier: hit.physicalMultiplier,
      elementMultiplier: hit.elementMultiplier,
      flatPhysical: hit.flatPhysical,
      flatAttribute: hit.flatAttribute,
      damageSkillTypes,
    });

    const damage = calculateDamage(hitCtx);
    const breakdown = calcExpectedNormalBreakdown(hitCtx.get, damage.affinity);

    // Create damage object once and reuse for multiple hits
    const hitDamage: DamageResult = {
      min: { value: damage.min, percent: 0 },
      normal: { value: damage.normal, percent: 0 },
      critical: { value: damage.critical, percent: 0 },
      affinity: { value: damage.affinity, percent: 0 },
      averageBreakdown: breakdown,
    };

    // Add hit count times instead of creating separate objects
    for (let i = 0; i < hit.hits; i++) {
      perHit.push(hitDamage);
    }
  }

  // Accumulate damage efficiently
  const total: DamageResult = {
    min: { value: 0, percent: 0 },
    normal: { value: 0, percent: 0 },
    critical: { value: 0, percent: 0 },
    affinity: { value: 0, percent: 0 },
    averageBreakdown: { abrasion: 0, affinity: 0, critical: 0, normal: 0 },
  };

  // Single pass accumulation
  for (const h of perHit) {
    total.min.value += h.min.value;
    total.normal.value += h.normal.value;
    total.critical.value += h.critical.value;
    total.affinity.value += h.affinity.value;
    if (total.averageBreakdown && h.averageBreakdown) {
      total.averageBreakdown.abrasion += h.averageBreakdown.abrasion;
      total.averageBreakdown.affinity += h.averageBreakdown.affinity;
      total.averageBreakdown.critical += h.averageBreakdown.critical;
      total.averageBreakdown.normal += h.averageBreakdown.normal;
    }
  }

  return { total, perHit };
}
