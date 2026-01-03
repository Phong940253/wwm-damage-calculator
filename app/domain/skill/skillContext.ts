// app/domain/skill/skillContext.ts
import { DamageContext } from "../damage/damageContext";

export function createSkillContext(
  baseCtx: DamageContext,
  opts: {
    physicalMultiplier: number;
    elementMultiplier: number;
  }
): DamageContext {
  return {
    get(key: string) {
      // Physical ATK
      if (key === "MinPhysicalAttack" || key === "MaxPhysicalAttack") {
        return baseCtx.get(key) * opts.physicalMultiplier;
      }

      // YOUR element only
      if (
        key === "MINAttributeAttackOfYOURType" ||
        key === "MAXAttributeAttackOfYOURType"
      ) {
        return baseCtx.get(key) * opts.elementMultiplier;
      }

      return baseCtx.get(key);
    },
  };
}
