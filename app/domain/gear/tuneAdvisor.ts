import { ElementKey } from "@/app/constants";
import type { CustomGear, GearSlot } from "@/app/types";
import { getAdditionStatsBySlot } from "./additionRules";

export type TuneHistoryEntry = {
  subIndex: number;
  stat: string;
  value?: number;
};

export type TuneStatKey =
  | "MinPhysicalAttack"
  | "MaxPhysicalAttack"
  | "bellstrikeMin"
  | "bellstrikeMax"
  | "stonesplitMin"
  | "stonesplitMax"
  | "silkbindMin"
  | "silkbindMax"
  | "bamboocutMin"
  | "bamboocutMax"
  | "bellstrikePenetration"
  | "stonesplitPenetration"
  | "silkbindPenetration"
  | "bamboocutPenetration"
  | "PhysicalPenetration"
  | "PhysicalResistance"
  | "CriticalRate"
  | "AffinityRate"
  | "CombatBoostAgainstBossUnits"
  | "AllMartialArtsBoost"
  | "ArtOfSwordDMGBoost"
  | "NamelessSwordChargedSkillDMGBoost"
  | "Power"
  | "Momentum"
  | "Agility";

type TuneStatRange = { minPerLine: number; maxPerLine: number };

const COMMON_TUNE_STATS: TuneStatKey[] = [
  "MinPhysicalAttack",
  "MaxPhysicalAttack",
  "CriticalRate",
  "Power",
  "AffinityRate",
];

function getElementAttackTuneStats(
  element: "silkbind" | "stonesplit" | "bamboocut",
): TuneStatKey[] {
  if (element === "silkbind") return ["silkbindMin", "silkbindMax"];
  if (element === "stonesplit") return ["stonesplitMin", "stonesplitMax"];
  return ["bamboocutMin", "bamboocutMax"];
}

const DEFAULT_TUNE_LIMITS: Record<TuneStatKey, TuneStatRange> = {
  MinPhysicalAttack: { minPerLine: 31.9, maxPerLine: 63.8 },
  MaxPhysicalAttack: { minPerLine: 31.9, maxPerLine: 63.8 },
  bellstrikeMin: { minPerLine: 18.1, maxPerLine: 36.2 },
  bellstrikeMax: { minPerLine: 18.1, maxPerLine: 36.2 },
  stonesplitMin: { minPerLine: 18.1, maxPerLine: 36.2 },
  stonesplitMax: { minPerLine: 18.1, maxPerLine: 36.2 },
  silkbindMin: { minPerLine: 18.1, maxPerLine: 36.2 },
  silkbindMax: { minPerLine: 18.1, maxPerLine: 36.2 },
  bamboocutMin: { minPerLine: 18.1, maxPerLine: 36.2 },
  bamboocutMax: { minPerLine: 18.1, maxPerLine: 36.2 },
  bellstrikePenetration: { minPerLine: 6.5, maxPerLine: 10.8 },
  stonesplitPenetration: { minPerLine: 6.5, maxPerLine: 10.8 },
  silkbindPenetration: { minPerLine: 6.5, maxPerLine: 10.8 },
  bamboocutPenetration: { minPerLine: 6.5, maxPerLine: 10.8 },
  PhysicalPenetration: { minPerLine: 5.4, maxPerLine: 9.0 },
  PhysicalResistance: { minPerLine: 5.4, maxPerLine: 9.0 },
  CriticalRate: { minPerLine: 3.7, maxPerLine: 7.4 },
  AffinityRate: { minPerLine: 1.8, maxPerLine: 3.6 },
  CombatBoostAgainstBossUnits: { minPerLine: 2.6, maxPerLine: 2.6 },
  AllMartialArtsBoost: { minPerLine: 2.6, maxPerLine: 2.6 },
  ArtOfSwordDMGBoost: { minPerLine: 5.2, maxPerLine: 5.2 },
  NamelessSwordChargedSkillDMGBoost: { minPerLine: 5.0, maxPerLine: 5.0 },
  Power: { minPerLine: 20.2, maxPerLine: 40.4 },
  Momentum: { minPerLine: 20.2, maxPerLine: 40.4 },
  Agility: { minPerLine: 20.2, maxPerLine: 40.4 },
};

export const BELLSTRIKE_SPLENDOR_LEVEL_91_LIMITS: Partial<
  Record<TuneStatKey, TuneStatRange>
> = {
  MaxPhysicalAttack: { minPerLine: 31.9, maxPerLine: 63.8 },
  bellstrikeMax: { minPerLine: 18.1, maxPerLine: 36.2 },
  CriticalRate: { minPerLine: 3.7, maxPerLine: 7.4 },
  AffinityRate: { minPerLine: 1.8, maxPerLine: 3.6 },
  Power: { minPerLine: 20.2, maxPerLine: 40.4 },
  Momentum: { minPerLine: 20.2, maxPerLine: 40.4 },
};

export const LEVEL_91_PENETRATION_TUNE_LIMITS: Partial<
  Record<TuneStatKey, TuneStatRange>
> = {
  bellstrikePenetration: { minPerLine: 6.5, maxPerLine: 10.8 },
  stonesplitPenetration: { minPerLine: 6.5, maxPerLine: 10.8 },
  silkbindPenetration: { minPerLine: 6.5, maxPerLine: 10.8 },
  bamboocutPenetration: { minPerLine: 6.5, maxPerLine: 10.8 },
  PhysicalPenetration: { minPerLine: 5.4, maxPerLine: 9.0 },
};

export function getTuneSystemStatPool(
  selectedElement: ElementKey,
): TuneStatKey[] {
  if (selectedElement === "bellstrike") {
    return [
      "MaxPhysicalAttack",
      "bellstrikeMax",
      "CriticalRate",
      "AffinityRate",
      "Power",
      "Momentum",
    ];
  }

  const elementStats = getElementAttackTuneStats(selectedElement);
  return [...COMMON_TUNE_STATS, ...elementStats];
}

export function getBellstrikeLevel91TuneStatPool(): TuneStatKey[] {
  return Object.keys(BELLSTRIKE_SPLENDOR_LEVEL_91_LIMITS) as TuneStatKey[];
}

export function getAllBellstrikeTuneStatKeys(): TuneStatKey[] {
  return Object.keys(BELLSTRIKE_SPLENDOR_LEVEL_91_LIMITS) as TuneStatKey[];
}

export function getGearTuneStatRange(
  selectedElement: ElementKey,
  stat: TuneStatKey,
): TuneStatRange {
  if (selectedElement === "bellstrike") {
    return (
      BELLSTRIKE_SPLENDOR_LEVEL_91_LIMITS[stat] || DEFAULT_TUNE_LIMITS[stat]
    );
  }

  return DEFAULT_TUNE_LIMITS[stat];
}

export function getPlayerTuneStatRange(
  stat: TuneStatKey,
  enemyLevel: number = 0,
): TuneStatRange {
  const baseRange = DEFAULT_TUNE_LIMITS[stat];

  if (enemyLevel >= 91) {
    const penRange = LEVEL_91_PENETRATION_TUNE_LIMITS[stat];
    if (penRange) {
      return penRange;
    }
  }

  return baseRange;
}

export function getGearTuneHistory(
  gear?: {
    tuneHistory?: TuneHistoryEntry[];
    tunedSubIndex?: number | null;
    subs?: Array<{ stat?: unknown }>;
  } | null,
): TuneHistoryEntry[] {
  const explicitHistory = (gear?.tuneHistory ?? [])
    .map((entry) => ({
      subIndex: Number(entry.subIndex),
      stat: String(entry.stat ?? ""),
      value:
        typeof entry.value === "number" && Number.isFinite(entry.value)
          ? entry.value
          : undefined,
    }))
    .filter(
      (entry) =>
        Number.isInteger(entry.subIndex) && entry.subIndex >= 0 && entry.stat,
    );

  if (explicitHistory.length > 0) {
    return explicitHistory;
  }

  if (typeof gear?.tunedSubIndex === "number" && gear.tunedSubIndex >= 0) {
    const fallbackStat = String(gear.subs?.[gear.tunedSubIndex]?.stat ?? "");
    return [{ subIndex: gear.tunedSubIndex, stat: fallbackStat }].filter(
      (entry) => entry.stat.length > 0,
    );
  }

  return [];
}

export function getGearActiveTuneSubIndex(
  gear?: {
    tuneHistory?: TuneHistoryEntry[];
    tunedSubIndex?: number | null;
    subs?: Array<{ stat?: unknown }>;
  } | null,
): number | null {
  if (typeof gear?.tunedSubIndex === "number" && gear.tunedSubIndex > 0) {
    return gear.tunedSubIndex;
  }

  const history = getGearTuneHistory(gear);
  const latestHistoryIndex = history.at(-1)?.subIndex;

  if (typeof latestHistoryIndex === "number" && latestHistoryIndex > 0) {
    return latestHistoryIndex;
  }

  return null;
}

export function canTuneGearSubIndex(
  gear?: {
    tuneHistory?: TuneHistoryEntry[];
    tunedSubIndex?: number | null;
    subs?: Array<{ stat?: unknown }>;
  } | null,
  subIndex?: number | null,
): boolean {
  if (typeof subIndex !== "number" || subIndex <= 0) return false;

  const activeSubIndex = getGearActiveTuneSubIndex(gear);
  if (activeSubIndex === null) {
    return true;
  }

  return subIndex === activeSubIndex;
}

export function getGearTuneHistoryStatSet(
  gear?: {
    tuneHistory?: TuneHistoryEntry[];
    tunedSubIndex?: number | null;
    subs?: Array<{ stat?: unknown }>;
  } | null,
  subIndex?: number | null,
): Set<string> {
  const history = getGearTuneHistory(gear);
  if (typeof subIndex === "number") {
    return new Set(
      history
        .filter((entry) => entry.subIndex === subIndex)
        .map((entry) => entry.stat),
    );
  }

  return new Set(history.map((entry) => entry.stat));
}

export function getGearTuneHistorySubIndexSet(
  gear?: {
    tuneHistory?: TuneHistoryEntry[];
    tunedSubIndex?: number | null;
    subs?: Array<{ stat?: unknown }>;
  } | null,
): Set<number> {
  return new Set(getGearTuneHistory(gear).map((entry) => entry.subIndex));
}

export function getTuneAvgGainPct(
  outcomes: Array<{ expectedGainPct: number }>,
): number {
  if (outcomes.length === 0) {
    return 0;
  }

  return (
    outcomes.reduce((sum, outcome) => sum + outcome.expectedGainPct, 0) /
    outcomes.length
  );
}

export function getTuneSuccessRatePct(
  outcomes: Array<{ expectedGainPct: number }>,
): number {
  if (outcomes.length === 0) {
    return 0;
  }

  const successCount = outcomes.filter(
    (outcome) => outcome.expectedGainPct > 0,
  ).length;
  return (successCount / outcomes.length) * 100;
}

export function getTuneSuccessRateToneClass(successRatePct: number): string {
  if (successRatePct >= 80) {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }
  if (successRatePct >= 60) {
    return "border-emerald-500/20 bg-emerald-500/5 text-emerald-600/80 dark:text-emerald-400/80";
  }
  if (successRatePct >= 40) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }
  if (successRatePct >= 20) {
    return "border-amber-500/20 bg-amber-500/5 text-amber-600/80 dark:text-amber-400/80";
  }
  return "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400";
}

export function isTuneTargetAllowedBySubRules(
  subStats: string[],
  rerollIndex: number,
  targetStat: TuneStatKey,
): boolean {
  // Rule: lines 2-5 can duplicate line 1.
  // Rule: lines 2-5 cannot duplicate each other.
  // Using 0-based index: line1=index0, line2+=index>=1.

  if (rerollIndex <= 0) {
    return true;
  }

  for (let index = 1; index < subStats.length; index += 1) {
    if (index === rerollIndex) continue;
    if (subStats[index] === targetStat) {
      return false;
    }
  }

  return true;
}

export function hasUsedTune(
  gear?: {
    tuneHistory?: TuneHistoryEntry[];
    tunedSubIndex?: number | null;
    subs?: Array<{ stat?: unknown }>;
  } | null,
): boolean {
  return getGearTuneHistory(gear).length > 0;
}

/* =======================
   Tune variant generation for optimizer
======================= */

export interface TuneVariant {
  label: string;
  subIndex: number;
  targetStat: string;
  targetValue: number;
  overrideSubs: Array<{ stat: string | number; value: number }>;
}

/** Generate all eligible tune variants for a gear piece.
 *  Only gears with tunedSubIndex > 0 produce variants.
 *  Each variant replaces the substat at tunedSubIndex with a different
 *  eligible stat at max per-line value.
 */
export function generateTuneVariants(
  gear: Pick<CustomGear, "subs" | "tunedSubIndex" | "tuneHistory">,
  elementKey: ElementKey,
): TuneVariant[] {
  const tunedSubIndex = gear.tunedSubIndex;
  if (typeof tunedSubIndex !== "number" || tunedSubIndex <= 0) return [];
  const subs = gear.subs;
  if (!subs || tunedSubIndex >= subs.length) return [];

  const pool = getTuneSystemStatPool(elementKey);
  const subStatKeys = subs.map((s) => String(s.stat ?? ""));

  // Exclude current stat on this line + any stat previously tuned on this subIndex
  const excludedStats = new Set<string>();
  const currentStat = subStatKeys[tunedSubIndex];
  if (currentStat) excludedStats.add(currentStat);
  const history = gear.tuneHistory ?? [];
  for (const entry of history) {
    if (entry.subIndex === tunedSubIndex && entry.stat) {
      excludedStats.add(entry.stat);
    }
  }

  const variants: TuneVariant[] = [];

  for (const targetStat of pool) {
    if (excludedStats.has(targetStat)) continue;
    if (!isTuneTargetAllowedBySubRules(subStatKeys, tunedSubIndex, targetStat)) continue;

    const range = getPlayerTuneStatRange(targetStat);
    const targetValue = range.maxPerLine;

    const overrideSubs = subs.map((s, i) =>
      i === tunedSubIndex ? { stat: targetStat, value: targetValue } : { ...s },
    );

    variants.push({
      label: `→ ${targetStat} (+${targetValue})`,
      subIndex: tunedSubIndex,
      targetStat,
      targetValue,
      overrideSubs,
    });
  }

  return variants;
}

export function getStatTheoreticalMaxPercentage(
  statKey: string,
  totalLines: number,
  actualValue: number,
  elementKey?: ElementKey,
): number | null {
  if (totalLines <= 0 || actualValue <= 0) return null;

  const isValidStat = (Object.keys(DEFAULT_TUNE_LIMITS) as string[]).includes(
    statKey,
  );
  if (!isValidStat) return null;

  const tKey = statKey as TuneStatKey;
  let maxPerLine = DEFAULT_TUNE_LIMITS[tKey].maxPerLine;

  const penLimit = LEVEL_91_PENETRATION_TUNE_LIMITS[tKey]?.maxPerLine;
  if (penLimit && penLimit > maxPerLine) {
    maxPerLine = penLimit;
  }

  if (elementKey === "bellstrike") {
    const bellstrikeLimit =
      BELLSTRIKE_SPLENDOR_LEVEL_91_LIMITS[tKey]?.maxPerLine;
    if (bellstrikeLimit && bellstrikeLimit > maxPerLine) {
      maxPerLine = bellstrikeLimit;
    }
  }

  const theoreticalMax = maxPerLine * totalLines;
  if (theoreticalMax <= 0) return null;

  return Math.min(100, (actualValue / theoreticalMax) * 100);
}

/* =======================
   Addition swap variants for optimizer
======================= */

export interface AdditionSwapVariant {
  label: string;
  targetStat: string;
  overrideAddition: { stat: string; value: number };
}

/** Generate addition swap variants for a gear piece.
 *  Only gears with addition produce variants.
 *  Each variant swaps the addition to a different eligible stat
 *  from the same slot's addition pool, keeping the original value.
 */
export function generateAdditionSwapVariants(
  gear: Pick<CustomGear, "addition">,
  slot: GearSlot,
): AdditionSwapVariant[] {
  if (!gear.addition) return [];

  const currentStat = String(gear.addition.stat);
  const pool = getAdditionStatsBySlot(slot);
  const variants: AdditionSwapVariant[] = [];

  for (const targetStat of pool) {
    if (targetStat === currentStat) continue;

    variants.push({
      label: `Swap → ${targetStat}`,
      targetStat,
      overrideAddition: { stat: targetStat, value: gear.addition.value },
    });
  }

  return variants;
}
