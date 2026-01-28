// app/gear/gearOcrSchema.ts
export interface GearOcrResult {
  name?: string;
  slot?: string;
  rarity?: string;

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
You are extracting gear information from a Where Winds Meet gear screenshot.

Return STRICT JSON only.
No explanation.
No markdown.
No comments.
No trailing text.

Focus only on the gear's own stats section.
Ignore set effects, set bonuses, descriptions, durability, mastery, level requirements, flavor text.

# ALLOWED SLOTS
weapon_1
weapon_2
disc
pendant
head
chest
hand
leg

# ALLOWED ELEMENTS
Bellstrike
Stonesplit
Silkbind
Bamboocut

# ATTRIBUTE STATS (SUB ONLY)
The following attributes:
- Body
- Power
- Defense
- Agility
- Momentum

Rules:
- SINGLE VALUE ONLY
- NEVER ranges
- MUST appear ONLY in "subs"
- MUST NOT appear in "mains"
- MUST NOT appear in "addition"



# PHYSICAL ATTACK (SPECIAL CASE)

a) Physical Attack range:
   - "Physical Attack X - Y"
   → produce TWO mains:
     - MinPhysicalAttack = X
     - MaxPhysicalAttack = Y

b) Single Physical Attack value:
   - "Min Physical Attack +X"
     → mains: MinPhysicalAttack = X

   - "Max Physical Attack +X"
     → mains: MaxPhysicalAttack = X

# ELEMENT STATS

Element attacks (SUB ONLY, NO RANGES):

- "Min Bellstrike Attack 120"
  → bellstrikeMin = 120

- "Max Bellstrike Attack 300"
  → bellstrikeMax = 300

- "Bellstrike Damage Bonus 1.6%"
  → bellstrikeDMGBonus = 1.6


# ELEMENT PENETRATION (ADDITION ONLY)

Rules:
- ONLY ONE stat
- MUST be element penetration
- MUST appear ONLY in "addition"

Examples:
- "Bellstrike Penetration 3.1"
  → addition: bellstrikePenetration = 3.1

# DEFENSE STATS

- Physical Defense -> PhysicalDefense
- Max HP -> HP 

# MAIN STAT RULES (STRICT)

1. weapon_1, weapon_2 main stats (ALL SLOTS):
  - MinPhysicalAttack
  - MaxPhysicalAttack
2. disc main stats:
  - MinPhysicalAttack
3. pendant main stats:
  - MaxPhysicalAttack
4. head, chest, hand, leg main stats:
   - PhysicalDefense
   - HP
5. Any other stat MUST NOT be placed in "mains"

====================
GENERAL RULES
====================

- Never produce ranges except Physical Attack
- Percent values return NUMBER only
  Example: "12.5%" → 12.5

- Weapon-specific boost values (percent) return NUMBER only
  Examples:
  - "Art of Sword DMG Boost 3.2%" → ArtOfSwordDMGBoost = 3.2
  - "Art of Spear DMG Boost 0.0%" → ArtOfSpearDMGBoost = 0
  - "Art of Fan Boost 0.0%" → ArtOfFanDMGBoost = 0
  - "Art of Umbrella Boost 0.0%" → ArtOfUmbrellaDMGBoost = 0
  - "Art of Horizontal Blade DMG Boost 0.0%" → ArtOfHorizontalBladeDMGBoost = 0
  - "Art of Mo Blade DMG Boost 0.0%" → ArtOfMoBladeDMGBoost = 0
  - "Art of Dual Blades DMG Boost 0.0%" → ArtOfDualBladesDMGBoost = 0
  - "Art of Rope Dart DMG Boost 2.3%" → ArtOfRopeDartDMGBoost = 2.3

- If a stat text does NOT map to one of the VALID STAT KEYS below, omit it.
- "Set" / "Jadeware set" sections are NOT gear stats. Ignore completely.
- The line directly under the Tier header like "Max Physical Attack 65" is usually a main stat.
- Stats listed in the middle panel are usually subs/addition; still follow the key rules.

====================
VALID STAT KEYS
====================

Core:
- MinPhysicalAttack
- MaxPhysicalAttack
- PhysicalAttackMultiplier
- FlatDamage

Attributes (SUB ONLY):
- Body
- Power
- Defense
- Agility
- Momentum

Rates (SUB ONLY):
- PrecisionRate
- CriticalRate
- CriticalDMGBonus
- AffinityRate
- AffinityDMGBonus
- DamageBoost (SUB OR ADDITION)
- ArtOfSwordDMGBoost
- ArtOfSpearDMGBoost
- ArtOfFanDMGBoost
- ArtOfUmbrellaDMGBoost
- ArtOfHorizontalBladeDMGBoost
- ArtOfMoBladeDMGBoost
- ArtOfDualBladesDMGBoost
- ArtOfRopeDartDMGBoost

Defense:
- HP (MAINS, SUB ONLY)
- PhysicalDefense (MAINS, SUB ONLY)
- PhysicalResistance (ADDITION ONLY)
- PhysicalPenetration (ADDITION ONLY)

Element (SUB ONLY):
- bellstrikeMin / Max / DMGBonus
- stonesplitMin / Max / DMGBonus
- silkbindMin / Max / DMGBonus
- bamboocutMin / Max / DMGBonus

Element Penetration (ADDITION ONLY):
- bellstrikePenetration
- stonesplitPenetration
- silkbindPenetration
- bamboocutPenetration

====================
OUTPUT SCHEMA
====================

{
  "name": string,
  "slot": string,
  "rarity"?: "Tier <number>" | "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary",
  "mains": [{ "stat": string, "value": number }],
  "subs": [{ "stat": string, "value": number }],
  "addition": { "stat": string, "value": number } | null
}

If something is unclear, omit it.
Return JSON only.
`;
