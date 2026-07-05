---
name: add-new-stat
description: Adding new stats to the game (constants.ts + types.ts + gear/OCR/tune files)
---

# Add New Stat — WWM Damage Calculator

Use when adding a new stat (e.g. a new attribute, rate, element, or special stat) to the game.

## Files to Modify

### 1. `app/constants.ts`
- Add label to `STAT_LABELS`
- Add to appropriate `STAT_GROUPS` group (Core, Attributes, Element, Rates, Defense)
- Add default `{ current: 0, increase: 0 }` to `INITIAL_STATS`

### 2. `app/types.ts`
- Add key to `InputStats` type

### 3. If stat appears on gear
- `app/domain/gear/gearOcrSchema.ts`: add to OCR prompt valid keys
- `app/domain/gear/gearConstants.ts`: add to `CANDIDATE_STATS` + `SINGLE_LINE_STATS` if single-line-only
- `app/ui/gear/GearStatSelect.tsx`: add to `STAT_OPTION_GROUPS` Special group

### 4. If stat is tuneable
- `app/domain/gear/tuneAdvisor.ts`: add to `TuneStatKey` union + `DEFAULT_TUNE_LIMITS`

### 5. If stat appears in damage results
- `app/domain/damage/buildFinalStatSections.ts`: add to `SPECIAL_STAT_KEYS`

### 6. Labels
- `app/utils/statLabel.ts`: add handler if needed

### 7. Verify
- `pnpm test`
- `pnpm build`
