import { ElementStats } from "../types";
import { ELEMENT_TYPES, STAT_LABELS } from "../constants";

/**
 * Global stat label resolver
 */
export function getStatLabel(key: string, elementStats?: ElementStats): string {
  // 1️⃣ Explicit override

  if (STAT_LABELS[key]) {
    return STAT_LABELS[key];
  }

  // 2️⃣ Element stat (bellstrikeMin → Bellstrike Min)
  if (elementStats) {
    for (const el of ELEMENT_TYPES) {
      if (key.startsWith(el.key)) {
        const suffix = key.slice(el.key.length); // Min / Max / Penetration / DMGBonus
        const suffixLabel = STAT_LABELS[suffix] ?? splitCamelCase(suffix);
        if (suffix === "Min" || suffix === "Max") {
          return `${suffixLabel} ${el.label} Attack`;
        }

        return `${el.label} ${suffixLabel}`;
      }
    }
  }

  // 3️⃣ Fallback
  return splitCamelCase(key);
}

/* ---------------- Grouped options for admin modals ---------------- */

export interface GroupedStatOption {
  group: string;
  options: { key: string; label: string }[];
}

const GENERIC_SUFFIXES = new Set(["Min", "Max", "Penetration", "DMGBonus"]);

function labelOf(key: string): string {
  return STAT_LABELS[key] ?? splitCamelCase(key);
}

export function getGroupedStatOptions(): GroupedStatOption[] {
  const weaponKeys: string[] = [];
  const genericKeys: string[] = [];
  const coreKeys = ["MinPhysicalAttack", "MaxPhysicalAttack", "PhysicalAttackMultiplier", "FlatDamage"];
  const ratesKeys = ["PrecisionRate", "CriticalRate", "DirectCriticalRate", "CriticalDMGBonus", "AffinityRate", "DirectAffinityRate", "AffinityDMGBonus"];
  const defenseKeys = ["HP", "PhysicalDefense", "PhysicalResistance", "PhysicalDMGReduction", "PhysicalPenetration", "PhysicalDMGBonus"];
  const attrKeys = ["Body", "Power", "Defense", "Agility", "Momentum"];
  const coreSet = new Set(coreKeys);
  const ratesSet = new Set(ratesKeys);
  const defenseSet = new Set(defenseKeys);
  const attrSet = new Set(attrKeys);

  for (const key of Object.keys(STAT_LABELS)) {
    if (GENERIC_SUFFIXES.has(key)) continue;
    if (coreSet.has(key) || ratesSet.has(key) || defenseSet.has(key) || attrSet.has(key)) continue;
    if (key === "DamageBoost" || key === "CombatBoostAgainstBossUnits" || key === "AllMartialArtsBoost" || key === "MartialArtSkillDamageBoost" || key === "ChargeSkillDamageBoost" || key === "BallisticSkillDamageBoost" || key === "PursuitSkillDamageBoost" || key === "SpringAwayDamageBoost" || key === "MainElementMultiplier") {
      genericKeys.push(key);
      continue;
    }
    weaponKeys.push(key);
  }

  // Element DMG bonus keys
  const elementDmgKeys = ELEMENT_TYPES.map((el) => `${el.key}DMGBonus`);

  return [
    { group: "Attributes", options: attrKeys.map((k) => ({ key: k, label: labelOf(k) })) },
    { group: "Core", options: coreKeys.map((k) => ({ key: k, label: labelOf(k) })) },
    { group: "Rates", options: ratesKeys.map((k) => ({ key: k, label: labelOf(k) })) },
    { group: "Defense", options: defenseKeys.map((k) => ({ key: k, label: labelOf(k) })) },
    { group: "Generic DMG", options: genericKeys.map((k) => ({ key: k, label: labelOf(k) })) },
    { group: "Element DMG", options: elementDmgKeys.map((k) => ({ key: k, label: labelOf(k) })) },
    { group: "Weapon DMG", options: weaponKeys.sort((a, b) => labelOf(a).localeCompare(labelOf(b))).map((k) => ({ key: k, label: labelOf(k) })) },
  ];
}

/* ---------------- helpers ---------------- */

function splitCamelCase(text: string) {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/DMG/g, "DMG ")
    .replace(/MIN/g, "Min ")
    .replace(/MAX/g, "Max ")
    .trim();
}
