# Copilot instructions (wwm-damage-calculator)

## What this is

- Next.js 15 (App Router) client-heavy damage calculator for _Where Winds Meet_.
- Domain logic lives in `app/domain/*` (math/DB-like data) and UI lives in `app/ui/*`.

## Dev commands

- `pnpm dev` (Turbopack) • `pnpm dev:webpack` (useful when debugging module workers) • `pnpm lint` • `pnpm build` • `pnpm start`

## Entry + navigation pattern

- Entry chain: `app/page.tsx` → `app/DMGOptimizerClient.tsx` → `app/ui/layout/MainContent.tsx`.
- Tabs are URL-search-param driven: `?root=main|gear&tab=...` (see `app/ui/layout/MainTabLayout.tsx`, `GearTabLayout.tsx`, `StatusBar.tsx`).

## Core data flow (the “why”)

- The UI edits stats/element/gear + optional rotation, then builds a getter-based context and runs pure formulas.
- Pattern: `aggregateEquippedGearBonus(...)` + `computeRotationBonuses(...)` → `buildDamageContext(...)` → `calculateDamage(ctx)`.
- Rotation passives/inner-ways are additive/scale bonuses applied via `app/domain/skill/modifierEngine.ts` and summed with gear bonuses (see `app/hooks/useDamage.ts`).
- Formulas read via `const g = ctx.get; g("StatName")` (see `app/domain/damage/damageContext.ts`, `damageFormula.ts`, `damageCalculator.ts`).

## State & persistence conventions

- Stat inputs are UX-friendly: `Stat = { current: number | "", increase: number | "" }` → use `Number(x || 0)` when computing.
- localStorage keys are stable API (don’t rename lightly):
  - `wwm_dmg_current_stats`, `wwm_element_stats`, `wwm_custom_gear`, `wwm_equipped`, `wwm_rotations`, `wwm_rotations_selected_id`.
- Gear state must be under `GearProvider` (`app/providers/GearContext.tsx`) before calling `useGear()`.
- Gear slot migration exists (`ring/talisman` → `disc/pendant`) in `app/hooks/useGear.ts`.

## Gear optimizer (worker + sharding)

- Optimizer is async + cancellable: `computeOptimizeResultsAsync(...)` with `AbortSignal` (see `app/domain/gear/gearOptimize.ts`).
- UI entry is `app/hooks/useGearOptimize.ts`: prefers module workers (`app/workers/gearOptimize.worker.ts`), shards by restricting one slot via `restrictSlots`, then merges top-K results.
- If module workers fail in dev (notably with Turbopack), the hook hard-falls back to main-thread computation; `pnpm dev:webpack` is a good workaround for worker debugging.

## Adding/changing domain features (follow existing shapes)

- New stat: update `app/constants.ts` (groups/labels/defaults) + `app/types.ts` (`InputStats`).
- New damage math: add pure functions in `app/domain/damage/damageFormula.ts` and wire in `damageCalculator.ts`.
- New skill/hit pattern: add to `app/domain/skill/skills.ts`; multi-hit scaling flows through `skillContext.ts`/`skillDamage.ts`.
- Passive/Inner Way modifiers live in `app/domain/skill/passiveSkills.ts` / `innerWays.ts` and apply via `app/hooks/usePassiveModifiers.ts`.

## Integrations & UI primitives

- OCR import uses Gemini: `lib/gemini.ts` + schema `app/domain/gear/gearOcrSchema.ts` (used by `app/ui/gear/GearForm.tsx`).
- Export PNG uses `html-to-image` in `app/utils/exportPng.ts`.
- Import/export uses JSON clipboard payloads (`app/utils/importExport.ts`), currently `version: "1.0"`.
- Use shadcn/ui primitives from `components/ui/*` (don’t hand-roll basic controls).
