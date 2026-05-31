# Project Instructions: WWM Damage Calculator

## Codebase Map

### Core Architecture
- `app/domain/`: Contains the pure business logic and calculation engines.
  - `damage/`: Damage formulas, context resolution, and stat backpropagation.
  - `gear/`: Gear optimization, tuning logic, and OCR schemas.
  - `skill/`: Skill database and modifier engine.
  - `stats/`: Derived stats calculation.
- `app/hooks/`: React hooks that bridge the domain logic with the UI.
- `app/ui/`: Presentation layer organized by feature (damage, gear, stats, etc.).
- `app/workers/`: Web Workers for heavy computations (e.g., gear optimization).

### Data Layer
- `app/domain/skill/data/`: JSON files containing default rotations and skill metadata.

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
- **Single Source of Truth:** Use `app/domain/damage/damageContext.ts` for all stat resolution. NEVER calculate final stats (like effective Crit Rate) directly in UI components.
- **Backpropagation:** Maintain the `explain()` function in `damageContext.ts` to allow users to trace how every final value is calculated.

### UI & Styling
- **Framework:** Next.js (App Router) + Tailwind CSS + shadcn/ui.
- **Dark Mode:** The project is primarily designed for Dark Mode. Use `dark:` variants for colors when necessary.
- **Formatting:**
  - Use `pct()` for percentages (e.g., `12.3%`).
  - Use `pctNP()` (No Percent) for raw numeric rates (e.g., `12.3`).

## Agent Guidelines
- When modifying calculation logic, ensure both the `get()` and `explain()` methods in `damageContext.ts` are updated synchronously.
- Always check for impacts on `damageFormula.ts` when changing how rates or multipliers are resolved.
- Prioritize updating the domain layer before the UI layer.
