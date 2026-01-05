// app/domain/skill/skillDamage.ts
import { calculateDamage } from "../damage/damageCalculator";
import { DamageContext } from "../damage/damageContext";
import { Skill } from "./types";
import { createSkillContext } from "./skillContext";
import { DamageResult, SkillDamageResult } from "../damage/type";
import { calcExpectedNormalBreakdown } from "../damage/damageFormula";

export function calculateSkillDamage(
  ctx: DamageContext,
  skill: Skill
): SkillDamageResult {
  const perHit: DamageResult[] = [];

  for (const hit of skill.hits) {
    for (let i = 0; i < hit.hits; i++) {
      const hitCtx = createSkillContext(ctx, {
        physicalMultiplier: hit.physicalMultiplier,
        elementMultiplier: hit.elementMultiplier,
        flatPhysical: hit.flatPhysical,
        flatAttribute: hit.flatAttribute,
      });

      const damage = calculateDamage(hitCtx);

      const breakdown = calcExpectedNormalBreakdown(
        hitCtx.get,
        damage.affinity
      );

      perHit.push({
        min: { value: damage.min, percent: 0 },
        normal: { value: damage.normal, percent: 0 },
        critical: { value: damage.critical, percent: 0 },
        affinity: { value: damage.affinity, percent: 0 },
        averageBreakdown: breakdown,
      });
    }
  }

  const total: DamageResult = {
    min: { value: 0, percent: 0 },
    normal: { value: 0, percent: 0 },
    critical: { value: 0, percent: 0 },
    affinity: { value: 0, percent: 0 },
    averageBreakdown: { abrasion: 0, affinity: 0, critical: 0, normal: 0 },
  };

  for (const h of perHit) {
    total.min.value += h.min.value;
    total.normal.value += h.normal.value;
    total.critical.value += h.critical.value;
    total.affinity.value += h.affinity.value;
    if (total.averageBreakdown) {
      total.averageBreakdown.abrasion += h.averageBreakdown?.abrasion || 0;
      total.averageBreakdown.affinity += h.averageBreakdown?.affinity || 0;
      total.averageBreakdown.critical += h.averageBreakdown?.critical || 0;
      total.averageBreakdown.normal += h.averageBreakdown?.normal || 0;
    }
  }

  return { total, perHit };
}
