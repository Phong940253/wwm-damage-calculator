// app/hooks/useSkillDamage.ts
import { useMemo } from "react";
import { DamageContext } from "../domain/damage/damageContext";
import { DamageResult } from "../domain/damage/type";
import { Skill } from "../domain/skill/types";
import { calculateSkillDamage } from "../domain/skill/skillDamage";

export function useSkillDamage(
  ctx: DamageContext,
  base: DamageResult,
  skills: Skill[]
) {
  return useMemo(
    () =>
      skills.map((skill) => ({
        skill,
        result: calculateSkillDamage(ctx, base, skill),
      })),
    [ctx, base, skills]
  );
}
