// app/gear/defaultGears.ts
import { CustomGear } from "../types";

export const DEFAULT_GEARS: CustomGear[] = [
  {
    id: "tpl_weapon_1",
    name: "Beginner Sword",
    slot: "weapon_1",
    main: { stat: "MinPhysicalAttack", value: 30 },
    subs: [
      { stat: "MaxPhysicalAttack", value: 40 },
      { stat: "CriticalRate", value: 2 },
    ],
    addition: { stat: "PhysicalDMGBonus", value: 3 },
  },
  {
    id: "tpl_weapon_2",
    name: "Training Blade",
    slot: "weapon_2",
    main: { stat: "MaxPhysicalAttack", value: 35 },
    subs: [{ stat: "PrecisionRate", value: 3 }],
    addition: { stat: "FlatDamage", value: 20 },
  },
  {
    id: "tpl_ring",
    name: "Copper Ring",
    slot: "ring",
    main: { stat: "CriticalRate", value: 3 },
    subs: [{ stat: "AffinityRate", value: 2 }],
    addition: { stat: "HP", value: 500 },
  },
  {
    id: "tpl_talisman",
    name: "Old Talisman",
    slot: "talisman",
    main: { stat: "AffinityRate", value: 4 },
    subs: [{ stat: "CriticalDMGBonus", value: 5 }],
    addition: { stat: "PhysicalResistance", value: 2 },
  },
  {
    id: "tpl_head",
    name: "Cloth Headwrap",
    slot: "head",
    main: { stat: "HP", value: 800 },
    subs: [{ stat: "PhysicalDefense", value: 15 }],
    addition: { stat: "PhysicalDMGReduction", value: 1 },
  },
  {
    id: "tpl_chest",
    name: "Leather Chest",
    slot: "chest",
    main: { stat: "PhysicalDefense", value: 40 },
    subs: [{ stat: "HP", value: 1200 }],
    addition: { stat: "PhysicalResistance", value: 2 },
  },
  {
    id: "tpl_hand",
    name: "Leather Gloves",
    slot: "hand",
    main: { stat: "PrecisionRate", value: 2 },
    subs: [{ stat: "CriticalRate", value: 1 }],
    addition: { stat: "FlatDamage", value: 15 },
  },
  {
    id: "tpl_leg",
    name: "Leather Boots",
    slot: "leg",
    main: { stat: "PhysicalDMGReduction", value: 2 },
    subs: [{ stat: "HP", value: 600 }],
    addition: { stat: "PhysicalDefense", value: 20 },
  },
];
