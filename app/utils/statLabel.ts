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

/* ---------------- helpers ---------------- */

function splitCamelCase(text: string) {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/DMG/g, "DMG ")
    .replace(/MIN/g, "Min ")
    .replace(/MAX/g, "Max ")
    .trim();
}
