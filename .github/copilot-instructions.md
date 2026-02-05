# Copilot instructions (wwm-damage-calculator)

## Project overview

Next.js 15 (App Router) client-side damage calculator for _Where Winds Meet_. Domain logic in `app/domain/*`, UI in `app/ui/*`, hooks in `app/hooks/*`.

## Dev commands

```bash
pnpm dev          # Turbopack (fast, but workers may fail)
pnpm dev:webpack  # Use when debugging module workers
pnpm lint         # ESLint
pnpm build && pnpm start
```

## Architecture & data flow

**Entry chain:** `app/page.tsx` → `DMGOptimizerClient.tsx` → `app/ui/layout/MainContent.tsx`
**Navigation:** URL params `?root=main|gear&tab=...` drive tab switching.

**Damage calculation pipeline:**

1. `aggregateEquippedGearBonus(...)` – sums gear attributes
2. `computeRotationBonuses(...)` – applies passive skills & inner ways via `modifierEngine.ts`
3. `buildDamageContext(stats, elementStats, combinedBonus)` – creates getter-based context
4. `calculateDamage(ctx)` – runs pure formulas; access stats via `ctx.get("StatName")`

Key files: `app/domain/damage/damageContext.ts`, `damageCalculator.ts`, `app/hooks/useDamage.ts`

## State & persistence

**Stat model:** `Stat = { current: number | "", increase: number | "" }`. Always use `Number(x || 0)` when computing.

**localStorage keys (stable API – don't rename):**

- `wwm_dmg_current_stats`, `wwm_element_stats`, `wwm_custom_gear`, `wwm_equipped`
- `wwm_rotations`, `wwm_rotations_selected_id`

**Gear context:** Wrap components in `<GearProvider>` before calling `useGear()`.

## Gear optimizer (workers)

- Async + cancellable via `AbortSignal`: see `app/domain/gear/gearOptimize.ts`
- Hook `useGearOptimize` prefers module workers, shards by slot, merges top-K results
- **Turbopack quirk:** Workers may fail; use `pnpm dev:webpack` or main-thread fallback kicks in

## Adding new features

| Feature               | Files to update                                                                |
| --------------------- | ------------------------------------------------------------------------------ |
| New stat              | `app/constants.ts` (groups/labels/defaults), `app/types.ts` (`InputStats`)     |
| New formula           | `app/domain/damage/damageFormula.ts`, wire in `damageCalculator.ts`            |
| New skill             | `app/domain/skill/skills.ts`; multi-hit via `skillContext.ts`/`skillDamage.ts` |
| New passive/inner way | `passiveSkills.ts` / `innerWays.ts`, apply via `modifierEngine.ts`             |

## Integrations

- **OCR import:** Gemini API in `lib/gemini.ts`, schema in `app/domain/gear/gearOcrSchema.ts`
- **Export PNG:** `html-to-image` in `app/utils/exportPng.ts`
- **Import/export:** JSON clipboard, version `"1.0"` in `app/utils/importExport.ts`

## Conventions

- Use shadcn/ui primitives from `components/ui/*` – don't hand-roll basic controls
- UI components receive computed data from hooks; keep domain logic pure
- Gear slots: `weapon_1`, `weapon_2`, `disc`, `pendant`, `head`, `chest`, `hand`, `leg`
