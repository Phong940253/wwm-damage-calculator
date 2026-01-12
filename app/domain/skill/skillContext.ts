// app/domain/skill/skillContext.ts
import { DamageContext } from "../damage/damageContext";

export function createSkillContext(
  baseCtx: DamageContext,
  opts: {
    physicalMultiplier: number;
    elementMultiplier: number;
    flatPhysical?: number;
    flatAttribute?: number;
    damageSkillType?: "normal" | "charged";
  }
): DamageContext {
  // Pre-calculate combined flat damage outside getter to avoid recalculation
  const totalFlatDamage = (opts.flatPhysical || 0) + (opts.flatAttribute || 0);

  const isChargedSkill = opts.damageSkillType === "charged";

  // Cache for frequently accessed values
  const cache = new Map<string, number>();

  const get = (key: string): number => {
    // Check cache first
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    let value: number;

    // Flat damage: add to base flat damage
    if (key === "FlatDamage") {
      value = baseCtx.get(key) + totalFlatDamage;
    }
    // Charged skill: DamageBoost includes ChargeSkillDamageBoost
    else if (key === "DamageBoost" && isChargedSkill) {
      value = baseCtx.get(key) + baseCtx.get("ChargeSkillDamageBoost");
    }
    // Physical ATK multiplied by skill multiplier
    else if (key === "MinPhysicalAttack" || key === "MaxPhysicalAttack") {
      value = baseCtx.get(key) * opts.physicalMultiplier;
    }
    // YOUR element only multiplied by skill multiplier
    else if (
      key === "MINAttributeAttackOfYOURType" ||
      key === "MAXAttributeAttackOfYOURType"
    ) {
      value = baseCtx.get(key) * opts.elementMultiplier;
    }
    // Other attributes pass through unchanged
    else {
      value = baseCtx.get(key);
    }

    // Cache the value
    cache.set(key, value);
    return value;
  };

  return { get };
}
