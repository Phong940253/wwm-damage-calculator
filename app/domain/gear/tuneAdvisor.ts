import { ElementKey } from "@/app/constants";

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
  MinPhysicalAttack: { minPerLine: 23.5, maxPerLine: 47.0 },
  MaxPhysicalAttack: { minPerLine: 23.5, maxPerLine: 47.0 },
  bellstrikeMin: { minPerLine: 13.3, maxPerLine: 26.6 },
  bellstrikeMax: { minPerLine: 13.3, maxPerLine: 26.6 },
  stonesplitMin: { minPerLine: 13.3, maxPerLine: 26.6 },
  stonesplitMax: { minPerLine: 13.3, maxPerLine: 26.6 },
  silkbindMin: { minPerLine: 13.3, maxPerLine: 26.6 },
  silkbindMax: { minPerLine: 13.3, maxPerLine: 26.6 },
  bamboocutMin: { minPerLine: 13.3, maxPerLine: 26.6 },
  bamboocutMax: { minPerLine: 13.3, maxPerLine: 26.6 },
  bellstrikePenetration: { minPerLine: 4.8, maxPerLine: 8.0 },
  stonesplitPenetration: { minPerLine: 4.8, maxPerLine: 8.0 },
  silkbindPenetration: { minPerLine: 4.8, maxPerLine: 8.0 },
  bamboocutPenetration: { minPerLine: 4.8, maxPerLine: 8.0 },
  PhysicalPenetration: { minPerLine: 4.0, maxPerLine: 6.6 },
  PhysicalResistance: { minPerLine: 4.0, maxPerLine: 6.6 },
  CriticalRate: { minPerLine: 2.7, maxPerLine: 5.4 },
  AffinityRate: { minPerLine: 1.8, maxPerLine: 3.6 },
  Power: { minPerLine: 14.9, maxPerLine: 29.8 },
  Momentum: { minPerLine: 20.2, maxPerLine: 40.4 },
  Agility: { minPerLine: 14.9, maxPerLine: 29.8 },
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
