---
name: add-new-formula
description: Modifying or adding damage calculation formulas (damageFormula.ts + damageCalculator.ts)
---

# Add New Formula — WWM Damage Calculator

Use when modifying or adding damage calculation formulas.

## Workflow

### 1. `app/domain/damage/damageFormula.ts`
- Main formula logic. Reads stats via `ctx.get("StatName")` (case-sensitive `DamageContext` keys).
- `buildDamageCache()`: pre-computes cached values from context
- `calculateDamage()`: core damage calc

### 2. `app/domain/damage/damageCalculator.ts`
- Wire new formula into the pipeline

### 3. `app/domain/damage/damageContext.ts`
- If new stats/keys needed, add in `buildDamageContext()` or the fallback handler
- `cur()` helper: `base + increase + gearBonus`
- `gearBonus` = gear stats + passives + inner ways (summed additively)

### 4. `app/domain/damage/buildFinalStatSections.ts`
- If new stat should appear in results display

### 5. Tests
- Add to `tests/formula.spec.ts` or `tests/damage.spec.ts`
- Run: `pnpm test`

### 6. Verify
- `pnpm build`
