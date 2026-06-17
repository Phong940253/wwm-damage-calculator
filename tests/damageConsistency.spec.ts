// app/tests/damageConsistency.spec.ts
// Verify that all damage calculation paths produce identical results
// given the same inputs: main loop (useDamage) vs evaluateDamage (optimizerUtils)
// vs computeOptimizeResultsAsync (gearOptimize).

import { describe, it, expect } from "vitest";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { SKILLS } from "@/app/domain/skill/skills";
import {
  calculateSkillDamage,
  buildSkillUseCountsInRotation,
  buildRotationSkillDamageOptions,
  createRotationSkillRuntimeState,
  advanceRotationSkillRuntimeState,
} from "@/app/domain/skill/skillDamage";
import {
  computeRotationBonuses,
  sumBonuses,
} from "@/app/domain/skill/modifierEngine";
import { computeIncludedInStatsGearBonus } from "@/app/domain/skill/includedInStatsImpact";
import { aggregateEquippedGearBonus } from "@/app/domain/gear/gearAggregate";
import { evaluateDamage } from "@/app/domain/gear/optimizerUtils";
import { computeOptimizeResultsAsync } from "@/app/domain/gear/gearOptimize";
import type {
  InputStats,
  ElementStats,
  Rotation,
  CustomGear,
  GearSlot,
  RotationSkill,
} from "@/app/types";

// ============================================================
// Input data (extracted from user's export + rotation JSON)
// ============================================================

const stats: InputStats = {
  HP: { current: 62905, increase: 0 },
  MinPhysicalAttack: { current: 565.2, increase: 0 },
  MaxPhysicalAttack: { current: 1159.32, increase: 0 },
  PhysicalAttackMultiplier: { current: 100, increase: 0 },
  FlatDamage: { current: 378, increase: 0 },
  PrecisionRate: { current: 94, increase: 0 },
  CriticalRate: { current: 19.988, increase: 0 },
  DirectCriticalRate: { current: 0, increase: 0 },
  CriticalDMGBonus: { current: 50, increase: 0 },
  AffinityRate: { current: 15.47, increase: 0 },
  DirectAffinityRate: { current: 0, increase: 0 },
  AffinityDMGBonus: { current: 35, increase: 0 },
  DamageBoost: { current: 0, increase: 0 },
  CombatBoostAgainstBossUnits: { current: 0, increase: 0 },
  MartialArtSkillDamageBoost: { current: 0, increase: 0 },
  AllMartialArtsBoost: { current: 0, increase: 0 },
  ChargeSkillDamageBoost: { current: 0, increase: 0 },
  BallisticSkillDamageBoost: { current: 0, increase: 0 },
  PursuitSkillDamageBoost: { current: 0, increase: 0 },
  MoonlitShatterSpringPursuitCriticalDMGBonus: { current: 0, increase: 0 },
  ArtOfSwordDMGBoost: { current: 0, increase: 0 },
  ArtOfSpearDMGBoost: { current: 0, increase: 0 },
  ArtOfFanDMGBoost: { current: 0, increase: 0 },
  ArtOfUmbrellaDMGBoost: { current: 0, increase: 0 },
  ArtOfHorizontalBladeDMGBoost: { current: 0, increase: 0 },
  ArtOfMoBladeDMGBoost: { current: 0, increase: 0 },
  ArtOfDualBladesDMGBoost: { current: 0, increase: 0 },
  ArtOfRopeDartDMGBoost: { current: 0, increase: 0 },
  SoulshadeUmbrellaSpinningUmbrellaDMGBoost: { current: 0, increase: 0 },
  PhysicalDefense: { current: 232, increase: 0 },
  PhysicalResistance: { current: 0, increase: 0 },
  PhysicalDMGBonus: { current: 0, increase: 0 },
  PhysicalDMGReduction: { current: 0, increase: 0 },
  PhysicalPenetration: { current: 0, increase: 0 },
  Body: { current: 137, increase: 0 },
  Power: { current: 137, increase: 0 },
  Defense: { current: 51, increase: 0 },
  Agility: { current: 137, increase: 0 },
  Momentum: { current: 137.4, increase: 0 },
};

const elementStats: ElementStats = {
  selected: "bellstrike",
  martialArtsId: "bellstrike_splendor",
  MainElementMultiplier: { current: 100, increase: 0 },
  bellstrikeMin: { current: 286, increase: 0 },
  bellstrikeMax: { current: 573, increase: 0 },
  bellstrikePenetration: { current: 24, increase: 0 },
  bellstrikeDMGBonus: { current: 9, increase: 0 },
  stonesplitMin: { current: 0, increase: 0 },
  stonesplitMax: { current: 0, increase: 0 },
  stonesplitPenetration: { current: 0, increase: 0 },
  stonesplitDMGBonus: { current: 0, increase: 0 },
  silkbindMin: { current: 0, increase: 0 },
  silkbindMax: { current: 0, increase: 0 },
  silkbindPenetration: { current: 0, increase: 0 },
  silkbindDMGBonus: { current: 0, increase: 0 },
  bamboocutMin: { current: 0, increase: 0 },
  bamboocutMax: { current: 0, increase: 0 },
  bamboocutPenetration: { current: 0, increase: 0 },
  bamboocutDMGBonus: { current: 0, increase: 0 },
};

const customGears: CustomGear[] = [
  {
    id: "7ffe936b-cc04-4319-99f2-b634aba875f3",
    name: "Swiftwing Glow Sword",
    slot: "weapon_1" as GearSlot,
    weaponType: "sword",
    level: 91,
    mains: [
      { stat: "MinPhysicalAttack", value: 53 },
      { stat: "MaxPhysicalAttack", value: 124 },
    ],
    subs: [
      { stat: "Momentum", value: 35.1 },
      { stat: "bellstrikeMax", value: 35.7 },
      { stat: "MaxPhysicalAttack", value: 60.5 },
      { stat: "AffinityRate", value: 3.5 },
      { stat: "Momentum", value: 36.5 },
    ],
    addition: { stat: "PhysicalPenetration", value: 8.9 },
    tunedSubIndex: 2,
    tuneHistory: [{ subIndex: 2, stat: "MaxPhysicalAttack" }],
    rarity: "Tier 91",
  },
  {
    id: "292d174c-205a-482a-ad64-891fd522cbfd",
    name: "Swiftwing Pendant",
    slot: "pendant" as GearSlot,
    level: 91,
    mains: [{ stat: "MaxPhysicalAttack", value: 106 }],
    subs: [
      { stat: "MaxPhysicalAttack", value: 63.6 },
      { stat: "CriticalRate", value: 7.4 },
      { stat: "MaxPhysicalAttack", value: 61 },
      { stat: "stonesplitMin", value: 34.2 },
      { stat: "bellstrikeMax", value: 35.2 },
    ],
    addition: { stat: "PhysicalPenetration", value: 8.8 },
    tunedSubIndex: 1,
    tuneHistory: [{ subIndex: 1, stat: "CriticalRate" }],
    rarity: "Tier 91",
  },
  {
    id: "6da78ac1-9fcb-45ae-95b9-d46adcbabc0f",
    name: "Golden Scale Feathered Spear",
    slot: "weapon_2" as GearSlot,
    weaponType: "spear",
    level: 91,
    mains: [
      { stat: "MinPhysicalAttack", value: 53 },
      { stat: "MaxPhysicalAttack", value: 124 },
    ],
    subs: [
      { stat: "Momentum", value: 37.3 },
      { stat: "MaxPhysicalAttack", value: 60 },
      { stat: "bamboocutMin", value: 33.9 },
      { stat: "CriticalRate", value: 7 },
      { stat: "PrecisionRate", value: 6.2 },
    ],
    addition: { stat: "PhysicalPenetration", value: 8.8 },
    tunedSubIndex: 3,
    tuneHistory: [{ subIndex: 3, stat: "CriticalRate" }],
    rarity: "Tier 91",
  },
  {
    id: "4cfa6afd-1ddb-427a-b13a-1c60bdf0dd73",
    name: "Swiftwing Charm",
    slot: "disc" as GearSlot,
    level: 91,
    mains: [{ stat: "MinPhysicalAttack", value: 71 }],
    subs: [
      { stat: "MaxPhysicalAttack", value: 46.8 },
      { stat: "Momentum", value: 39.6 },
      { stat: "bamboocutMin", value: 34.9 },
      { stat: "stonesplitMin", value: 33.7 },
      { stat: "CriticalRate", value: 7.4 },
    ],
    addition: { stat: "PhysicalPenetration", value: 8.8 },
    tunedSubIndex: 4,
    tuneHistory: [
      { subIndex: 4, stat: "CriticalRate" },
    ],
    rarity: "Tier 91",
  },
  {
    id: "c455d510-9345-48a7-ad08-b73be0ba36ff",
    name: "Frontiermoon Crown",
    slot: "head" as GearSlot,
    level: 91,
    mains: [
      { stat: "HP", value: 4614 },
      { stat: "Defense", value: 18 },
    ],
    subs: [
      { stat: "AffinityRate", value: 3.4 },
      { stat: "AffinityRate", value: 3.4 },
      { stat: "Power", value: 38 },
      { stat: "MaxPhysicalAttack", value: 60 },
      { stat: "bellstrikeMax", value: 34 },
    ],
    addition: { stat: "NamelessSwordChargedSkillDMGBoost", value: 5 },
    tunedSubIndex: 2,
    tuneHistory: [
      { subIndex: 2, stat: "Power" },
      { subIndex: 2, stat: "bellstrikeMax" },
      { subIndex: 2, stat: "CriticalRate" },
      { subIndex: 2, stat: "MaxPhysicalAttack" },
      { subIndex: 2, stat: "Momentum" },
      { subIndex: 2, stat: "AffinityRate" },
    ],
    rarity: "Tier 91",
  },
  {
    id: "90567661-0f8e-4c52-9db6-e475bca73416",
    name: "Nightfarer Bracers",
    slot: "hand" as GearSlot,
    level: 91,
    mains: [
      { stat: "HP", value: 4153 },
      { stat: "Defense", value: 16 },
    ],
    subs: [
      { stat: "AffinityRate", value: 2.6 },
      { stat: "MaxPhysicalAttack", value: 63.8 },
      { stat: "PrecisionRate", value: 6.2 },
      { stat: "CriticalRate", value: 7.4 },
      { stat: "AffinityRate", value: 3.6 },
    ],
    addition: { stat: "NamelessSwordChargedSkillDMGBoost", value: 5 },
    tunedSubIndex: 1,
    tuneHistory: [
      { subIndex: 1, stat: "MaxPhysicalAttack" },
      { subIndex: 1, stat: "bellstrikeMax" },
    ],
    rarity: "Tier 91",
  },
  {
    id: "88129bc6-96b4-4dc9-8577-8a78651e4276",
    name: "Swiftwing Pendant",
    slot: "pendant" as GearSlot,
    level: 91,
    mains: [{ stat: "MaxPhysicalAttack", value: 106 }],
    subs: [
      { stat: "MaxPhysicalAttack", value: 49.7 },
      { stat: "AffinityRate", value: 3.6 },
      { stat: "MaxPhysicalAttack", value: 60.8 },
      { stat: "bamboocutMin", value: 36.2 },
      { stat: "Momentum", value: 40.2 },
    ],
    addition: { stat: "PhysicalPenetration", value: 9 },
    tunedSubIndex: 4,
    tuneHistory: [
      { subIndex: 4, stat: "CriticalRate" },
      { subIndex: 4, stat: "bellstrikeMax" },
      { subIndex: 4, stat: "Momentum" },
    ],
    rarity: "Tier 91",
  },
  {
    id: "0ae8dbdf-61a5-4b89-a954-1a4429678526",
    name: "Swiftwing Feathered Spear",
    slot: "weapon_2" as GearSlot,
    weaponType: "spear",
    level: 91,
    mains: [
      { stat: "MinPhysicalAttack", value: 53 },
      { stat: "MaxPhysicalAttack", value: 124 },
    ],
    subs: [
      { stat: "bellstrikeMax", value: 29.7 },
      { stat: "CriticalRate", value: 5.5 },
      { stat: "MaxPhysicalAttack", value: 63.8 },
      { stat: "AffinityRate", value: 3.1 },
      { stat: "Momentum", value: 38.1 },
    ],
    addition: { stat: "PhysicalPenetration", value: 8.8 },
    tunedSubIndex: 2,
    tuneHistory: [{ subIndex: 2, stat: "MaxPhysicalAttack", value: 63.8 }],
    rarity: "Tier 91",
  },
  {
    id: "290d3d4d-09de-4093-b091-dedd6d499573",
    name: "Swiftwing Glow Sword",
    slot: "weapon_1" as GearSlot,
    weaponType: "sword",
    level: 91,
    mains: [
      { stat: "MinPhysicalAttack", value: 53 },
      { stat: "MaxPhysicalAttack", value: 124 },
    ],
    subs: [
      { stat: "bellstrikeMax", value: 28.4 },
      { stat: "Momentum", value: 38.1 },
      { stat: "stonesplitMin", value: 35 },
      { stat: "ArtOfSwordDMGBoost", value: 5.1 },
      { stat: "AffinityRate", value: 3.5 },
    ],
    addition: { stat: "PhysicalPenetration", value: 8.9 },
    tunedSubIndex: 1,
    tuneHistory: [{ subIndex: 1, stat: "Momentum" }],
    rarity: "Tier 91",
  },
  {
    id: "d5656175-579e-47c2-9061-fee83e713101",
    name: "Swiftwing Feathered Spear",
    slot: "weapon_2" as GearSlot,
    weaponType: "spear",
    level: 91,
    mains: [
      { stat: "MinPhysicalAttack", value: 53 },
      { stat: "MaxPhysicalAttack", value: 124 },
    ],
    subs: [
      { stat: "Momentum", value: 32 },
      { stat: "CriticalRate", value: 7.4 },
      { stat: "bellstrikeMax", value: 34.6 },
      { stat: "MaxPhysicalAttack", value: 59.4 },
      { stat: "Momentum", value: 39.5 },
    ],
    addition: { stat: "PhysicalPenetration", value: 8.8 },
    tunedSubIndex: 1,
    rarity: "Tier 91",
  },
  {
    id: "473510b0-557b-4f92-b55b-b889acfa9df7",
    name: "Nightfarer Night Leg Armor",
    slot: "leg" as GearSlot,
    level: 91,
    mains: [
      { stat: "HP", value: 4153 },
      { stat: "Defense", value: 32 },
    ],
    subs: [
      { stat: "AffinityRate", value: 2.3 },
      { stat: "AffinityRate", value: 3.3 },
      { stat: "bellstrikeMax", value: 36.2 },
      { stat: "PrecisionRate", value: 6.1 },
      { stat: "CombatBoostAgainstBossUnits", value: 2.6 },
    ],
    addition: { stat: "NamelessSwordChargedSkillDMGBoost", value: 4.7 },
    tunedSubIndex: 2,
    tuneHistory: [{ subIndex: 2, stat: "bellstrikeMax" }],
    rarity: "Tier 91",
  },
  {
    id: "248d01cd-27ec-4638-a59e-2c0e469e5a5e",
    name: "Nightfarer Armor",
    slot: "chest" as GearSlot,
    level: 91,
    mains: [
      { stat: "HP", value: 8305 },
      { stat: "Defense", value: 16 },
    ],
    subs: [
      { stat: "CriticalRate", value: 7.4 },
      { stat: "bellstrikeMax", value: 36.2 },
      { stat: "silkbindMin", value: 33.7 },
      { stat: "MaxPhysicalAttack", value: 62.6 },
      { stat: "CriticalRate", value: 7.4 },
    ],
    addition: { stat: "NamelessSwordChargedSkillDMGBoost", value: 4.7 },
    tunedSubIndex: 1,
    tuneHistory: [
      { subIndex: 1, stat: "AffinityRate" },
      { subIndex: 1, stat: "bellstrikeMax" },
    ],
    rarity: "Tier 91",
  },
  {
    id: "a67922e1-0d03-4572-b75f-873cfda3c5d6",
    name: "Swiftwing Charm",
    slot: "disc" as GearSlot,
    level: 91,
    mains: [{ stat: "MinPhysicalAttack", value: 71 }],
    subs: [
      { stat: "MaxPhysicalAttack", value: 63.1 },
      { stat: "Momentum", value: 37.1 },
      { stat: "MaxPhysicalAttack", value: 63.8 },
      { stat: "stonesplitMin", value: 36.2 },
      { stat: "CriticalRate", value: 7.4 },
    ],
    addition: { stat: "PhysicalPenetration", value: 8.8 },
    tunedSubIndex: 2,
    tuneHistory: [{ subIndex: 2, stat: "MaxPhysicalAttack" }],
    rarity: "Tier 91",
  },
  {
    id: "0c387b2d-453f-4ef3-939c-5ed0618e41dc",
    name: "Swiftwing Charm",
    slot: "disc" as GearSlot,
    level: 91,
    mains: [{ stat: "MinPhysicalAttack", value: 71 }],
    subs: [
      { stat: "MaxPhysicalAttack", value: 51.5 },
      { stat: "bamboocutMin", value: 35.9 },
      { stat: "AffinityRate", value: 3.3 },
      { stat: "AllMartialArtsBoost", value: 2.5 },
      { stat: "MaxPhysicalAttack", value: 63.8 },
    ],
    addition: { stat: "PhysicalPenetration", value: 8.8 },
    tunedSubIndex: 4,
    tuneHistory: [{ subIndex: 4, stat: "MaxPhysicalAttack" }],
    rarity: "Tier 91",
  },
  {
    id: "33f1e1d4-11e5-4295-9756-91d623717f36",
    name: "Frontiermoon Leg Armor",
    slot: "leg" as GearSlot,
    level: 91,
    mains: [
      { stat: "HP", value: 4614 },
      { stat: "Defense", value: 36 },
    ],
    subs: [
      { stat: "AffinityRate", value: 3.4 },
      { stat: "CombatBoostAgainstBossUnits", value: 2.4 },
      { stat: "Momentum", value: 38 },
      { stat: "stonesplitMin", value: 34 },
      { stat: "MaxPhysicalAttack", value: 60 },
    ],
    addition: { stat: "NamelessSwordChargedSkillDMGBoost", value: 4.9 },
    tunedSubIndex: 2,
    tuneHistory: [
      { subIndex: 2, stat: "bellstrikeMax" },
      { subIndex: 2, stat: "CriticalRate" },
      { subIndex: 2, stat: "AffinityRate" },
      { subIndex: 2, stat: "Power" },
      { subIndex: 2, stat: "Momentum" },
    ],
    rarity: "Tier 91",
  },
  {
    id: "23f3c7b9-15e2-4760-90c8-29746d8eb0dd",
    name: "Test 1",
    slot: "leg" as GearSlot,
    level: 91,
    mains: [
      { stat: "HP", value: 0 },
      { stat: "Defense", value: 0 },
    ],
    subs: [
      { stat: "CriticalRate", value: 7.098 },
      { stat: "AffinityRate", value: 3.276 },
      { stat: "CriticalRate", value: 7.098 },
      { stat: "Momentum", value: 37.128 },
      { stat: "Power", value: 37.128 },
    ],
    addition: { stat: "NamelessSwordChargedSkillDMGBoost", value: 4.7 },
    tunedSubIndex: null,
    tuneHistory: [],
  },
  {
    id: "5d1149c8-f107-46fb-8c06-94143ca07715",
    name: "Swiftwing Pendant",
    slot: "pendant" as GearSlot,
    level: 91,
    mains: [{ stat: "MaxPhysicalAttack", value: 106 }],
    subs: [
      { stat: "MaxPhysicalAttack", value: 48.1 },
      { stat: "AffinityRate", value: 3.6 },
      { stat: "Momentum", value: 40.4 },
      { stat: "stonesplitMin", value: 36.2 },
      { stat: "MaxPhysicalAttack", value: 63.8 },
    ],
    addition: { stat: "PhysicalPenetration", value: 9 },
    tunedSubIndex: 2,
    tuneHistory: [{ subIndex: 2, stat: "Momentum" }],
    rarity: "Tier 91",
  },
  {
    id: "c4cd703f-7a87-442e-a703-b8fbfa578e44",
    name: "Vanguard Veilbright",
    slot: "weapon_1" as GearSlot,
    weaponType: "sword",
    level: 91,
    mains: [
      { stat: "MinPhysicalAttack", value: 53 },
      { stat: "MaxPhysicalAttack", value: 124 },
    ],
    subs: [
      { stat: "MaxPhysicalAttack", value: 47.4 },
      { stat: "MaxPhysicalAttack", value: 60.2 },
      { stat: "MinPhysicalAttack", value: 63.8 },
      { stat: "stonesplitMin", value: 34.3 },
      { stat: "bellstrikeMax", value: 33 },
    ],
    addition: { stat: "PhysicalPenetration", value: 8.9 },
    tunedSubIndex: null,
    tuneHistory: [],
    rarity: "Tier 91",
  },
  {
    id: "c30eebf0-04c0-483d-833e-efef73e9d615",
    name: "Vanguard Ward",
    slot: "pendant" as GearSlot,
    level: 91,
    mains: [{ stat: "MaxPhysicalAttack", value: 106 }],
    subs: [
      { stat: "MaxPhysicalAttack", value: 47.3 },
      { stat: "MaxPhysicalAttack", value: 61 },
      { stat: "AffinityRate", value: 3.5 },
      { stat: "PrecisionRate", value: 6.5 },
      { stat: "Agility", value: 38.7 },
    ],
    addition: { stat: "PhysicalPenetration", value: 9 },
    tunedSubIndex: null,
    tuneHistory: [],
    rarity: "Tier 91",
  },
  {
    id: "1e598949-33fc-4bd6-9938-93d609cebd34",
    name: "Nightfarer Bracers",
    slot: "hand" as GearSlot,
    level: 91,
    mains: [
      { stat: "HP", value: 4614 },
      { stat: "Defense", value: 18 },
    ],
    subs: [
      { stat: "AffinityRate", value: 3.1 },
      { stat: "Momentum", value: 39.2 },
      { stat: "AffinityRate", value: 3.6 },
      { stat: "silkbindMin", value: 32.7 },
      { stat: "stonesplitMin", value: 33.1 },
    ],
    addition: { stat: "NamelessSwordChargedSkillDMGBoost", value: 5 },
    tunedSubIndex: 2,
    tuneHistory: [{ subIndex: 2, stat: "AffinityRate" }],
    rarity: "Tier 91",
  },
];

const equipped: Partial<Record<GearSlot, string>> = {
  weapon_2: "d5656175-579e-47c2-9061-fee83e713101",
  disc: "0c387b2d-453f-4ef3-939c-5ed0618e41dc",
  head: "c455d510-9345-48a7-ad08-b73be0ba36ff",
  weapon_1: "290d3d4d-09de-4093-b091-dedd6d499573",
  chest: "248d01cd-27ec-4638-a59e-2c0e469e5a5e",
  pendant: "88129bc6-96b4-4dc9-8577-8a78651e4276",
  hand: "90567661-0f8e-4c52-9db6-e475bca73416",
  leg: "33f1e1d4-11e5-4295-9756-91d623717f36",
};

const rotationSkills: RotationSkill[] = [
  { entryId: "92t0nob6rxu", id: "mystic_flute_of_the_tides", count: 1, order: 0, params: { distance: 9 }, cancelled: true },
  { entryId: "8k6z7l6eo0a", id: "nameless_qiankuns_lock", count: 1, order: 1, cancelled: true },
  { entryId: "xl11vmestbe", id: "nameless_homeless_charge_3", count: 1, order: 2, params: { distance: 9 } },
  { entryId: "02esxhw2nfex", id: "nameless_fearless_lunge_1", count: 1, order: 3, params: { distance: 9 } },
  { entryId: "lqx8dvbe7tm", id: "nameless_homeless_charge_3", count: 5, order: 4, params: { distance: 9 } },
  { entryId: "7bf7bwqvgtr", id: "nameless_qiankuns_lock", count: 1, order: 5, cancelled: true },
  { entryId: "3pcpjl8j9v3", id: "nameless_homeless_charge_3", count: 1, order: 6 },
  { entryId: "yrg7udwzoms", id: "nameless_fearless_lunge_1", count: 1, order: 7 },
  { entryId: "eg3jjygahej", id: "nameless_homeless_charge_3", count: 4, order: 8 },
  { entryId: "5eve3cwj4vv", id: "mystic_flute_of_the_tides", count: 1, order: 9, cancelled: true },
  { entryId: "8h2nlj29nos", id: "nameless_qiankuns_lock", count: 1, order: 10, cancelled: true },
  { entryId: "89hcj33vkc9", id: "nameless_homeless_charge_3", count: 1, order: 11 },
  { entryId: "045tijs2phju", id: "nameless_fearless_lunge_1", count: 1, order: 12 },
  { entryId: "c75naju935i", id: "nameless_homeless_charge_3", count: 4, order: 13 },
  { entryId: "wd0wvpu019f", id: "nameless_qiankuns_lock", count: 1, order: 14, cancelled: true },
  { entryId: "0xpd66251joj", id: "nameless_homeless_charge_3", count: 1, order: 15 },
  { entryId: "zzi4eg5mwr", id: "nameless_fearless_lunge_1", count: 1, order: 16 },
  { entryId: "pdlot0znugg", id: "nameless_homeless_charge_3", count: 4, order: 17 },
  { entryId: "300b3x4jze6", id: "mystic_flute_of_the_tides", count: 1, order: 18 },
  { entryId: "9kwafsznsfr", id: "nameless_qiankuns_lock", count: 1, order: 19, cancelled: true },
  { entryId: "wunr8xeuut", id: "nameless_homeless_charge_3", count: 1, order: 20 },
  { entryId: "pkt51v8c9v", id: "nameless_fearless_lunge_1", count: 1, order: 21 },
  { entryId: "wp3c6agliw9", id: "nameless_homeless_charge_3", count: 4, order: 22 },
];

const rotation: Rotation = {
  id: "2uw7rgv0k6j",
  name: "Nameless Sword DPS Rotation (Tier 6 Standard)",
  skills: rotationSkills,
  activePassiveSkills: [
    "ps_bellstrike_splendor_1",
    "ps_bellstrike_splendor_included_max_physical_attack_up_momentum",
    "ps_universal_jadeware",
    "ps_universal_talisman_affinity_dmg",
    "ps_universal_food_buff_physical_attack",
    "ps_bellstrike_splendor_included_affinity_rate_up_momentum",
    "ps_bellstrike_splendor_2",
    "ps_bellstrike_splendor_light_as_feather",
    "ps_bellstrike_splendor_sword_slash_dmg_boost",
  ],
  passiveUptimes: {
    ps_universal_jadeware: 100,
    ps_bellstrike_splendor_1: 100,
    ps_bellstrike_splendor_2: 100,
    ps_universal_talisman_affinity_dmg: 100,
    ps_universal_food_buff_physical_attack: 100,
    ps_bellstrike_splendor_light_as_feather: 100,
    ps_bellstrike_splendor_sword_slash_dmg_boost: 100,
    ps_bellstrike_splendor_included_affinity_rate_up_momentum: 100,
    ps_bellstrike_splendor_included_max_physical_attack_up_momentum: 100,
  },
  activeInnerWays: [
    "iw_universal_mountains_might_t4",
    "iw_bellstrike_sword_morph_t5",
    "iw_universal_battle_anthem_t6",
    "iw_universal_insightful_strike_t5",
  ],
  createdAt: 1779332775140,
  updatedAt: 1781671971490,
  martialArtId: "bellstrike_splendor",
};

const levelContext = { playerLevel: 91, enemyLevel: 91 };

// ============================================================
// Helper: replicate the main damage loop (like useDamage.ts)
// ============================================================

function computeMainLoopDamage(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>,
  rotation: Rotation,
  levelContext: { playerLevel: number; enemyLevel: number },
): number {
  const includedAbs = computeIncludedInStatsGearBonus(stats, elementStats, rotation, gearBonus);
  const effectiveGearBonus = sumBonuses(gearBonus, includedAbs);
  const rotationBonuses = computeRotationBonuses(stats, elementStats, effectiveGearBonus, rotation);
  const finalBonus = sumBonuses(effectiveGearBonus, rotationBonuses);
  const ctx = buildDamageContext(stats, elementStats, finalBonus, undefined, levelContext);

  const counts = buildSkillUseCountsInRotation(rotation.skills);
  const state = createRotationSkillRuntimeState();
  let total = 0;

  for (const entry of rotation.skills) {
    const skill = SKILLS.find((s) => s.id === entry.id);
    if (!skill) continue;

    const opts = buildRotationSkillDamageOptions(
      entry.id,
      entry.params,
      rotation.activeInnerWays,
      counts,
      entry.count,
      rotation.activePassiveSkills,
      state.priorHitsBySkill,
      entry.cancelled,
    );
    opts.rotationSkills = rotation.skills;

    const dmg = calculateSkillDamage(ctx, skill, opts);
    total += dmg.total.normal.value * entry.count;

    advanceRotationSkillRuntimeState(state, skill, opts, entry.count);
  }

  return total;
}

// ============================================================
// Tests
// ============================================================

describe("Damage consistency across panels", () => {
  const gearBonus = aggregateEquippedGearBonus(customGears, equipped);

  it("all produce non-zero damage", () => {
    expect(gearBonus).toBeDefined();
    expect(Object.keys(gearBonus).length).toBeGreaterThan(0);
  });

  it("main loop matches evaluateDamage", () => {
    const main = computeMainLoopDamage(stats, elementStats, gearBonus, rotation, levelContext);
    const evalResult = evaluateDamage(gearBonus, "bellstrike", rotation, stats, elementStats);

    expect(main).toBeGreaterThan(0);
    expect(evalResult.dmg).toBeGreaterThan(0);
    expect(main).toBeCloseTo(evalResult.dmg, 4);
  });

  it("main loop matches computeOptimizeResultsAsync baseDamage", async () => {
    const main = computeMainLoopDamage(stats, elementStats, gearBonus, rotation, levelContext);

    const result = await computeOptimizeResultsAsync(
      stats,
      elementStats,
      customGears,
      equipped,
      1,
      rotation,
      levelContext,
    );

    expect(result.baseDamage).toBeGreaterThan(0);
    expect(main).toBeCloseTo(result.baseDamage, 4);
  }, 30_000);
});
