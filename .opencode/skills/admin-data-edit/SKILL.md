---
name: admin-data-edit
description: Editing game data through admin panel (skills, passives, inner ways, martial arts, rotations)
---

# Admin Data Edit — WWM Damage Calculator

Use when editing game data through the admin panel.

## Location

`/admin` on the tool URL. Requires admin secret key.

## Data Types (5 rows in Supabase `static_data`)

| Key | Admin Tab |
|-----|-----------|
| `skills` | Skills |
| `passiveSkills` | Passive Skills |
| `innerWays` | Inner Ways |
| `martialArts` | Martial Arts |
| `defaultRotations` | Default Rotations |

## Workflow

1. Open `/admin` in browser
2. Enter admin secret key
3. Select data type from sidebar
4. Click a row to edit via modal form (or use raw JSON toggle)
5. Click "Save to DB" → upserts to Supabase → all clients get Realtime push instantly

## Notes
- Do NOT edit local JSON files (`app/domain/skill/data/*.json`) — they are outdated
- Admin edits go only to Supabase, not back to git
- To reset from seed: click "Seed JSON" button
- Data cached in localStorage key `wwm_static_data_cache` — hard refresh + clear cache if stale
