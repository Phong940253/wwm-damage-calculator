# WWM Damage Calculator

Damage calculator for **Where Winds Meet**, built with **Next.js 15 (App Router)**.

Main goals of this project:

- Calculate damage based on character stats, element stats, gear, skills, and rotations.
- Optimize gear with worker-based processing and cancellable tasks (`AbortSignal`).
- Support config import/export, gear OCR (Gemini), and PNG export.

## Tech Stack

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS + shadcn/ui (Radix primitives)
- Recharts (charts)
- html-to-image (image export)

## Requirements

- Node.js 20+
- pnpm 9+

## Setup & Run Locally

```bash
pnpm install
pnpm dev
```

Open: [http://localhost:3000](http://localhost:3000)

## Scripts

```bash
pnpm dev          # Run with Turbopack (faster)
pnpm dev:webpack  # Run with webpack (more stable for worker debugging)
pnpm lint         # ESLint
pnpm build        # Build production
pnpm start        # Run production server
```

> Note: Turbopack may fail with module workers in some cases. If you hit optimizer/worker issues, use `pnpm dev:webpack`.

## Architecture Overview

- Entry: `app/page.tsx` → `app/DMGOptimizerClient.tsx` → `app/ui/layout/MainContent.tsx`
- Domain logic: `app/domain/*`
- Hooks: `app/hooks/*`
- UI: `app/ui/*`

Navigation uses URL params:

- `?root=main|gear`
- `?tab=...`

## Damage Calculation Flow

Main pipeline:

1. `aggregateEquippedGearBonus(...)` aggregates stats from equipped gear.
2. `computeRotationBonuses(...)` applies passive skills and inner ways via `modifierEngine.ts`.
3. `buildDamageContext(stats, elementStats, combinedBonus)` creates a getter-based context.
4. `calculateDamage(ctx)` runs pure formulas and accesses stats via `ctx.get("StatName")`.

Key files:

- `app/domain/damage/damageContext.ts`
- `app/domain/damage/damageCalculator.ts`
- `app/hooks/useDamage.ts`

## State & Persistence

Stat model:

```ts
type Stat = { current: number | ""; increase: number | "" };
```

Always coerce values safely during calculations:

```ts
Number(x || 0)
```

localStorage keys (stable API, do not rename):

- `wwm_dmg_current_stats`
- `wwm_element_stats`
- `wwm_custom_gear`
- `wwm_equipped`
- `wwm_rotations`
- `wwm_rotations_selected_id`

## Gear Optimizer

- Core: `app/domain/gear/gearOptimize.ts`
- Hook: `app/hooks/useGearOptimize.ts`
- Worker: `workers/gearOptimize.worker.ts`

Characteristics:

- Async + cancellable (`AbortSignal`)
- Prefers module workers, shards by slot, then merges top-K results
- Falls back to main-thread execution when workers are unavailable

## Integrations

- Gear OCR via Gemini: `lib/gemini.ts`, schema in `app/domain/gear/gearOcrSchema.ts`
- Export PNG: `app/utils/exportPng.ts`
- Import/export JSON clipboard (version `"1.0"`): `app/utils/importExport.ts`

## Quick Extension Guide

| New feature               | Files to update                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| Add a new stat            | `app/constants.ts`, `app/types.ts` (`InputStats`)                                              |
| Add a new damage formula  | `app/domain/damage/damageFormula.ts`, then wire it in `app/domain/damage/damageCalculator.ts` |
| Add a new skill           | `app/domain/skill/skills.ts` (+ `skillContext.ts` / `skillDamage.ts` for multi-hit)           |
| Add passive/inner way     | `app/domain/skill/passiveSkills.ts`, `app/domain/skill/innerWays.ts`, `modifierEngine.ts`     |

## Development Conventions

- Use components from `components/ui/*` (shadcn/ui), avoid creating new primitives unless necessary.
- Keep domain logic pure; UI should consume computed data from hooks.
- Standard gear slots: `weapon_1`, `weapon_2`, `disc`, `pendant`, `head`, `chest`, `hand`, `leg`.
- When using `useGear()`, ensure the component is wrapped by `<GearProvider>`.

## Build production

```bash
pnpm build && pnpm start
```

## License

No license is currently declared in this repository. Add a `LICENSE` file before public release.
