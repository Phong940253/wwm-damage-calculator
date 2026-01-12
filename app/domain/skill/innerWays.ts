import { InnerWay } from "./passiveSkillTypes";

/**
 * Database Inner Ways
 * Có thể áp dụng cho cụ thể martial art hoặc tất cả
 */
export const INNER_WAYS: InnerWay[] = [
  /* ==================== UNIVERSAL (All Martial Arts) ==================== */
  {
    id: "iw_universal_1",
    name: "Strength Training",
    description: "Increases Physical Attack by 8%",
    applicableToMartialArtId: undefined, // tất cả martial arts
    modifiers: [
      {
        stat: "MinPhysicalAttack",
        type: "scale",
        sourceStat: "MinPhysicalAttack",
        ratio: 0.08,
      },
      {
        stat: "MaxPhysicalAttack",
        type: "scale",
        sourceStat: "MaxPhysicalAttack",
        ratio: 0.08,
      },
    ],
    level: 1,
  },
  {
    id: "iw_universal_2",
    name: "Defense Mastery",
    description: "Increases Physical Defense by 10%",
    applicableToMartialArtId: undefined,
    modifiers: [
      {
        stat: "PhysicalDefense",
        type: "scale",
        sourceStat: "PhysicalDefense",
        ratio: 0.1,
      },
    ],
    level: 1,
  },
  {
    id: "iw_universal_3",
    name: "Critical Focus",
    description: "Increases Critical Rate by 5%",
    applicableToMartialArtId: undefined,
    modifiers: [
      {
        stat: "CriticalRate",
        type: "flat",
        value: 5,
      },
    ],
    level: 1,
  },
  {
    id: "iw_universal_4",
    name: "Damage Amplification",
    description: "Increases Damage Boost by 5%",
    applicableToMartialArtId: undefined,
    modifiers: [
      {
        stat: "DamageBoost",
        type: "flat",
        value: 5,
      },
    ],
    level: 2,
  },
  {
    id: "iw_universal_5",
    name: "Health Training",
    description: "Increases Max HP by 10%",
    applicableToMartialArtId: undefined,
    modifiers: [
      {
        stat: "HP",
        type: "scale",
        sourceStat: "HP",
        ratio: 0.1,
      },
    ],
    level: 1,
  },
  {
    id: "iw_universal_battle_anthem_t4",
    name: "Battle Anthem (Tier 4)",
    description:
      "Charged skills deal +15% damage; increases Endurance cost by 10%.",
    applicableToMartialArtId: undefined,
    defaultEnabledForMartialArtIds: ["bellstrike_splendor"],
    modifiers: [
      {
        stat: "ChargeSkillDamageBoost",
        type: "flat",
        value: 15,
      },
    ],
    level: 4,
    notes:
      "Tier 4: Increases Charged Skills' damage against all enemies (including players with less than 60% Endurance) by 15% and increases their Endurance cost by 10%. (Endurance cost is not modeled in this calculator.)",
  },
  {
    id: "iw_universal_battle_anthem_t6",
    name: "Battle Anthem (Tier 6)",
    description:
      "On Charged Skill damage: conditional bonus damage (player/boss) up to 10%.",
    applicableToMartialArtId: undefined,
    defaultEnabledForMartialArtIds: ["bellstrike_splendor"],
    modifiers: [
      {
        stat: "ChargeSkillDamageBoost",
        type: "flat",
        value: 10,
      }
    ],
    level: 6,
    notes:
      "Tier 6: When dealing damage with a Charged Skill, if the target is a player, increases the damage by 1% for every 10 Endurance difference between you and the target, up to 10%; if the target is a boss, deals bonus damage based on the Endurance you have consumed: 1% bonus damage for every 10 Endurance consumed, up to 10%.",
  },

  /* ==================== BELLSTRIKE SPECIFIC ==================== */
  {
    id: "iw_bellstrike_1",
    name: "Bellstrike Resonance Mastery",
    description: "Increases Bellstrike element damage by 15%",
    applicableToMartialArtId: "bellstrike_splendor",
    modifiers: [
      {
        stat: "bellstrikeDMGBonus",
        type: "flat",
        value: 15,
      },
    ],
    level: 2,
  },
  {
    id: "iw_bellstrike_2",
    name: "Bellstrike Penetration",
    description: "Increases Bellstrike penetration by 2",
    applicableToMartialArtId: "bellstrike_splendor",
    modifiers: [
      {
        stat: "bellstrikePenetration",
        type: "flat",
        value: 2,
      },
    ],
    level: 2,
  },

  /* ==================== SILKBIND SPECIFIC ==================== */
  {
    id: "iw_silkbind_1",
    name: "Silkbind Grace",
    description: "Increases Silkbind element damage by 12%",
    applicableToMartialArtId: "silkbind_jade",
    modifiers: [
      {
        stat: "silkbindDMGBonus",
        type: "flat",
        value: 12,
      },
    ],
    level: 2,
  },
  {
    id: "iw_silkbind_2",
    name: "Silkbind Flow",
    description: "Increases Silkbind min/max by 20",
    applicableToMartialArtId: "silkbind_jade",
    modifiers: [
      {
        stat: "silkbindMin",
        type: "flat",
        value: 20,
      },
      {
        stat: "silkbindMax",
        type: "flat",
        value: 20,
      },
    ],
    level: 2,
  },

  /* ==================== STONESPLIT SPECIFIC ==================== */
  {
    id: "iw_stonesplit_1",
    name: "Stone Fortitude",
    description: "Increases Stonesplit defense and damage by 10%",
    applicableToMartialArtId: "stonesplit_might",
    modifiers: [
      {
        stat: "stonesplitDMGBonus",
        type: "flat",
        value: 10,
      },
      {
        stat: "PhysicalDefense",
        type: "scale",
        sourceStat: "PhysicalDefense",
        ratio: 0.1,
      },
    ],
    level: 2,
  },

  /* ==================== BAMBOOCUT SPECIFIC ==================== */
  {
    id: "iw_bamboocut_1",
    name: "Bamboocut Precision",
    description: "Increases Bamboocut element damage by 10%",
    applicableToMartialArtId: "bamboocut_wind",
    modifiers: [
      {
        stat: "bamboocutDMGBonus",
        type: "flat",
        value: 10,
      },
    ],
    level: 2,
  },
  {
    id: "iw_bamboocut_2",
    name: "Bamboocut Swiftness",
    description: "Increases Agility by 10",
    applicableToMartialArtId: "bamboocut_wind",
    modifiers: [
      {
        stat: "Agility",
        type: "flat",
        value: 10,
      },
    ],
    level: 2,
  },
];
