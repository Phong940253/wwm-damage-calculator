# Project Instructions: WWM Damage Calculator

## Core Combat Mechanics

### Rate Caps & Resistance
- **Boss Resistance:** Applies a percentage reduction to Precision Rate, Critical Rate, and Affinity Rate based on the enemy level.
- **Critical Rate Cap:** The "Raw" Critical Rate (Base + Gear + Derived) is capped at **80.0%** after boss resistance is applied.
- **Affinity Rate Cap:** The "Raw" Affinity Rate (Base + Gear + Derived) is capped at **40.0%** after boss resistance is applied.
- **Direct Rates:** `DirectCriticalRate` and `DirectAffinityRate` are **NOT** subject to these caps. They are added *after* the cap is applied to the base/resisted rate.
  - Formula: `FinalRate = min(BaseRate * (1 - Resistance), Cap) + DirectRate`

### Stat Display Conventions
- In the "Attribute to Check" section, rates are displayed in the format: `Raw Total % → Final Effective %`.
- **Total Rate:** The sum of `FinalCriticalRate` and `FinalAffinityRate`.

## Technical Implementation

### Damage Context
- Use `app/domain/damage/damageContext.ts` as the single source of truth for stat resolution and backpropagation (explain).
- Derived stats (Atk from Agility/Power/Momentum) should be pre-calculated or included in the context resolution.

### Formatting
- Use `pct()` for percentages (e.g., `12.3%`).
- Use `pctNP()` (No Percent) for raw numeric rates (e.g., `12.3`).
