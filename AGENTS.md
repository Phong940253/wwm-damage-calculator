# WWM Damage Calculator — Agent Guide

## Commands

```
pnpm dev          # next --turbopack (faster, but workers may fail)
pnpm dev:webpack  # next dev (use if worker issues)
pnpm lint         # next lint (flat config: next/core-web-vitals + next/typescript)
pnpm test         # vitest (tests in tests/**/*.spec.ts, node env, globals)
pnpm build        # next build
```

`gearBeamSearch.spec.ts` has a 60s timeout. Single test: `pnpm test -- tests/someFile.spec.ts` (uses `--run`, exits immediately).

## Architecture

- **Layers:** `app/domain/` (pure TS logic, no React) → `app/hooks/` (orchestration) → `app/ui/` (rendering). Hooks are the bridge; UI should never recompute formulas.
- **Entry:** `app/page.tsx` (dynamic, no SSR) → `DMGOptimizerClient.tsx` → `ui/layout/MainContent.tsx`.
- **URL nav:** `?root=main|gear` + `?tab=...`.
- **Damage pipeline:** `aggregateEquippedGearBonus` → `computeRotationBonuses` → `buildDamageContext` → `calculateDamage`.
- **Path alias:** `@/` maps to project root (tsconfig + vitest + Next.js).
- **Cannot use `useGear()` outside `<GearProvider>`** (set up in `app/layout.tsx`).

## State & Persistence (localStorage keys — do not rename)

`wwm_dmg_current_stats`, `wwm_element_stats`, `wwm_custom_gear`, `wwm_equipped`, `wwm_rotations`, `wwm_rotations_selected_id`, `wwm_ui_language`, `wwm_gemini_settings`.

**Stat shape:** `type Stat = { current: number | ""; increase: number | "" }`. Always coerce: `Number(x || 0)`.

## Workers & Turbopack

Gear optimizer uses Web Workers (`app/workers/gearOptimize.worker.ts`). Turbopack may fail with module workers; `useGearOptimize` falls back to main-thread execution automatically. If debugging worker behavior, use `pnpm dev:webpack`.

## Gear

- **Slots (fixed):** `weapon_1`, `weapon_2`, `disc`, `pendant`, `head`, `chest`, `hand`, `leg`.
- **Legacy names** (`ring`→`disc`, `talisman`→`pendant`) migrated in `useGear`.
- **Import/export version:** `"1.0"` (see `app/utils/importExport.ts`).

## Testing

- `pnpm test` runs vitest on `tests/**/*.spec.ts`.
- Tests use `@/` alias.
- 6 test files: damage, formula, gearAggregate, gearBeamSearch, levelSettings, skillDamage.

## Integrations

- **Gemini OCR:** `lib/gemini.ts` reads API key from `NEXT_PUBLIC_GEMINI_API_KEY` env or `localStorage("wwm_gemini_settings")`.
- **Supabase:** static game data (skills, passives, inner ways) stored in Supabase `static_data` table (5 rows, ~101KB total); admin panel at `/admin`.
- **Static data cache:** localStorage `wwm_static_data_cache` + Supabase Realtime subscription. On page load, cached data renders immediately (no loading spinner). Realtime pushes propagate admin edits to all clients instantly.

## Common Changes

| What | Where |
|---|---|
| New stat | `app/constants.ts` + `app/types.ts` |
| New formula | `app/domain/damage/damageFormula.ts` → `damageCalculator.ts` |
| New skill | `app/domain/skill/skills.ts` (+ `skillContext.ts` / `skillDamage.ts` for multi-hit) |
| New passive/inner way | `app/domain/skill/passiveSkills.ts` / `innerWays.ts` + `modifierEngine.ts` |

## Reference

Fuller guidance in `.github/copilot-instructions.md`.
