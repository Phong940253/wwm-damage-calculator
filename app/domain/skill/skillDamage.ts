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
      });

      const breakdown = calcExpectedNormalBreakdown(
        hitCtx.get,
        hitCtx.get("Affinity")
      );

      perHit.push({
        min: { value: calculateDamage(hitCtx).min, percent: 0 },
        normal: { value: calculateDamage(hitCtx).normal, percent: 0 },
        critical: { value: calculateDamage(hitCtx).critical, percent: 0 },
        affinity: { value: calculateDamage(hitCtx).affinity, percent: 0 },
        averageBreakdown: breakdown,
      });
    }
  }

  const total: DamageResult = {
    min: { value: 0, percent: 0 },
    normal: { value: 0, percent: 0 },
    critical: { value: 0, percent: 0 },
    affinity: { value: 0, percent: 0 },
    averageBreakdown: perHit[0]?.averageBreakdown,
  };

  for (const h of perHit) {
    total.min.value += h.min.value;
    total.normal.value += h.normal.value;
    total.critical.value += h.critical.value;
    total.affinity.value += h.affinity.value;
  }

  return { total, perHit };
}
