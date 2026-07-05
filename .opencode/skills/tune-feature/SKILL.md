---
name: tune-feature
description: Working with gear tune features (tune variants, success rate, tune history in optimizer + UI)
---

# Tune Feature — WWM Damage Calculator

Use when working with gear tune-related features.

## Architecture

- Tune branching happens in the **gear optimizer** (DFS expansion)
- Success rate computed in **tuneAdvisor.ts** (shared with dialog UI)
- `GearWithTune` extends `CustomGear` with `__tuneId`, `__tuneLabel`, `__tuneFrom`

## Key Files

### Core Logic
- `app/domain/gear/tuneAdvisor.ts`:
  - `generateTuneVariants(gear, element)` — 1 variant per eligible target stat
  - `computeSingleTuneSuccessRate(gear, subIndex, targetStat, element)` — 1/eligible
  - `getTuneSystemStatPool(element)` — 6-stats pool
  - `isTuneTargetAllowedBySubRules(gear, subIndex, stat)` — sub-stat uniqueness
  - `getGearTuneHistory(gear, subIndex)` — history + fallback
  - `getTuneSuccessRateToneClass(rate)` — color coding
- `app/domain/gear/gearOptimize.ts`:
  - `considerTune` flag
  - Tune variant expansion in DFS + swap variant generation
  - Dedup by `__tuneId`

### UI
- `app/ui/gear/GearOptimizeDialog.tsx`: Tune/Swap column, Rate column, composite rate, popover
- `app/ui/gear/GearForm.tsx`: tune history rows

### Hooks & Workers
- `app/hooks/useGearOptimize.ts`
- `app/workers/gearOptimize.worker.ts`

### Tests
- `tests/tuneAwareOptimize.spec.ts` — 26 tests
- `tests/gearDedup.spec.ts` — 7 dedup tests
- Run: `pnpm test -- tests/tuneAwareOptimize.spec.ts`
