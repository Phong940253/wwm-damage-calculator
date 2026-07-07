// app/domain/stats/statsOcrSchema.ts

export interface StatsOcrResult {
  playerLevel?: number;
  enemyLevel?: number;

  // Base Attributes
  Body?: number;
  Power?: number;
  Defense?: number;
  Agility?: number;
  Momentum?: number;

  // Stats (Total or raw values shown in stats sheet)
  MinPhysicalAttack?: number;
  MaxPhysicalAttack?: number;
  PrecisionRate?: number;
  CriticalRate?: number;
  CriticalDMGBonus?: number;
  AffinityRate?: number;
  AffinityDMGBonus?: number;
  HP?: number;
  PhysicalDefense?: number;
  PhysicalPenetration?: number;

  // Active Element name (e.g. Bellstrike, Stonesplit, Silkbind, Bamboocut) for auto-selection
  activeElement?: "bellstrike" | "stonesplit" | "silkbind" | "bamboocut";

  // Element Attack values (per element — extract ALL visible in image)
  bellstrikeMin?: number;
  bellstrikeMax?: number;
  bellstrikePenetration?: number;
  bellstrikeDMGBonus?: number;
  stonesplitMin?: number;
  stonesplitMax?: number;
  stonesplitPenetration?: number;
  stonesplitDMGBonus?: number;
  silkbindMin?: number;
  silkbindMax?: number;
  silkbindPenetration?: number;
  silkbindDMGBonus?: number;
  bamboocutMin?: number;
  bamboocutMax?: number;
  bamboocutPenetration?: number;
  bamboocutDMGBonus?: number;
}

export const STATS_OCR_PROMPT = `
You are extracting character stats information from Where Winds Meet screenshots.

You may receive ONE or MULTIPLE images showing different parts of the same character's stats screen. Combine information from ALL images to fill as many fields as possible.

Return STRICT JSON only.
No explanation.
No markdown.
No comments.
No trailing text.

Look for these fields and extract their values:

1. LEVEL:
   - Search for Player Level. If found, return as "playerLevel".
   
2. BASE ATTRIBUTES:
   - Body
   - Power
   - Defense (Note: only the base "Defense" attribute, not "Physical Defense")
   - Agility
   - Momentum

 3. GENERAL STATS:
    - For stats showing "WhiteNumber (OrangeNumber)" like "100.2%(89.3%)", ALWAYS take the WHITE number (before parentheses). The orange number in parentheses is already reduced by boss resistance and should be IGNORED.
    - Max HP -> HP
    - Physical Attack (e.g., "967-2917" -> extract Min as "MinPhysicalAttack" and Max as "MaxPhysicalAttack")
    - Physical Defense -> PhysicalDefense
    - Precision Rate -> PrecisionRate (e.g. WHITE "100.2" from "100.2%(89.3%)" -> 100.2)
    - Critical Rate -> CriticalRate (e.g. WHITE "60.0" from "60.0%(41.4%)" -> 60.0)
    - Affinity Rate -> AffinityRate (e.g. WHITE "58.0" from "58.0%(40.0%)" -> 58.0)
    - Critical DMG Bonus -> CriticalDMGBonus (e.g. "50.0%" -> 50.0)
    - Affinity DMG Bonus -> AffinityDMGBonus (e.g. "40.2%" -> 40.2)
    - Physical Penetration -> PhysicalPenetration (e.g. "38.6" -> 38.6)

4. ELEMENT ATTACKS:
    - Extract ALL visible element attack values shown in the image. Each element appears as "Name: min-max".
      - The number BEFORE the dash is ALWAYS the min value. The number AFTER the dash is ALWAYS the max value.
      - IMPORTANT: max CAN be 0 or smaller than min. Extract exactly what is shown (e.g. "69-0" -> min: 69, max: 0, NOT min: 69, max: 69).
      - Examples:
        "Bellstrike Attack: 286-706 (286-706)" -> take the WHITE min-max before parentheses: bellstrikeMin: 286, bellstrikeMax: 706
        "Stonesplit Attack: 10-30" -> stonesplitMin: 10, stonesplitMax: 30
        "Silkbind Attack: 10-30" -> silkbindMin: 10, silkbindMax: 30
        "Bamboocut Attack: 10-30" -> bamboocutMin: 10, bamboocutMax: 30
    - ALWAYS take the WHITE text values before parentheses. Ignore any orange/parenthesized values.
    - Extract the active/highlighted element name if identifiable: "activeElement" = "bellstrike", "stonesplit", "silkbind", or "bamboocut".
    - Per-element attack penetration and DMG bonus if visible:
      "Attribute Attack Penetration" -> bellstrikePenetration (or stonesplitPenetration etc.)
      "Attribute Attack DMG Bonus" -> bellstrikeDMGBonus (or stonesplitDMGBonus etc.)

Example JSON Output:
{
  "playerLevel": 91,
  "Body": 150,
  "Power": 369,
  "Defense": 137,
  "Agility": 137,
  "Momentum": 253,
  "MinPhysicalAttack": 967,
  "MaxPhysicalAttack": 2917,
  "CriticalRate": 35.6,
  "AffinityRate": 40.0,
  "HP": 154682,
  "PhysicalDefense": 500,
  "activeElement": "bellstrike",
  "bellstrikeMin": 319,
  "bellstrikeMax": 739,
  "bellstrikePenetration": 24.0,
  "bellstrikeDMGBonus": 9.0,
  "stonesplitMin": 10,
  "stonesplitMax": 30,
  "silkbindMin": 10,
  "silkbindMax": 30,
  "bamboocutMin": 10,
  "bamboocutMax": 30
}
`;
