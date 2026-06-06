import { ElementKey, Rotation } from "@/app/types";
import { InputStats, ElementStats } from "@/app/types";

export interface IdealGearResult {
  path: ElementKey;
  maxDamage: number;
  allocations: Record<string, number>; // number of lines
  stats: Record<string, number>; // total stat value from these lines
  specialLines: string[]; // 8 lines, one for each gear
  mode?: "exhaustive" | "fast";
  elapsedMs?: number;
  iterations?: number;
}

export class IdealGearCancelledError extends Error {
  constructor() {
    super("Ideal gear optimization cancelled");
    this.name = "IdealGearCancelledError";
  }
}

export type CandidateStat = 
  | "MaxPhysicalAttack"
  | "bellstrikeMax"
  | "CriticalRate"
  | "AffinityRate"
  | "CombatBoostAgainstBossUnits"
  | "AllMartialArtsBoost"
  | "ArtOfSwordDMGBoost"
  | "Momentum"
  | "Power";

export type RuleSet = {
  candidateStats: CandidateStat[];
  specialLinePools: CandidateStat[][];
  fixedLineStats: Record<string, { lines: number; valuePerLine: number }>;
  randomLineCount: number;
  baseGearBonus: Record<string, number>;
};

export type SearchState = {
  specialLines: string[];
  specialCounts: number[];
  tuningCounts: number[];
  totalCounts: number[];
  bonus: Record<string, number>;
  score: number;
};

export interface IdealGear {
  id: number;
  specialLine: string;
  tuningLines: string[];
}

export type DamageEvalResult = {
  dmg: number;
  totalRate: number;
  critRate: number;
};
