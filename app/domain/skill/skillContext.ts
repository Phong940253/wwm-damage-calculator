// app/domain/skill/skillContext.ts
import { DamageContext } from "../damage/damageContext";

export function createSkillContext(
  baseCtx: DamageContext,
  opts: {
    physicalMultiplier: number;
    elementMultiplier: number;
    flatPhysical?: number;
    flatAttribute?: number;
  }
): DamageContext {
  const totalFlatDamage = (opts.flatPhysical || 0) + (opts.flatAttribute || 0);

  return {
    get(key: string) {
      // Flat damage = flatPhysical + flatAttribute
      if (key === "FlatDamage") {
        return baseCtx.get(key) + totalFlatDamage;
      }

      // Physical ATK multiplied
      if (key === "MinPhysicalAttack" || key === "MaxPhysicalAttack") {
        return baseCtx.get(key) * opts.physicalMultiplier;
      }

      // YOUR element only multiplied
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
