import { STAT_GROUPS } from "@/app/constants";
import { InputStats } from "@/app/types";
import {
  LEFT_ADDITION_STATS,
  RIGHT_ADDITION_STATS,
} from "@/app/domain/gear/additionRules";

const SPECIAL_STAT_KEYS = [
  "ChargeSkillDamageBoost",
  "BallisticSkillDamageBoost",
  "PursuitSkillDamageBoost",
  "ArtOfSwordDMGBoost",
  "ArtOfSpearDMGBoost",
  "ArtOfFanDMGBoost",
  "ArtOfUmbrellaDMGBoost",
  "ArtOfHorizontalBladeDMGBoost",
  "ArtOfMoBladeDMGBoost",
  "ArtOfDualBladesDMGBoost",
  "ArtOfRopeDartDMGBoost",
] as const;

// all valid stat keys (including element stats)
const VALID_STAT_KEYS = new Set<string>(
  [
    ...Object.values(STAT_GROUPS).flat(),
    ...SPECIAL_STAT_KEYS,
    ...LEFT_ADDITION_STATS,
    ...RIGHT_ADDITION_STATS,
  ].map((x) => String(x)),
);

export function normalizeStatKey(raw: string): keyof InputStats | null {
  if (!raw) return null;

  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

  for (const key of VALID_STAT_KEYS) {
    const keyStr = String(key)
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();

    // 1️⃣ exact match
    if (keyStr === cleaned) {
      return key as keyof InputStats;
    }

    // 2️⃣ loose match (OCR noise)
    if (cleaned.includes(keyStr)) {
      return key as keyof InputStats;
    }
  }

  return null;
}
