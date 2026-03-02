// app/domain/skill/skillContext.ts
import { DamageContext } from "../damage/damageContext";
import { CategorySkill, DamageSkillType, WeaponType } from "./types";

const MOONLIT_SHATTER_SPRING_SKILL_IDS = new Set([
  "inkwell_moonlit_shatter_spring",
  "inkwell_moonlit_shatter_spring_enhanced",
]);

const SPRING_AWAY_SKILL_IDS = new Set(["vernal_umbrella_light_spring_away"]);

function skillStartsWith(skillId: string | undefined, prefix: string): boolean {
  return !!skillId && skillId.startsWith(`${prefix}_`);
}

function isSpecialCategory(category?: CategorySkill): boolean {
  return category === "special-skill";
}

function isMartialCategory(category?: CategorySkill): boolean {
  return category === "martial-art-skill";
}

function getFamilySpecificDamageBoost(
  baseCtx: DamageContext,
  opts: {
    skillId?: string;
    weaponType?: WeaponType;
    category?: CategorySkill;
    isChargedSkill: boolean;
    isPursuitSkill: boolean;
  },
): number {
  const { skillId, weaponType, category, isChargedSkill, isPursuitSkill } =
    opts;
  let value = 0;

  if (skillStartsWith(skillId, "nameless") && weaponType === "Sword") {
    if (isMartialCategory(category)) {
      value += baseCtx.get("NamelessSwordMartialArtSkillDMGBoost");
    }
    if (isChargedSkill)
      value += baseCtx.get("NamelessSwordChargedSkillDMGBoost");
    if (isSpecialCategory(category))
      value += baseCtx.get("NamelessSwordSpecialSkillDMGBoost");
  }

  if (skillStartsWith(skillId, "nameless") && weaponType === "Spear") {
    if (isMartialCategory(category)) {
      value += baseCtx.get("NamelessSpearMartialArtSkillDMGBoost");
    }
    if (isChargedSkill)
      value += baseCtx.get("NamelessSpearChargedSkillDMGBoost");
    if (isSpecialCategory(category))
      value += baseCtx.get("NamelessSpearSpecialSkillDMGBoost");
  }

  if (skillStartsWith(skillId, "vernal") && weaponType === "Umbrella") {
    if (isMartialCategory(category)) {
      value += baseCtx.get("VernalUmbrellaMartialArtSkillDMGBoost");
    }
    if (isChargedSkill)
      value += baseCtx.get("VernalUmbrellaChargedSkillDMGBoost");
    if (isSpecialCategory(category))
      value += baseCtx.get("VernalUmbrellaSpecialSkillDMGBoost");
  }

  if (skillStartsWith(skillId, "inkwell") && weaponType === "Fan") {
    if (isMartialCategory(category)) {
      value += baseCtx.get("InkwellFanMartialArtSkillDMGBoost");
    }
    if (isChargedSkill) value += baseCtx.get("InkwellFanChargedSkillDMGBoost");
    if (isSpecialCategory(category) || isPursuitSkill) {
      value += baseCtx.get("InkwellFanSpecialAndPursuitSkillDMGBoost");
    }
  }

  if (skillStartsWith(skillId, "infernal") && weaponType === "Dual Blades") {
    if (isMartialCategory(category)) {
      value += baseCtx.get("InfernalTwinbladesMartialArtSkillDMGBoost");
    }
    if (isSpecialCategory(category)) {
      value += baseCtx.get("InfernalTwinbladesSpecialSkillDMGBoost");
    }
    if (skillId && /infernal_.*light_attack/.test(skillId)) {
      value += baseCtx.get("InfernalTwinbladesEmpoweredLightAttackDMGBoost");
    }
  }

  if (skillStartsWith(skillId, "mortal") && weaponType === "Rope Dart") {
    if (isMartialCategory(category)) {
      value += baseCtx.get("MortalRopeDartMartialArtSkillDMGBoost");
    }
    if (isChargedSkill)
      value += baseCtx.get("MortalRopeDartChargedSkillDMGBoost");
    if (skillId && skillId.includes("rodent")) {
      value += baseCtx.get("MortalRopeDartRodentDMGBoost");
    }
  }

  if (skillStartsWith(skillId, "strategic") && weaponType === "Sword") {
    if (isMartialCategory(category)) {
      value += baseCtx.get("StrategicSwordMartialArtSkillDMGBoost");
    }
    if (isChargedSkill)
      value += baseCtx.get("StrategicSwordChargedSkillDMGBoost");
    if (isSpecialCategory(category))
      value += baseCtx.get("StrategicSwordSpecialSkillDMGBoost");
  }

  if (skillStartsWith(skillId, "heavenquaker") && weaponType === "Spear") {
    if (isMartialCategory(category)) {
      value += baseCtx.get("HeavenquakerSpearMartialArtSkillDMGBoost");
    }
    if (isChargedSkill)
      value += baseCtx.get("HeavenquakerSpearChargedSkillDMGBoost");
    if (isSpecialCategory(category))
      value += baseCtx.get("HeavenquakerSpearSpecialSkillDMGBoost");
  }

  if (skillStartsWith(skillId, "thundercry") && weaponType === "Mo Blade") {
    if (isChargedSkill)
      value += baseCtx.get("ThundercryBladeChargedSkillDMGBoost");
    if (isSpecialCategory(category)) {
      value += baseCtx.get("ThundercryBladeSpecialSkillDMGBoost");
    }
  }

  if (skillStartsWith(skillId, "stormbreaker") && weaponType === "Spear") {
    if (isMartialCategory(category)) {
      value += baseCtx.get("StormbreakerSpearMartialArtSkillDMGBoost");
    }
    if (isChargedSkill)
      value += baseCtx.get("StormbreakerSpearChargedSkillDMGBoost");
    if (isSpecialCategory(category)) {
      value += baseCtx.get("StormbreakerSpearSpecialSkillDMGBoost");
    }
  }

  if (skillStartsWith(skillId, "soulshade") && weaponType === "Umbrella") {
    if (isChargedSkill) {
      value += baseCtx.get("SoulshadeUmbrellaChargedSkillDMGBoost");
    }
  }

  return value;
}

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
    skillId?: string;
    category?: CategorySkill;
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
      value += getFamilySpecificDamageBoost(baseCtx, {
        skillId: opts.skillId,
        weaponType: opts.weaponType,
        category: opts.category,
        isChargedSkill,
        isPursuitSkill,
      });

      // Conditional: Spring Away damage boost (e.g. Inner Ways)
      if (opts.skillId && SPRING_AWAY_SKILL_IDS.has(opts.skillId)) {
        value += baseCtx.get("SpringAwayDamageBoost");
      }
    }
    // Conditional: ballistic umbrella crit dmg bonus (e.g. Vernal Umbrella passives)
    else if (key === "CriticalDMGBonus") {
      value = baseCtx.get(key);
      if (isBallisticSkill && opts.weaponType === "Umbrella") {
        value += baseCtx.get("UmbrellaBallisticCriticalDMGBonus");
      }

      // Conditional: specific pursuit skill crit dmg bonus (Moonlit Shatter Spring)
      if (
        isPursuitSkill &&
        opts.skillId &&
        MOONLIT_SHATTER_SPRING_SKILL_IDS.has(opts.skillId)
      ) {
        value += baseCtx.get("MoonlitShatterSpringPursuitCriticalDMGBonus");
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
