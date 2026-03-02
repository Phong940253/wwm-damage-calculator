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
