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
  - `skills.ts` - 500+ skill definitions with multipliers
  - `skillDamage.ts` - Applies skill multipliers to base damage
- **`stats/`**: Stat derivation and conversions
  - `derivedStats.ts` - Computes secondary stats from primary attributes

### Presentation Layer (`app/ui/`)

Components organized by feature:

- **`layout/`**: Root-level structure with tab routing via URL params (`?root=main&tab=stats`)
- **`stats/`**, **`damage/`**, **`gear/`**, **`formula/`**: Feature-specific panels
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
  - `wwm_dmg_current_stats`, `wwm_element_stats`, `wwm_custom_gear`, `wwm_equipped`
- **GearProvider**: Context wrapper for gear state (see `providers/GearContext.tsx`)
- **Custom hooks** pattern: `useStats`, `useGear`, `useDMGOptimizer` handle state + effects

### Type System

- **Stat model**: `Stat { current: number | "", increase: number | "" }` - supports empty strings for UX
- **Gear system**: `CustomGear` with `mains[]`, `subs[]`, `addition?` attributes
- **Element types**: 4 elements (bellstrike, stonesplit, silkbind, bamboocut) with min/max/penetration/bonus stats
- **GearSlot**: Legacy migration from `"ring"`/`"talisman"` → `"disc"`/`"pendant"` (see `useGear.ts`)

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
- **Badge/Card/Input** from shadcn/ui - never create custom basic UI primitives

## Development Workflows

### Build & Dev

```bash
pnpm dev          # Turbopack dev server (port 3000)
pnpm build        # Production build
pnpm lint         # ESLint check
```

### Adding New Features

1. **New stat**: Add to `STAT_GROUPS` in `constants.ts` + update `InputStats` type
2. **New gear slot**: Update `GearSlot` type + add migration in `useGear.ts`
3. **New skill**: Add to `SKILLS` array in `skills.ts` with multipliers
4. **New formula**: Implement pure function in `damageFormula.ts`, use in `damageCalculator.ts`

### Testing Damage Changes

1. Edit formula in `damageFormula.ts`
2. Hot reload updates `DamagePanel` automatically
3. Check "Formula" tab to verify math display (uses KaTeX for rendering)

## Key Files Reference

- **Entry point**: `app/page.tsx` → `DMGOptimizerClient.tsx`
- **Main orchestration**: `hooks/useDMGOptimizer.ts` (combines stats + damage + gear)
- **Stat definitions**: `app/constants.ts` (STAT_GROUPS, ELEMENT_DEFAULTS)
- **Type contracts**: `app/types.ts` (Stat, CustomGear, InputStats, ElementStats)
- **Utility functions**: `lib/utils.ts` (cn), `app/utils/` (clamp, statLabel, importExport)

## Integration Points

- **Gemini AI**: OCR for gear import (`lib/gemini.ts` + `domain/gear/gearOcrSchema.ts`)
- **html-to-image**: Export damage panel as PNG (`utils/exportPng.ts`)
- **Recharts**: Pie chart for damage breakdown (`ui/damage/AverageDamagePie.tsx`)
- **KaTeX**: Math formula rendering in FormulaPanel (`react-katex` dependency)

## Common Gotchas

1. **Empty string handling**: Stats use `""` not `0` for empty inputs - always use `Number(stat.current || 0)`
2. **Gear bonus aggregation**: Must flatten `mains + subs + addition` into flat record (see `gearAggregate.ts`)
3. **Context rebuilding**: `buildDamageContext()` must be called after ANY stat/gear/element change
4. **Derived stats**: Don't manually compute - use `computeDerivedStats()` which includes increase values
5. **Optimization performance**: Gear optimizer caps at 10k results / 1B combinations - avoid exponential growth

## Naming Conventions

- **Files**: camelCase for components (`DamagePanel.tsx`), kebab-case for utils (`import-export.ts`)
- **Hooks**: `use*` prefix, return object with named properties
- **Domain functions**: Verb-first (`buildDamageContext`, `calculateDamage`, `aggregateEquippedGearBonus`)
- **Constants**: UPPER_SNAKE_CASE (`GEAR_SLOTS`, `ELEMENT_DEFAULTS`)
