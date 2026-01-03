import { DamageContext } from "../damage/damageContext";
import { calcExpectedNormalBreakdown } from "../damage/damageFormula";
import { DamageResult } from "../damage/type";
import { Skill, SkillDamageResult } from "./types";

export function calculateSkillDamage(
  ctx: DamageContext,
  baseNormal: number,
  baseCrit: number,
  baseAffinity: number,
  skill: Skill
): SkillDamageResult {
  const physMul = ctx.get("PhysicalAttackMultiplier") / 100;
  const elemMul = ctx.get("MainElementMultiplier") / 100;

  const perHit: number[] = [];

  for (const h of skill.hits) {
    const hitBase =
      baseNormal *
      (physMul * h.physicalMultiplier + elemMul * h.elementMultiplier);

    for (let i = 0; i < h.hits; i++) {
      perHit.push(hitBase);
    }
  }

  const total = perHit.reduce((a, b) => a + b, 0);

  const breakdown = calcExpectedNormalBreakdown(ctx.get, baseAffinity);

  return {
    total,
    perHit,
    averageBreakdown: breakdown,
  };
}
