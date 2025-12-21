export interface GearOcrResult {
  name?: string;
  slot?: string;

  mains?: {
    stat: string;
    value: number;
  }[];

  subs?: {
    stat: string;
    value: number;
  }[];

  addition?: {
    stat: string;
    value: number;
  };
}

export const GEAR_OCR_PROMPT = `
You are extracting gear information from a game screenshot.

Return STRICT JSON only.
No explanation.
No markdown.
No comments.
No trailing text.

====================
ALLOWED SLOTS
====================
weapon_1
weapon_2
ring
talisman
head
chest
hand
leg

====================
ALLOWED ELEMENTS
====================
Bellstrike
Stonesplit
Silkbind
Bamboocut

====================
STAT RULES
====================

1. Physical Attack (SPECIAL CASE – RANGE ALLOWED)

   a) Physical Attack range:
      - "Physical Attack X - Y"
      → produce TWO stats:
        - MinPhysicalAttack = X
        - MaxPhysicalAttack = Y

   b) Single Physical Attack value:
      - "Max Physical Attack +X"
      → MaxPhysicalAttack = X

      - "Min Physical Attack +X"
      → MinPhysicalAttack = X

2. ALL OTHER STATS (NO RANGES)

   - Never produce ranges for any stat except Physical Attack
   - Each stat produces exactly ONE value

3. Element attacks (NO RANGES)

   Examples:
   - "Min Bellstrike Attack 120"
     → bellstrikeMin = 120

   - "Max Bellstrike Attack 300"
     → bellstrikeMax = 300

   - "Bellstrike Penetration +3.1%"
     → bellstrikePenetration = 3.1

   - "Bellstrike Damage Bonus +1.6%"
     → bellstrikeDMGBonus = 1.6

4. Percent values:
   - Always return NUMBER only
   - Example: "12.5%" → 12.5

5. Valid stat keys ONLY:
   Core:
   - MinPhysicalAttack
   - MaxPhysicalAttack
   - PhysicalAttackMultiplier
   - FlatDamage

   Rates:
   - PrecisionRate
   - CriticalRate
   - CriticalDMGBonus
   - AffinityRate
   - AffinityDMGBonus
   - DamageBoost

   Defense:
   - HP
   - PhysicalDefense
   - PhysicalResistance
   - PhysicalDMGReduction

   Element (prefix required):
   - bellstrikeMin / Max / Penetration / DMGBonus
   - stonesplitMin / Max / Penetration / DMGBonus
   - silkbindMin / Max / Penetration / DMGBonus
   - bamboocutMin / Max / Penetration / DMGBonus

6. Stat placement:
   - Primary / large stats → mains
   - Secondary stats → subs (max 4)
   - Special single stat → addition

====================
OUTPUT SCHEMA
====================

{
  "name": string,
  "slot": string,
  "mains": [{ "stat": string, "value": number }],
  "subs": [{ "stat": string, "value": number }],
  "addition": { "stat": string, "value": number } | null
}

If something is unclear, omit it.
Return JSON only.
`;
