# Copilot instructions (wwm-damage-calculator)

## What this is

- Next.js 15 (App Router) client-heavy damage calculator for _Where Winds Meet_.
- Domain logic lives in `app/domain/*` (math/DB-like data) and UI lives in `app/ui/*`.

## Dev commands

- `pnpm dev` (Turbopack) • `pnpm lint` • `pnpm build` • `pnpm start`

## Entry + navigation pattern

- Entry chain: `app/page.tsx` → `app/DMGOptimizerClient.tsx` → `app/ui/layout/MainContent.tsx`.
- Tabs are URL-search-param driven: `?root=main|gear&tab=...` (see `app/ui/layout/MainTabLayout.tsx`, `GearTabLayout.tsx`, `StatusBar.tsx`).

## Core data flow (the “why”)

- The UI edits stats/gear, then builds a unified getter-based context, then runs pure formulas.
- Pattern: `buildDamageContext(stats, elementStats, gearBonus)` → `calculateDamage(ctx)`.
- Formulas read via `g("StatName")` (see `app/domain/damage/damageContext.ts`, `damageFormula.ts`, `damageCalculator.ts`).

## State & persistence conventions

- Stat inputs are UX-friendly: `Stat = { current: number | "", increase: number | "" }` → use `Number(x || 0)` when computing.
- localStorage keys are stable API (don’t rename lightly):
  - `wwm_dmg_current_stats`, `wwm_element_stats`, `wwm_custom_gear`, `wwm_equipped`, `wwm_rotations`.
- Gear state must be under `GearProvider` (`app/providers/GearContext.tsx`) before calling `useGear()`.
- Gear slot migration exists (`ring/talisman` → `disc/pendant`) in `app/hooks/useGear.ts`.

## Adding/changing domain features (follow existing shapes)

- New stat: update `app/constants.ts` (groups/labels/defaults) + `app/types.ts` (`InputStats`).
- New damage math: add pure functions in `app/domain/damage/damageFormula.ts` and wire in `damageCalculator.ts`.
- New skill/hit pattern: add to `app/domain/skill/skills.ts`; multi-hit scaling flows through `skillContext.ts`/`skillDamage.ts`.
- Passive/Inner Way modifiers live in `app/domain/skill/passiveSkills.ts` / `innerWays.ts` and apply via `app/hooks/usePassiveModifiers.ts`.

## Integrations & UI primitives

- OCR import uses Gemini: `lib/gemini.ts` + schema `app/domain/gear/gearOcrSchema.ts` (used by `app/ui/gear/GearForm.tsx`).
- Export PNG uses `html-to-image` in `app/utils/exportPng.ts`.
- Use shadcn/ui primitives from `components/ui/*` (don’t hand-roll basic controls).
