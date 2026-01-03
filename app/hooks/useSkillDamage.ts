import { useMemo } from "react";
import { DamageContext } from "@/app/domain/damage/damageContext";
import { DamageResult } from "@/app/domain/damage/type";
import { Skill } from "@/app/domain/skill/types";
import { calculateSkillDamage } from "@/app/domain/skill/skillDamage";

export function useSkillDamage(
  ctx: DamageContext,
  base: DamageResult,
  skill?: Skill
) {
  return useMemo(() => {
    if (!skill) return null;

    return calculateSkillDamage(
      ctx,
      base.normal.value,
      base.critical.value,
      base.affinity.value,
      skill
    );
  }, [ctx, base, skill]);
}
