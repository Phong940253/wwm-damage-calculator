import { CandidateStat } from "./types";

export const TOTAL_LINES = 48;
export const MAX_LINES_PER_STAT = 8;
export const RANDOM_LINES_COUNT = 32;

export const CANDIDATE_STATS: CandidateStat[] = [
  "MaxPhysicalAttack",
  "bellstrikeMax",
  "CriticalRate",
  "AffinityRate",
  "CombatBoostAgainstBossUnits",
  "AllMartialArtsBoost",
  "ArtOfSwordDMGBoost",
  "Momentum",
  "Power",
];

export const SINGLE_LINE_STATS = new Set<CandidateStat>([
  "CombatBoostAgainstBossUnits",
  "AllMartialArtsBoost",
  "ArtOfSwordDMGBoost",
]);

export const SPECIAL_LINE_POOLS: CandidateStat[][] = [
  // 1-2: bellstrikeMax, MaxPhysicalAttack, Power, Momentum
  ["bellstrikeMax", "MaxPhysicalAttack", "Power", "Momentum"],
  ["bellstrikeMax", "MaxPhysicalAttack", "Power", "Momentum"],
  // 3-4: MaxPhysicalAttack
  ["MaxPhysicalAttack"],
  ["MaxPhysicalAttack"],
  // 5-6: CriticalRate, AffinityRate
  ["CriticalRate", "AffinityRate"],
  ["CriticalRate", "AffinityRate"],
  // 7-8: AffinityRate, CriticalRate, Power
  ["AffinityRate", "CriticalRate", "Power"],
  ["AffinityRate", "CriticalRate", "Power"],
];
