import { PassiveSkill } from "./passiveSkillTypes";

/**
 * Database Passive Skills gắn vào từng Martial Art
 * Bao gồm các skill từ game "Where Winds Meet"
 */
export const PASSIVE_SKILLS: PassiveSkill[] = [
  /* ==================== BELLSTRIKE SPLENDOR ==================== */
  {
    id: "ps_bellstrike_splendor_1",
    name: "Resonance Enhancement",
    description: "Increases Critical Rate by 10%",
    martialArtId: "bellstrike_splendor",
    modifiers: [
      {
        stat: "CriticalRate",
        type: "flat",
        value: 10,
      },
    ],
  },
  {
    id: "ps_bellstrike_splendor_2",
    name: "Strike Amplification",
    description: "Increases Physical Attack by 15% of Momentum",
    martialArtId: "bellstrike_splendor",
    modifiers: [
      {
        stat: "MinPhysicalAttack",
        type: "scale",
        sourceStat: "Momentum",
        ratio: 0.15,
      },
      {
        stat: "MaxPhysicalAttack",
        type: "scale",
        sourceStat: "Momentum",
        ratio: 0.15,
      },
    ],
    notes: "Scales with Momentum stat",
  },
  {
    id: "ps_bellstrike_splendor_3",
    name: "Damage Penetration",
    description: "Adds 5 to Physical Penetration",
    martialArtId: "bellstrike_splendor",
    modifiers: [
      {
        stat: "PhysicalPenetration",
        type: "flat",
        value: 5,
      },
    ],
  },

  /* ==================== BELLSTRIKE UMBRA ==================== */
  {
    id: "ps_bellstrike_umbra_1",
    name: "Shadow Affinity",
    description: "Increases Affinity Rate by 8%",
    martialArtId: "bellstrike_umbra",
    modifiers: [
      {
        stat: "AffinityRate",
        type: "flat",
        value: 8,
      },
    ],
  },
  {
    id: "ps_bellstrike_umbra_2",
    name: "Dark Strike",
    description: "Increases Critical DMG Bonus by 20%",
    martialArtId: "bellstrike_umbra",
    modifiers: [
      {
        stat: "CriticalDMGBonus",
        type: "flat",
        value: 20,
      },
    ],
  },

  /* ==================== SILKBIND DELUGE ==================== */
  {
    id: "ps_silkbind_deluge_1",
    name: "Flow Mastery",
    description: "Increases Agility-based defense by 12%",
    martialArtId: "silkbind_deluge",
    modifiers: [
      {
        stat: "PhysicalDefense",
        type: "scale",
        sourceStat: "Agility",
        ratio: 0.12,
      },
    ],
    notes: "Scales with Agility",
  },
  {
    id: "ps_silkbind_deluge_2",
    name: "Precision Enhancement",
    description: "Increases Precision Rate by 15%",
    martialArtId: "silkbind_deluge",
    modifiers: [
      {
        stat: "PrecisionRate",
        type: "flat",
        value: 15,
      },
    ],
  },

  /* ==================== SILKBIND JADE ==================== */
  {
    id: "ps_silkbind_jade_1",
    name: "Jade Resonance",
    description: "Increases Affinity DMG Bonus by 18%",
    martialArtId: "silkbind_jade",
    modifiers: [
      {
        stat: "AffinityDMGBonus",
        type: "flat",
        value: 18,
      },
    ],
  },
  {
    id: "ps_silkbind_jade_2",
    name: "Silk Fortification",
    description: "Adds 25 to Max HP per 10 Power",
    martialArtId: "silkbind_jade",
    modifiers: [
      {
        stat: "HP",
        type: "scale",
        sourceStat: "Power",
        ratio: 2.5,
      },
    ],
    notes: "Scales with Power stat",
  },

  /* ==================== STONESPLIT MIGHT ==================== */
  {
    id: "ps_stonesplit_might_1",
    name: "Stone Defense",
    description: "Increases Physical Defense by 20%",
    martialArtId: "stonesplit_might",
    modifiers: [
      {
        stat: "PhysicalDefense",
        type: "scale",
        sourceStat: "PhysicalDefense",
        ratio: 0.2,
      },
    ],
  },
  {
    id: "ps_stonesplit_might_2",
    name: "Crushing Power",
    description: "Increases Physical Attack by 18%",
    martialArtId: "stonesplit_might",
    modifiers: [
      {
        stat: "MinPhysicalAttack",
        type: "scale",
        sourceStat: "MinPhysicalAttack",
        ratio: 0.18,
      },
      {
        stat: "MaxPhysicalAttack",
        type: "scale",
        sourceStat: "MaxPhysicalAttack",
        ratio: 0.18,
      },
    ],
  },
  {
    id: "ps_stonesplit_might_3",
    name: "Armor Penetration",
    description: "Adds 8 to Physical Penetration",
    martialArtId: "stonesplit_might",
    modifiers: [
      {
        stat: "PhysicalPenetration",
        type: "flat",
        value: 8,
      },
    ],
  },

  /* ==================== BAMBOOCUT WIND ==================== */
  {
    id: "ps_bamboocut_wind_1",
    name: "Swift Strike",
    description: "Increases Agility-based damage by 15%",
    martialArtId: "bamboocut_wind",
    modifiers: [
      {
        stat: "MinPhysicalAttack",
        type: "scale",
        sourceStat: "Agility",
        ratio: 0.15,
      },
      {
        stat: "MaxPhysicalAttack",
        type: "scale",
        sourceStat: "Agility",
        ratio: 0.15,
      },
    ],
    notes: "Scales with Agility",
  },
  {
    id: "ps_bamboocut_wind_2",
    name: "Windfall Momentum",
    description: "Increases Momentum by 10",
    martialArtId: "bamboocut_wind",
    modifiers: [
      {
        stat: "Momentum",
        type: "flat",
        value: 10,
      },
    ],
  },
  {
    id: "ps_bamboocut_wind_3",
    name: "Wind Affinity",
    description: "Increases Affinity Rate by 12%",
    martialArtId: "bamboocut_wind",
    modifiers: [
      {
        stat: "AffinityRate",
        type: "flat",
        value: 12,
      },
    ],
  },
];
