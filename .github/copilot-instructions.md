# Copilot instructions (wwm-damage-calculator)

## Overview

Next.js 15 (App Router) client-side damage calculator for _Where Winds Meet_.
Keep domain logic pure in `app/domain/*`, orchestration in hooks `app/hooks/*`, and rendering in `app/ui/*`.

## Dev workflow

```bash
pnpm dev          # Turbopack (fast)
pnpm dev:webpack  # Preferred when debugging worker behavior
pnpm lint
pnpm build && pnpm start
```

Workers can fail in Turbopack dev; `useGearOptimize` already falls back to main-thread compute.

## Big-picture architecture

- App shell: `app/page.tsx` (dynamic no-SSR) → `app/DMGOptimizerClient.tsx` → `app/ui/layout/MainContent.tsx`.
- URL-driven navigation: `?root=main|gear` and `?tab=...` (`MainContent`, `MainTabLayout`, `GearTabLayout`).
- Main orchestration hook: `app/hooks/useDMGOptimizer.ts` wires stats + elements + level + gear + damage.
- Damage pipeline: `aggregateEquippedGearBonus` → `computeIncludedInStatsGearBonus`/`computeRotationBonuses` → `buildDamageContext` → `calculateDamage`.
- Rotation mode uses per-skill totals via `calculateSkillDamage` (see `app/hooks/useDamage.ts`).

## State, persistence, and migrations

- Stat shape is `Stat = { current: number | "", increase: number | "" }`; coerce with `Number(x || 0)` when computing.
- Stable storage keys: `wwm_dmg_current_stats`, `wwm_element_stats`, `wwm_custom_gear`, `wwm_equipped`, `wwm_rotations`, `wwm_rotations_selected_id`.
- Additional persisted settings: `wwm_ui_language`, `wwm_gemini_settings`.
- Do not remove migration behavior in hooks:
  - `useGear`: legacy slot mapping (`ring`→`disc`, `talisman`→`pendant`).
  - `useRotation`: merges defaults + saved rotations, normalizes passives/inner ways, keeps tier-collapsing and id aliases.
- `useGear()` must be called under `<GearProvider>` (`app/providers/GearContext.tsx`).

## Project-specific conventions

- Keep formulas/context access in domain files; UI should consume hook outputs, not recompute formulas.
- In formula code, always read runtime stats through `ctx.get("...")` keys (`app/domain/damage/damageContext.ts`).
- For new stats, update both metadata and types: `app/constants.ts` + `app/types.ts`.
- Use existing shadcn/ui primitives from `components/ui/*`.
- Gear slots are fixed: `weapon_1`, `weapon_2`, `disc`, `pendant`, `head`, `chest`, `hand`, `leg`.

## Integrations and boundaries

- OCR: `lib/gemini.ts` reads runtime settings from `app/utils/geminiSettings.ts` (localStorage overrides env).
- Import/export: JSON clipboard contract version is exactly `"1.0"` (`app/utils/importExport.ts`).
- Optimizer worker bridge: `app/workers/gearOptimize.worker.ts`; core async engine in `app/domain/gear/gearOptimize.ts` (AbortSignal + progress callbacks).

## Common change map

- New formula: `app/domain/damage/damageFormula.ts` + wire in `app/domain/damage/damageCalculator.ts`.
- New skill / multi-hit behavior: `app/domain/skill/skills.ts`, `skillContext.ts`, `skillDamage.ts`.
- New passive/inner way: `passiveSkills.ts` / `innerWays.ts` + apply via `modifierEngine.ts`.
