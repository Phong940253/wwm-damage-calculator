import { ElementKey } from "@/app/constants";

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
  | "Momentum";

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
};

const BELLSTRIKE_SPLENDOR_LEVEL_91_LIMITS: Record<TuneStatKey, TuneStatRange> =
  {
    ...DEFAULT_TUNE_LIMITS,
    MaxPhysicalAttack: { minPerLine: 31.9, maxPerLine: 63.8 },
    bellstrikeMax: { minPerLine: 18.1, maxPerLine: 36.2 },
    CriticalRate: { minPerLine: 3.7, maxPerLine: 7.4 },
    AffinityRate: { minPerLine: 1.8, maxPerLine: 3.6 },
    Power: { minPerLine: 20.2, maxPerLine: 40.4 },
    Momentum: { minPerLine: 20.2, maxPerLine: 40.4 },
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

export function getTuneStatRange(
  selectedElement: ElementKey,
  stat: TuneStatKey,
): TuneStatRange {
  if (selectedElement === "bellstrike") {
    return BELLSTRIKE_SPLENDOR_LEVEL_91_LIMITS[stat];
  }

  return DEFAULT_TUNE_LIMITS[stat];
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
  gear?: { tunedSubIndex?: number | null } | null,
): boolean {
  return typeof gear?.tunedSubIndex === "number" && gear.tunedSubIndex >= 0;
}
