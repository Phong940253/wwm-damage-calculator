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
  CombatBoostAgainstBossUnits?: number;

  // Active Element name (e.g. Bellstrike, Stonesplit, Silkbind, Bamboocut)
  activeElement?: "bellstrike" | "stonesplit" | "silkbind" | "bamboocut";
  elementMin?: number;
  elementMax?: number;
  elementPenetration?: number;
  elementDMGBonus?: number;
}

export const STATS_OCR_PROMPT = `
You are extracting character stats information from a Where Winds Meet status/attributes screenshot.

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
   - For stats showing "Current (Base)" or similar brackets like "51.6%(35.6%)", prefer the Base value inside parentheses if you want to extract the pure base stat, but if not possible, return the Total/Current value (the one before parentheses) as a plain number.
   - Max HP -> HP
   - Physical Attack (e.g., "967-2917" -> extract Min as "MinPhysicalAttack" and Max as "MaxPhysicalAttack")
   - Physical Defense -> PhysicalDefense
   - Precision Rate -> PrecisionRate (e.g. "100.0%(89.1%)" -> prefer base "89.1" or "100.0")
   - Critical Rate -> CriticalRate (e.g. "51.6%(35.6%)" -> prefer base "35.6" or "51.6")
   - Affinity Rate -> AffinityRate (e.g. "59.1%(40.0%)" -> prefer base "40.0" or "59.1")
   - Critical DMG Bonus -> CriticalDMGBonus (e.g. "50.0%" -> 50.0)
   - Affinity DMG Bonus -> AffinityDMGBonus (e.g. "40.2%" -> 40.2)
   - Physical Penetration -> PhysicalPenetration (e.g. "38.6" -> 38.6)
   - Combat Boost Against Boss Units -> CombatBoostAgainstBossUnits (e.g. "2.6%" -> 2.6)

4. ELEMENT ATTACKS:
   - Check the active element attack values on the right side if visible (e.g. "Bellstrike Attack: 319-739").
   - Extract the element name: "activeElement" = "bellstrike", "stonesplit", "silkbind", or "bamboocut".
   - Extract min value: "elementMin" (e.g., 319)
   - Extract max value: "elementMax" (e.g., 739)
   - "Attribute Attack Penetration" -> elementPenetration (e.g., 24.0)
   - "Attribute Attack DMG Bonus" -> elementDMGBonus (e.g., 9.0)

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
  "elementMin": 319,
  "elementMax": 739,
  "elementPenetration": 24.0,
  "elementDMGBonus": 9.0
}
`;
