// app/domain/skill/skillContext.ts
import { DamageContext } from "../damage/damageContext";
import { DamageSkillType, WeaponType } from "./types";

function weaponArtDamageBoostKey(weaponType: WeaponType): string {
  switch (weaponType) {
    case "Sword":
      return "ArtOfSwordDMGBoost";
    case "Spear":
      return "ArtOfSpearDMGBoost";
    case "Fan":
      return "ArtOfFanDMGBoost";
    case "Umbrella":
      return "ArtOfUmbrellaDMGBoost";
    case "Horizontal Blade":
      return "ArtOfHorizontalBladeDMGBoost";
    case "Mo Blade":
      return "ArtOfMoBladeDMGBoost";
    case "Dual Blades":
      return "ArtOfDualBladesDMGBoost";
    case "Rope Dart":
      return "ArtOfRopeDartDMGBoost";
  }
}

export function createSkillContext(
  baseCtx: DamageContext,
  opts: {
    physicalMultiplier: number;
    elementMultiplier: number;
    flatPhysical?: number;
    flatAttribute?: number;
    damageSkillTypes?: DamageSkillType[];
    weaponType?: WeaponType;
  },
): DamageContext {
  // Pre-calculate combined flat damage outside getter to avoid recalculation
  const totalFlatDamage = (opts.flatPhysical || 0) + (opts.flatAttribute || 0);

  const isChargedSkill = opts.damageSkillTypes?.includes("charged") ?? false;
  const isBallisticSkill =
    opts.damageSkillTypes?.includes("ballistic") ?? false;
  const isPursuitSkill = opts.damageSkillTypes?.includes("pursuit") ?? false;
  const weaponArtKey = opts.weaponType
    ? weaponArtDamageBoostKey(opts.weaponType)
    : null;

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
    // Conditional: charged skill and/or weapon-art-specific boost
    else if (key === "DamageBoost") {
      value = baseCtx.get(key);
      if (isChargedSkill) value += baseCtx.get("ChargeSkillDamageBoost");
      if (isBallisticSkill) value += baseCtx.get("BallisticSkillDamageBoost");
      if (isPursuitSkill) value += baseCtx.get("PursuitSkillDamageBoost");
      if (weaponArtKey) value += baseCtx.get(weaponArtKey);
    }
    // Conditional: ballistic umbrella crit dmg bonus (e.g. Vernal Umbrella passives)
    else if (key === "CriticalDMGBonus") {
      value = baseCtx.get(key);
      if (isBallisticSkill && opts.weaponType === "Umbrella") {
        value += baseCtx.get("UmbrellaBallisticCriticalDMGBonus");
      }
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
    } else if (
      key === "MINAttributeAttackOfOtherType" ||
      key === "MAXAttributeAttackOfOtherType"
    ) {
      value = baseCtx.get(key) * opts.physicalMultiplier;
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
