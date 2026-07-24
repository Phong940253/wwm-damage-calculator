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
  | "voidMin"
  | "voidMax"
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
  element: "silkbind" | "stonesplit" | "bamboocut" | "void",
): TuneStatKey[] {
  if (element === "silkbind") return ["silkbindMin", "silkbindMax"];
  if (element === "stonesplit") return ["stonesplitMin", "stonesplitMax"];
  if (element === "bamboocut") return ["bamboocutMin", "bamboocutMax"];
  return ["voidMin", "voidMax"];
}

const LEVEL_TUNE_LIMITS: Record<
  number,
  Partial<Record<TuneStatKey, TuneStatRange>>
> = {
  91: {
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
    voidMin: { minPerLine: 22.1, maxPerLine: 44.2 },
    voidMax: { minPerLine: 22.1, maxPerLine: 44.2 },
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
  },
  96: {
    MaxPhysicalAttack: { minPerLine: 38.9, maxPerLine: 77.8 },
    CriticalRate: { minPerLine: 4.5, maxPerLine: 9.0 },
    AffinityRate: { minPerLine: 2.2, maxPerLine: 4.4 },
    Power: { minPerLine: 24.7, maxPerLine: 49.4 },
    Momentum: { minPerLine: 24.7, maxPerLine: 49.4 },
    Agility: { minPerLine: 24.7, maxPerLine: 49.4 },
    bellstrikeMin: { minPerLine: 22.1, maxPerLine: 44.2 },
    bellstrikeMax: { minPerLine: 22.1, maxPerLine: 44.2 },
    stonesplitMin: { minPerLine: 22.1, maxPerLine: 44.2 },
    stonesplitMax: { minPerLine: 22.1, maxPerLine: 44.2 },
    silkbindMin: { minPerLine: 22.1, maxPerLine: 44.2 },
    silkbindMax: { minPerLine: 22.1, maxPerLine: 44.2 },
    bamboocutMin: { minPerLine: 22.1, maxPerLine: 44.2 },
    bamboocutMax: { minPerLine: 22.1, maxPerLine: 44.2 },
    voidMin: { minPerLine: 22.1, maxPerLine: 44.2 },
    voidMax: { minPerLine: 22.1, maxPerLine: 44.2 },
    bellstrikePenetration: { minPerLine: 7.8, maxPerLine: 13.0 },
    stonesplitPenetration: { minPerLine: 7.8, maxPerLine: 13.0 },
    silkbindPenetration: { minPerLine: 7.8, maxPerLine: 13.0 },
    bamboocutPenetration: { minPerLine: 7.8, maxPerLine: 13.0 },
    PhysicalPenetration: { minPerLine: 6.6, maxPerLine: 11.0 },
    PhysicalResistance: { minPerLine: 6.6, maxPerLine: 11.0 },
    ArtOfSwordDMGBoost: { minPerLine: 6.2, maxPerLine: 6.2 },
    CombatBoostAgainstBossUnits: { minPerLine: 3.1, maxPerLine: 3.1 },
    AllMartialArtsBoost: { minPerLine: 3.1, maxPerLine: 3.1 },
    NamelessSwordChargedSkillDMGBoost: { minPerLine: 6.0, maxPerLine: 6.0 },
  },
};

// TODO: thêm các martial art khác
const MARTIAL_ART_TUNE_POOLS: Record<string, TuneStatKey[]> = {
  bellstrike_splendor: [
    "MaxPhysicalAttack",
    "bellstrikeMax",
    "CriticalRate",
    "AffinityRate",
    "Power",
    "Momentum",
  ],
};

export function getTuneSystemStatPool(
  selectedElement: ElementKey,
  martialArtId?: string,
): TuneStatKey[] {
  if (martialArtId) {
    const pool = MARTIAL_ART_TUNE_POOLS[martialArtId];
    if (pool) return pool;
  }

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
  return MARTIAL_ART_TUNE_POOLS.bellstrike_splendor ?? [];
}

export function getAllBellstrikeTuneStatKeys(): TuneStatKey[] {
  return MARTIAL_ART_TUNE_POOLS.bellstrike_splendor ?? [];
}

export function getGearTuneStatRange(
  selectedElement: ElementKey,
  stat: TuneStatKey,
): TuneStatRange {
  const range = LEVEL_TUNE_LIMITS[91]?.[stat];
  if (range) return range;

  if (selectedElement === "bellstrike") {
    const bellRange = MARTIAL_ART_TUNE_POOLS.bellstrike_splendor?.includes(stat)
      ? LEVEL_TUNE_LIMITS[91]?.[stat]
      : undefined;
    if (bellRange) return bellRange;
  }

  return LEVEL_TUNE_LIMITS[91]?.[stat] ?? { minPerLine: 0, maxPerLine: 0 };
}

export function getGearTuneStatRange96(
  selectedElement: ElementKey,
  stat: TuneStatKey,
): TuneStatRange {
  const lv96Range = LEVEL_TUNE_LIMITS[96]?.[stat];
  if (lv96Range) return lv96Range;

  return getGearTuneStatRange(selectedElement, stat);
}

export function getPlayerTuneStatRange(
  stat: TuneStatKey,
  playerLevel: number = 91,
): TuneStatRange {
  const exact = LEVEL_TUNE_LIMITS[playerLevel]?.[stat];
  if (exact) return exact;

  return LEVEL_TUNE_LIMITS[91]?.[stat] ?? { minPerLine: 0, maxPerLine: 0 };
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

/** Compute the relayed sub stat value for a given stat key at level 96.
 *  Relayed sub values are fixed at 94% of the max per-line value at lv96.
 */
export function computeRelayedSubValue(stat: TuneStatKey): number {
  const range = getPlayerTuneStatRange(stat, 96);
  return Math.round(range.maxPerLine * 0.94 * 100) / 100;
}

/** Compute the success rate (0-1) for tuning a specific subIndex to a specific target stat.
 *  Accounts for:
 *  - Current stat on that line (excluded)
 *  - Tune history stats on that subIndex (excluded)
 *  - Sub rules (lines 2-5 cannot duplicate each other)
 */
export function computeSingleTuneSuccessRate(
  gear: Pick<CustomGear, "subs" | "tuneHistory">,
  subIndex: number,
  targetStat: string,
  elementKey: ElementKey,
): number {
  const pool = getTuneSystemStatPool(elementKey);
  const subStatKeys = gear.subs?.map((s) => String(s.stat ?? "")) ?? [];

  const excludedStats = new Set<string>();
  const currentFromHistory = getGearTuneHistory(gear)
    .filter((e) => e.subIndex === subIndex)
    .at(-1)?.stat;
  const currentStat = currentFromHistory || subStatKeys[subIndex];
  if (currentStat) excludedStats.add(currentStat);
  const history = gear.tuneHistory ?? [];
  for (const entry of history) {
    if (entry.subIndex === subIndex && entry.stat) {
      excludedStats.add(entry.stat);
    }
  }

  let eligibleCount = 0;
  for (const stat of pool) {
    if (excludedStats.has(stat)) continue;
    if (!isTuneTargetAllowedBySubRules(subStatKeys, subIndex, stat)) continue;
    eligibleCount++;
  }

  if (eligibleCount <= 0) return 0;
  return 1 / eligibleCount;
}

/** Generate all eligible tune variants for a gear piece at a given subIndex.
 *  If subIndex is omitted, uses gear.tunedSubIndex (must be > 0).
 *  Each variant replaces the substat at the target subIndex with a different
 *  eligible stat at max per-line value.
 */
export function generateTuneVariants(
  gear: Pick<CustomGear, "subs" | "tunedSubIndex" | "tuneHistory">,
  elementKey: ElementKey,
  /** Override subIndex. If omitted, uses gear.tunedSubIndex (must be > 0). */
  overrideSubIndex?: number,
  /** Player level used to determine max per-line tune value. Defaults to 91. */
  playerLevel: number = 91,
): TuneVariant[] {
  const subIndex = overrideSubIndex ?? gear.tunedSubIndex;
  if (typeof subIndex !== "number" || subIndex <= 0) return [];
  const subs = gear.subs;
  if (!subs || subIndex >= subs.length) return [];

  const pool = getTuneSystemStatPool(elementKey);
  const subStatKeys = subs.map((s) => String(s.stat ?? ""));

  // Exclude current stat on this line + any stat previously tuned on this subIndex
  const excludedStats = new Set<string>();
  const currentStat = subStatKeys[subIndex];
  if (currentStat) excludedStats.add(currentStat);
  const history = gear.tuneHistory ?? [];
  for (const entry of history) {
    if (entry.subIndex === subIndex && entry.stat) {
      excludedStats.add(entry.stat);
    }
  }

  const variants: TuneVariant[] = [];

  for (const targetStat of pool) {
    if (excludedStats.has(targetStat)) continue;
    if (!isTuneTargetAllowedBySubRules(subStatKeys, subIndex, targetStat))
      continue;

    const range = getPlayerTuneStatRange(targetStat, playerLevel);
    const targetValue = range.maxPerLine;

    const overrideSubs = subs.map((s, i) =>
      i === subIndex ? { stat: targetStat, value: targetValue } : { ...s },
    );

    variants.push({
      label: `→ ${targetStat} (+${targetValue})`,
      subIndex,
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
  // TODO: add martial art param if bellstrike needs special handling
): number | null {
  if (totalLines <= 0 || actualValue <= 0) return null;

  const tKey = statKey as TuneStatKey;
  const lv91Range = LEVEL_TUNE_LIMITS[91]?.[tKey];
  if (!lv91Range) return null;

  let maxPerLine = lv91Range.maxPerLine;

  for (const levelRange of Object.values(LEVEL_TUNE_LIMITS)) {
    const limit = levelRange[tKey]?.maxPerLine;
    if (limit && limit > maxPerLine) {
      maxPerLine = limit;
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
