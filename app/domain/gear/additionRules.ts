import { GearSlot } from "@/app/types";

export const LEFT_ADDITION_STATS = [
  "PhysicalPenetration",
  "PhysicalResistance",
  "bellstrikePenetration",
  "stonesplitPenetration",
  "silkbindPenetration",
  "bamboocutPenetration",
] as const;

export const RIGHT_ADDITION_STATS = [
  "NamelessSwordMartialArtSkillDMGBoost",
  "NamelessSwordChargedSkillDMGBoost",
  "NamelessSwordSpecialSkillDMGBoost",
  "NamelessSpearMartialArtSkillDMGBoost",
  "NamelessSpearChargedSkillDMGBoost",
  "NamelessSpearSpecialSkillDMGBoost",

  "VernalUmbrellaMartialArtSkillDMGBoost",
  "VernalUmbrellaChargedSkillDMGBoost",
  "VernalUmbrellaSpecialSkillDMGBoost",
  "InkwellFanMartialArtSkillDMGBoost",
  "InkwellFanChargedSkillDMGBoost",
  "InkwellFanSpecialAndPursuitSkillDMGBoost",

  "InfernalTwinbladesMartialArtSkillDMGBoost",
  "InfernalTwinbladesSpecialSkillDMGBoost",
  "InfernalTwinbladesEmpoweredLightAttackDMGBoost",
  "MortalRopeDartMartialArtSkillDMGBoost",
  "MortalRopeDartChargedSkillDMGBoost",
  "MortalRopeDartRodentDMGBoost",

  "StrategicSwordMartialArtSkillDMGBoost",
  "StrategicSwordChargedSkillDMGBoost",
  "StrategicSwordSpecialSkillDMGBoost",
  "HeavenquakerSpearMartialArtSkillDMGBoost",
  "HeavenquakerSpearChargedSkillDMGBoost",
  "HeavenquakerSpearSpecialSkillDMGBoost",

  "ThundercryBladeChargedSkillDMGBoost",
  "ThundercryBladeSpecialSkillDMGBoost",
  "StormbreakerSpearMartialArtSkillDMGBoost",
  "StormbreakerSpearChargedSkillDMGBoost",
  "StormbreakerSpearSpecialSkillDMGBoost",

  "PanaceaFanMartialArtSkillHealingBoost",
  "PanaceaFanSpecialSkillHealingBoost",
  "SoulshadeUmbrellaMartialArtSkillHealingBoost",
  "SoulshadeUmbrellaSpecialSkillHealingBoost",
  "SoulshadeUmbrellaChargedSkillDMGBoost",
] as const;

const LEFT_GEAR_SLOTS: GearSlot[] = ["weapon_1", "weapon_2", "disc", "pendant"];

export function getAdditionStatsBySlot(slot: GearSlot): readonly string[] {
  return LEFT_GEAR_SLOTS.includes(slot)
    ? LEFT_ADDITION_STATS
    : RIGHT_ADDITION_STATS;
}

export function isValidAdditionStatForSlot(
  slot: GearSlot,
  stat: string,
): boolean {
  return getAdditionStatsBySlot(slot).includes(stat);
}
