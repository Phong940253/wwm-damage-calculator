---
name: add-new-passive
description: Adding passive skill / inner way code changes (modifier engine, skill context, types, not data)
---

# Add New Passive / Inner Way — WWM Damage Calculator

Use when adding or modifying passive skill or inner way **logic in code** (not data editing via admin panel).

## Data vs Code

**Data** (skills, passives, inner ways, martial arts, rotations) lives in Supabase `static_data` table. Edit via Admin UI at `/admin`. Do NOT edit local JSON files.

**Code** changes needed only when:
- Adding a new modifier type or shape
- Adding new conditional bonus logic
- Adding new scaling formula

## Files

- `app/domain/skill/modifierEngine.ts`:
  - `computeRotationBonuses()` — applies flat/scale modifiers
  - `computeIncludedInStatsGearBonus()` — passives with `includedInStats: true`
- `app/domain/skill/passiveSkillTypes.ts` — types if new shape needed
- `app/domain/skill/skillContext.ts` — conditional overrides (e.g. UmbrellaBallistic)
- `app/domain/skill/skillDamage.ts` — if affects skill damage
- `app/types.ts` — `InputStats` if new stat needed

## Tests
- `tests/skillDamage.spec.ts`
- `tests/formula.spec.ts`
- Run: `pnpm test`
