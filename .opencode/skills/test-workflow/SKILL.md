---
name: test-workflow
description: Running and writing tests for the project (vitest, node env, globals)
---

# Test Workflow — WWM Damage Calculator

Use when running or writing tests.

## Commands

```bash
pnpm test                           # Run all tests
pnpm test -- tests/someFile.spec.ts  # Single test file (--run)
```

## Test Files (11 files, 62 tests)

| File | Description |
|------|-------------|
| `tests/tuneAwareOptimize.spec.ts` | Tune + swap (26 tests) |
| `tests/gearDedup.spec.ts` | Result dedup (7 tests) |
| `tests/levelSettings.spec.ts` | Level/boss settings (8 tests) |
| `tests/rules.spec.ts` | Gear rules (5 tests) |
| `tests/formula.spec.ts` | Formula unit (5 tests) |
| `tests/damageConsistency.spec.ts` | Damage consistency (3 tests) |
| `tests/gearAggregate.spec.ts` | Gear aggregation (2 tests) |
| `tests/skillDamage.spec.ts` | Skill damage (2 tests) |
| `tests/swapDebugTest.spec.ts` | Swap integration (2 tests) |
| `tests/damage.spec.ts` | Damage integration (1 test) |
| `tests/gearBeamSearch.spec.ts` | Beam search (60s timeout) |

## Conventions
- Tests use `@/` path alias
- Vitest globals enabled (`describe`, `it`, `expect`)
- Node environment
- Use `makeGear()` helper for test gear
