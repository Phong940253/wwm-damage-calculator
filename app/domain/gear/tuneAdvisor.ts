import { ElementKey, StatHeatmapKey } from "@/app/constants";

const COMMON_TUNE_STATS: StatHeatmapKey[] = [
  "MinPhysicalAttack",
  "MaxPhysicalAttack",
  "CriticalRate",
  "Power",
  "Agility",
];

function getElementAttackTuneStats(
  element: "silkbind" | "stonesplit" | "bamboocut",
): StatHeatmapKey[] {
  if (element === "silkbind") return ["silkbindMin", "silkbindMax"];
  if (element === "stonesplit") return ["stonesplitMin", "stonesplitMax"];
  return ["bamboocutMin", "bamboocutMax"];
}

export function getTuneSystemStatPool(
  selectedElement: ElementKey,
): StatHeatmapKey[] {
  if (selectedElement === "bellstrike") {
    return [];
  }

  const elementStats = getElementAttackTuneStats(selectedElement);
  return [...COMMON_TUNE_STATS, ...elementStats];
}

export function isTuneTargetAllowedBySubRules(
  subStats: string[],
  rerollIndex: number,
  targetStat: StatHeatmapKey,
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
