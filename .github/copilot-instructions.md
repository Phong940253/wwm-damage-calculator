# Copilot Instructions for WWM Damage Calculator

## Project Overview

This is a **Next.js 15 (App Router)** damage calculator for "Where Winds Meet" game. It uses **domain-driven architecture** with complex math formulas for damage calculation, gear optimization, and character stats management.

## Architecture

### Domain Layer (`app/domain/`)

Core business logic organized by bounded contexts:

- **`damage/`**: Damage calculation engine using mathematical formulas
  - `damageContext.ts` - Unified getter pattern for stats + gear bonuses
  - `damageFormula.ts` - Pure functions for min/normal/critical/affinity damage
  - `damageCalculator.ts` - Main entry point using DamageContext
- **`gear/`**: Equipment management and optimization
  - `gearAggregate.ts` - Aggregates equipped gear into flat stat bonuses
  - `gearOptimize.ts` - Brute-force optimizer testing gear combinations (cap: 1B combinations)
- **`skill/`**: Skill database and scaling calculations
  - `skills.ts` - 500+ skill definitions with multipliers and hit patterns
  - `skillDamage.ts` - Applies skill multipliers to base damage per hit
  - `skillContext.ts` - Creates context wrapper that applies skill multipliers to DamageContext
- **`stats/`**: Stat derivation and conversions
  - `derivedStats.ts` - Computes secondary stats from primary attributes (uses `computeDerivedStats()` helper)
- **`rotation/`**: Multi-skill rotation management
  - `defaultRotations.ts` - Seed data for common rotation patterns
- **`passiveSkillTypes.ts`**: Type definitions for PassiveSkill and InnerWay
- **`passiveSkills.ts`**: Database of 15+ passive skills (gắn vào martial arts)
- **`innerWays.ts`**: Database of 10+ inner ways (global hoặc martial art-specific)

### Presentation Layer (`app/ui/`)

Components organized by feature:

- **`layout/`**: Root-level tab routing via URL params (`?root=main&tab=stats` or `?root=gear&tab=equipped`)
  - `MainTabLayout.tsx` - Orchestrates main tabs (stats, import-export, rotation, damage, formula)
  - `GearTabLayout.tsx` - Gear management tabs (equipped, custom, compare)
  - `MainContent.tsx` - Dispatcher routing between main and gear layouts
- **`stats/`**, **`damage/`**, **`gear/`**, **`formula/`**, **`rotation/`**: Feature-specific panels
- Uses **shadcn/ui** components from `components/ui/` (New York style, `cn()` utility)

### Data Flow Pattern

1. **Input**: User edits stats in `StatsPanel` → triggers `onStatChange` → updates `stats` state
2. **Context**: `buildDamageContext(stats, elementStats, gearBonus)` creates unified getter
3. **Calculation**: `calculateDamage(ctx)` applies formulas → returns `{min, normal, critical, affinity}`
4. **Display**: `DamagePanel` renders results + stat impacts

## Critical Conventions

### State Management

- **No external state library** - uses React hooks + Context API
- **localStorage persistence** with `wwm_*` prefix keys:
  - `wwm_dmg_current_stats`, `wwm_element_stats`, `wwm_custom_gear`, `wwm_equipped`, `wwm_rotations`
- **GearProvider**: Context wrapper for gear state (see `providers/GearContext.tsx`)
- **Custom hooks** pattern: `useStats`, `useGear`, `useDMGOptimizer`, `useRotation`, `useSkillDamage` handle isolated state slices with effects

### Type System

- **Stat model**: `Stat { current: number | "", increase: number | "" }` - supports empty strings for UX
- **Gear system**: `CustomGear` with `mains[]`, `subs[]`, `addition?` attributes
- **Element types**: 4 elements (bellstrike, stonesplit, silkbind, bamboocut) with min/max/penetration/bonus stats
- **GearSlot**: Legacy migration from `"ring"`/`"talisman"` → `"disc"`/`"pendant"` (see `useGear.ts`)
- **Skill structure**: `Skill { id, name, category, hits[], canCrit?, canAffinity? }` where each hit has `physicalMultiplier`, `elementMultiplier`, `flatPhysical?`, `flatAttribute?`, `hits` count
- **Passive Skills**: `PassiveSkill { id, name, description, martialArtId, modifiers[] }` - tied to specific martial art, modifiers can be "stat" (percentage) or "flat" (fixed value)
- **Inner Ways**: `InnerWay { id, name, description, applicableToMartialArtId?, modifiers[] }` - can apply to all or specific martial art
- **Rotation Modifiers**: Rotations track `activePassiveSkills[]` and `activeInnerWays[]` (both default enabled)

### Damage Formula Pattern

```typescript
// All formulas follow this pattern:
export const calcMinimumDamage = (g: (k: string) => number) => {
  // g("StatName") fetches from context
  // Complex nested multiplications
  return Math.round(result * 10) / 10; // 1 decimal precision
};
```

**Key**: Formulas use `g()` getter from `DamageContext` - abstracts stat sources (base + increase + gear)

### Component Patterns

- **"use client"** directive required for all interactive components (Next.js 15 App Router)
- **Absolute imports** with `@/` alias (`@/app/`, `@/components/`, `@/lib/`)
- **Conditional rendering** based on `useSearchParams()` for tab navigation
- **Badge/Card/Input/Checkbox** from shadcn/ui - never create custom basic UI primitives
- **Passive/Inner Way UI**: Use Checkbox for toggles, show descriptions + notes, filter by martial art applicability

## Development Workflows

### Build & Dev

```bash
pnpm dev          # Turbopack dev server (port 3000)
pnpm build        # Production build
pnpm lint         # ESLint check
pnpm start        # Production server
```

### Adding New Features

1. **New stat**: Add to `STAT_GROUPS` in `constants.ts` + update `InputStats` type
2. **New gear slot**: Update `GearSlot` type in `types.ts` + add migration in `useGear.ts` (handle legacy names)
3. **New skill**: Add to `SKILLS` array in `domain/skill/skills.ts` with hit patterns (physicalMultiplier, elementMultiplier, etc.)
4. **New formula**: Implement pure function in `damageFormula.ts` using `g()` getter, use in `damageCalculator.ts`
5. **New rotation feature**: Use `useRotation()` hook which exposes full CRUD + modify operations
6. **New passive skill**: Add to `PASSIVE_SKILLS` in `domain/skill/passiveSkills.ts` with martial art and modifiers
7. **New inner way**: Add to `INNER_WAYS` in `domain/skill/innerWays.ts` (set `applicableToMartialArtId` if martial art specific)

### Testing Damage Changes

1. Edit formula in `damageFormula.ts`
2. Hot reload updates `DamagePanel` automatically
3. Check "Formula" tab to verify math display (uses KaTeX for rendering)
4. Test rotation damage via `useSkillDamage()` hook to verify skill multiplier application

## Key Files Reference

- **Entry point**: `app/page.tsx` → `DMGOptimizerClient.tsx` → `MainContent.tsx` (router)
- **Main orchestration**: `hooks/useDMGOptimizer.ts` (combines stats + damage + gear)
- **Stat definitions**: `app/constants.ts` (STAT_GROUPS, ELEMENT_DEFAULTS, STAT_LABELS, INITIAL_STATS)
- **Type contracts**: `app/types.ts` (Stat, ElementStats, InputStats, GearSlot, Rotation)
- **Skill types**: `app/domain/skill/types.ts` (Skill, SkillHit, MartialArtId)
- **Utility functions**: `lib/utils.ts` (cn), `app/utils/` (clamp, statLabel, importExport)
- **Hook ecosystem**: `hooks/useStats`, `useGear`, `useDamage`, `useDMGOptimizer`, `useRotation`, `useSkillDamage`, `useGearOptimize` - each manages isolated state slice
- **Stat display**: `domain/damage/buildFinalStatSections.ts` generates structured stat UI with sections (Combat, Attributes, Special) - used by `FinalStatPanel.tsx`
- **Passive/Inner Way hooks**: `hooks/usePassiveModifiers.ts` (applies modifiers), `hooks/useDamageContextWithModifiers.ts` (integrates into damage calc)

## Integration Points

- **Gemini AI**: OCR for gear import (`lib/gemini.ts` + `domain/gear/gearOcrSchema.ts`)
- **html-to-image**: Export damage panel as PNG (`utils/exportPng.ts`)
- **Recharts**: Pie chart for damage breakdown (`ui/damage/AverageDamagePie.tsx`, `RotationDamagePie.tsx`)
- **KaTeX**: Math formula rendering in FormulaPanel (`react-katex` dependency)

## Common Gotchas

1. **Empty string handling**: Stats use `""` not `0` for empty inputs - always use `Number(stat.current || 0)`
2. **Gear bonus aggregation**: Must flatten `mains + subs + addition` into flat record (see `gearAggregate.ts`)
3. **Context rebuilding**: `buildDamageContext()` must be called after ANY stat/gear/element change
4. **Derived stats**: Don't manually compute - use `computeDerivedStats()` which includes increase values
5. **Optimization performance**: Gear optimizer caps at 10k results / 1B combinations - avoid exponential growth
6. **Skill multi-hit damage**: Use `createSkillContext()` from `skillContext.ts` to transform base context with per-hit multipliers
7. **DamageResult shape**: Result includes `min`, `normal`, `critical`, `affinity` as `{value: number, percent: number}` objects, plus optional `averageBreakdown` with breakpoints
8. **URL routing**: Search params control UI layout via `MainContent.tsx` - use `root=main|gear` + `tab=stats|rotation|formula|etc`
9. **OCR integration**: `callGeminiVision()` in `lib/gemini.ts` requires base64 encoding - see `GearForm.tsx` for full example
10. **Rotation precision**: `Rotation` expects skill `order` to be sequential 0-N; use `moveSkill()` hook to maintain indices
11. **Passive skill modifiers**: Applied via `usePassiveModifiers()` hook - supports "stat" (% of base) and "flat" (fixed value) types
12. **Inner way applicability**: Check `applicableToMartialArtId` - if undefined, applies to all martial arts; otherwise filtered to specific martial art

## Naming Conventions

- **Files**: camelCase for components (`DamagePanel.tsx`), kebab-case for utils (`import-export.ts`)
- **Hooks**: `use*` prefix, return object with named properties
- **Domain functions**: Verb-first (`buildDamageContext`, `calculateDamage`, `aggregateEquippedGearBonus`)
- **Constants**: UPPER_SNAKE_CASE (`GEAR_SLOTS`, `ELEMENT_DEFAULTS`, `STAT_GROUPS`)
