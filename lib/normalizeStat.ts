import { STAT_GROUPS } from "@/app/constants";
import { InputStats } from "@/app/types";

// all valid stat keys (including element stats)
const VALID_STAT_KEYS = new Set<keyof InputStats>(
  Object.values(STAT_GROUPS).flat()
);

export function normalizeStatKey(raw: string): keyof InputStats | null {
  if (!raw) return null;

  const cleaned = raw.replace(/\s+/g, "").toLowerCase();

  for (const key of VALID_STAT_KEYS) {
    const keyStr = String(key).toLowerCase(); // ✅ SAFE

    // 1️⃣ exact match
    if (keyStr === cleaned) {
      return key;
    }

    // 2️⃣ loose match (OCR noise)
    if (cleaned.includes(keyStr)) {
      return key;
    }
  }

  return null;
}
