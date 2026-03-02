import { GearSlot } from "@/app/types";

export interface AdditionStatGroup {
  label: string;
  options: readonly string[];
}

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

const LEFT_ADDITION_GROUPS: AdditionStatGroup[] = [
  {
    label: "Penetration & Resistance",
    options: LEFT_ADDITION_STATS,
  },
];

const RIGHT_ADDITION_GROUPS: AdditionStatGroup[] = [
  {
    label: "Nameless",
    options: [
      "NamelessSwordMartialArtSkillDMGBoost",
      "NamelessSwordChargedSkillDMGBoost",
      "NamelessSwordSpecialSkillDMGBoost",
      "NamelessSpearMartialArtSkillDMGBoost",
      "NamelessSpearChargedSkillDMGBoost",
      "NamelessSpearSpecialSkillDMGBoost",
    ],
  },
  {
    label: "Vernal",
    options: [
      "VernalUmbrellaMartialArtSkillDMGBoost",
      "VernalUmbrellaChargedSkillDMGBoost",
      "VernalUmbrellaSpecialSkillDMGBoost",
    ],
  },
  {
    label: "Inkwell",
    options: [
      "InkwellFanMartialArtSkillDMGBoost",
      "InkwellFanChargedSkillDMGBoost",
      "InkwellFanSpecialAndPursuitSkillDMGBoost",
    ],
  },
  {
    label: "Infernal",
    options: [
      "InfernalTwinbladesMartialArtSkillDMGBoost",
      "InfernalTwinbladesSpecialSkillDMGBoost",
      "InfernalTwinbladesEmpoweredLightAttackDMGBoost",
    ],
  },
  {
    label: "Mortal",
    options: [
      "MortalRopeDartMartialArtSkillDMGBoost",
      "MortalRopeDartChargedSkillDMGBoost",
      "MortalRopeDartRodentDMGBoost",
    ],
  },
  {
    label: "Strategic",
    options: [
      "StrategicSwordMartialArtSkillDMGBoost",
      "StrategicSwordChargedSkillDMGBoost",
      "StrategicSwordSpecialSkillDMGBoost",
    ],
  },
  {
    label: "Heavenquaker",
    options: [
      "HeavenquakerSpearMartialArtSkillDMGBoost",
      "HeavenquakerSpearChargedSkillDMGBoost",
      "HeavenquakerSpearSpecialSkillDMGBoost",
    ],
  },
  {
    label: "Thundercry",
    options: [
      "ThundercryBladeChargedSkillDMGBoost",
      "ThundercryBladeSpecialSkillDMGBoost",
    ],
  },
  {
    label: "Stormbreaker",
    options: [
      "StormbreakerSpearMartialArtSkillDMGBoost",
      "StormbreakerSpearChargedSkillDMGBoost",
      "StormbreakerSpearSpecialSkillDMGBoost",
    ],
  },
  {
    label: "Panacea",
    options: [
      "PanaceaFanMartialArtSkillHealingBoost",
      "PanaceaFanSpecialSkillHealingBoost",
    ],
  },
  {
    label: "Soulshade",
    options: [
      "SoulshadeUmbrellaMartialArtSkillHealingBoost",
      "SoulshadeUmbrellaSpecialSkillHealingBoost",
      "SoulshadeUmbrellaChargedSkillDMGBoost",
    ],
  },
];

export function getAdditionStatsBySlot(slot: GearSlot): readonly string[] {
  return LEFT_GEAR_SLOTS.includes(slot)
    ? LEFT_ADDITION_STATS
    : RIGHT_ADDITION_STATS;
}

export function getAdditionStatGroupsBySlot(
  slot: GearSlot,
): readonly AdditionStatGroup[] {
  return LEFT_GEAR_SLOTS.includes(slot)
    ? LEFT_ADDITION_GROUPS
    : RIGHT_ADDITION_GROUPS;
}

export function isValidAdditionStatForSlot(
  slot: GearSlot,
  stat: string,
): boolean {
  return getAdditionStatsBySlot(slot).includes(stat);
}
