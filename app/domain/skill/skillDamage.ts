import { DamageContext } from "../damage/damageContext";
import { DamageResult, SkillDamageResult } from "../damage/type";
import { scaleDamage } from "./scaleDamage";
import { Skill } from "./types";

export function calculateSkillDamage(
  ctx: DamageContext,
  base: DamageResult,
  skill: Skill
): SkillDamageResult {
  const physMul = ctx.get("PhysicalAttackMultiplier") / 100;
  const elemMul = ctx.get("MainElementMultiplier") / 100;

  const perHit: DamageResult[] = [];

  for (const hit of skill.hits) {
    const hitScale =
      physMul * hit.physicalMultiplier + elemMul * hit.elementMultiplier;

    for (let i = 0; i < hit.hits; i++) {
      perHit.push(scaleDamage(base, hitScale));
    }
  }

  const total: DamageResult = {
    min: { value: 0, percent: 0 },
    normal: { value: 0, percent: 0 },
    critical: { value: 0, percent: 0 },
    affinity: { value: 0, percent: 0 },
    averageBreakdown: base.averageBreakdown,
  };

  for (const h of perHit) {
    total.min.value += h.min.value;
    total.normal.value += h.normal.value;
    total.critical.value += h.critical.value;
    total.affinity.value += h.affinity.value;
  }

  return { total, perHit };
}
