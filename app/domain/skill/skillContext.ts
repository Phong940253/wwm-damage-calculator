// app/domain/skill/skillContext.ts
import { DamageContext } from "../damage/damageContext";
import { CategorySkill, DamageSkillType, WeaponType } from "./types";
import { getSkillConditionalModifiers } from "./skillBehaviors";

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

  if (
    skillId === "bamboocut_dust_umbrella_scarlet_spin" &&
    weaponType === "Umbrella" &&
    isMartialCategory(category)
  ) {
    value += baseCtx.get("SoulshadeUmbrellaSpinningUmbrellaDMGBoost");
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
    /** Extra DamageBoost % applied only to this skill (from rotation self-buff). */
    buffDmgBoostPct?: number;
    /** Extra DamageBoost % from external party buffs (e.g. Tides distance). */
    extraDmgBoost?: number;
    /** Stat overrides applied when boss is exhausted (from passive/inner way exhaustedExtra). */
    exhaustedStatOverrides?: Record<string, number>;
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
      value = baseCtx.get(key) + baseCtx.get("AllMartialArtsBoost");
      if (isMartialCategory(opts.category)) {
        value += baseCtx.get("MartialArtSkillDamageBoost");
      }
      if (isChargedSkill) value += baseCtx.get("ChargeSkillDamageBoost");
      if (isBallisticSkill) value += baseCtx.get("BallisticSkillDamageBoost");
      if (isPursuitSkill) value += baseCtx.get("PursuitSkillDamageBoost");
      if (weaponArtKey) value += baseCtx.get(weaponArtKey);
      // Conditional modifiers from skillBehaviors (e.g. Spring Away damage boost)
      if (opts.skillId) {
        const mods = getSkillConditionalModifiers(opts.skillId, (k) => baseCtx.get(k));
        for (const m of mods) {
          if (m.stat === "DamageBoost") value += m.value;
        }
      }
      // Per-skill self-buff from rotation params
      if (opts.buffDmgBoostPct) {
        value += opts.buffDmgBoostPct;
      }
      // Extra external party buff (e.g. Tides distance)
      if (opts.extraDmgBoost) {
        value += opts.extraDmgBoost;
      }
    }
    else if (key === "FamilyDMGBoost") {
      value = getFamilySpecificDamageBoost(baseCtx, {
        skillId: opts.skillId,
        weaponType: opts.weaponType,
        category: opts.category,
        isChargedSkill,
        isPursuitSkill,
      });
    }
    // Conditional: ballistic umbrella crit dmg bonus (e.g. Vernal Umbrella passives)
    else if (key === "CriticalDMGBonus") {
      value = baseCtx.get(key);
      if (isBallisticSkill && opts.weaponType === "Umbrella") {
        value += baseCtx.get("UmbrellaBallisticCriticalDMGBonus");
      }

      // Conditional: specific pursuit skill crit dmg bonus (Moonlit Shatter Spring)
      if (isPursuitSkill && opts.skillId) {
        const mods = getSkillConditionalModifiers(opts.skillId, (k) => baseCtx.get(k));
        for (const m of mods) {
          if (m.stat === "CriticalDMGBonus") value += m.value;
        }
      }
    }
    // Skill multipliers exposed as separate keys; applied in damageFormula
    else if (key === "SkillPhysicalMultiplier") {
      value = opts.physicalMultiplier;
    } else if (key === "SkillElementMultiplier") {
      value = opts.elementMultiplier;
    }
    // Physical ATK / OtherAttr / YourType pass through base value (no pre-multiply)
    else {
      value = baseCtx.get(key);
    }

    // Apply exhausted stat overrides on top of resolved value
    if (opts.exhaustedStatOverrides?.[key]) {
      value += opts.exhaustedStatOverrides[key];
    }

    // Cache the value
    cache.set(key, value);
    return value;
  };

  const explain = (key: string) => {
    const base = baseCtx.explain?.(key);
    if (key === "DamageBoost") {
      let total = base?.total ?? 0;
      const lines = base?.lines ? [...base.lines] : [];
      if (opts.buffDmgBoostPct) {
        total += opts.buffDmgBoostPct;
        lines.push({
          kind: "derived" as const,
          label: "Buff DMG Boost",
          value: opts.buffDmgBoostPct,
          note: "Skill self-buff from rotation params",
        });
      }
      if (opts.extraDmgBoost) {
        total += opts.extraDmgBoost;
        lines.push({
          kind: "derived" as const,
          label: "Tides Party Buff",
          value: opts.extraDmgBoost,
          note: "Distance-based party buff from Flute of the Tides",
        });
      }
      if (opts.buffDmgBoostPct || opts.extraDmgBoost) {
        return { key: "DamageBoost", total, lines };
      }
    }
    return base || null;
  };

  return { get, explain };
}
