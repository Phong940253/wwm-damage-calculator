// app/hooks/useSkillDamage.ts
import { useMemo } from "react";
import { Skill } from "@/app/domain/skill/types";
import { DamageContext } from "@/app/domain/damage/damageContext";
import { calculateSkillDamage } from "@/app/domain/skill/skillDamage";

export function useSkillDamage(ctx: DamageContext, skills: Skill[]) {
  return useMemo(
    () =>
      skills.map((skill) => ({
        skill,
        result: calculateSkillDamage(ctx, skill),
      })),
    [ctx, skills]
  );
}
