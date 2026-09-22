# Collection Game — Sub-project 2: Virtual Items, Boxes, Fragments — Design Spec

Date: 2026-09-22

## Context

Continues the roadmap from `docs/superpowers/specs/2026-09-22-game-core-design.md`
(sub-project 1, "game server core", merged at `81c269f`). That project gave
users points via real-product registration (collection completion + title
rewards). This project gives points a use: opening boxes for virtual item
fragments, building toward `REMEMBUY HOUSE` in a later release.

Decisions confirmed with the user:
- One universal box to start (not one box per space).
- A box open produces exactly ONE result: either a fragment of one virtual
  item, or (low probability) that item complete outright. No multi-fragment
  payouts in this project.
- A fragment of an already-`COMPLETE` item just accumulates; no conversion,
  no cap. Exchange/disassembly is future work.
- Box price: 500P, stored as data so an admin can change it later (no admin
  UI yet — sub-project 4).
- Initial catalog: 3-4 virtual items per grade (COMMON/ADVANCED/RARE/LEGENDARY),
  12-16 items total.
- **Also fixes, in this project:** sub-project 1's final review found that a
  fresh install silently claims all `SEED_ITEMS` (`src/data/seedItems.ts`,
  ids prefixed `seed-`) on first load, banking 1,200P and 6 titles with no
  user action. Fix: `GameContext`'s reconciliation now excludes any item
  whose id starts with `seed-`. This does not retroactively remove points
  already earned by any user who already ran the old code (out of scope —
  no user-facing effect for a fresh install after this ships).

## Data model (same style as sub-project 1: `server/game/db.js`, `CREATE TABLE IF NOT EXISTS`, snake_case, `node:sqlite`)

Catalog (config, not user data):

```
virtual_items(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,             -- COMMON | ADVANCED | RARE | LEGENDARY
  fragments_required INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  -- forward-compat for REMEMBUY HOUSE; unused this project, always NULL:
  room_type TEXT, placement_type TEXT, width INTEGER, height INTEGER,
  asset_id TEXT, theme_id TEXT, set_id TEXT
)

boxes(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cost_points INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  -- forward-compat for seasonal/brand boxes; unused this project, always NULL:
  start_at TEXT, end_at TEXT, event_id TEXT, limited INTEGER NOT NULL DEFAULT 0
)

box_drop_entries(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  box_id TEXT NOT NULL REFERENCES boxes(id),
  item_id TEXT NOT NULL REFERENCES virtual_items(id),
  result_type TEXT NOT NULL,       -- FRAGMENT | FULL_ITEM
  weight INTEGER NOT NULL,         -- relative weight; drawn by weighted random over active rows for the box
  active INTEGER NOT NULL DEFAULT 1
)
```

Per-user state:

```
user_item_fragments(
  user_id TEXT NOT NULL REFERENCES users(id),
  item_id TEXT NOT NULL REFERENCES virtual_items(id),
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, item_id)
)

user_items(
  user_id TEXT NOT NULL REFERENCES users(id),
  item_id TEXT NOT NULL REFERENCES virtual_items(id),
  status TEXT NOT NULL,            -- COLLECTING | COMPLETE (no row = LOCKED)
  completed_at TEXT,
  PRIMARY KEY (user_id, item_id)
)
```

`point_history.type` gains `ITEM_BOX_OPEN` (negative `amount`), already
supported since the column has no CHECK constraint (verified in sub-project
1's final review). `source_id` = the box id.

Seed data (in `migrate`, guarded like the existing catalog/config seeds —
only inserts when `virtual_items` is empty): 14 items — COMMON ×4
(`fragments_required` 10), ADVANCED ×4 (15), RARE ×3 (20), LEGENDARY ×3 (30);
Korean placeholder names in the brief's style (e.g. "기본 세면대",
"모던 세면대", "골드 거울", "스톤 욕조"). One box, `box-starter`, 500P. Drop
table (`box_drop_entries`) for `box-starter`: for every active item, one
`FRAGMENT` row and one `FULL_ITEM` row. Weights: `FRAGMENT` weight scales
inversely with grade rarity (COMMON 40, ADVANCED 25, RARE 12, LEGENDARY 5 per
item) so lower grades drop more often; `FULL_ITEM` weight is a flat 1 for
every item regardless of grade (so a rare/legendary full-item hit is rarer
only because there are fewer such items competing, not because of an extra
grade penalty — simplest correct interpretation of "low chance", explicit so
it can be tuned). With 4+4+3+3 items this gives roughly a 14-in-(14×"weight
sum + 14") ≈ low single-digit percent chance of any full item per open — the
exact value is a product tuning knob for the future admin UI, not something
to hand-verify here.

## Rules (pure functions, `server/game/itemRules.js`)

- `pickWeighted(entries, randomFn = Math.random)`: weighted random pick over
  `{weight}` objects; throws on an empty or all-zero-weight list (a config
  bug, not a runtime state to swallow).
- `applyFragment(existingCount, fragmentsRequired)`: returns
  `{ newCount, justCompleted }` — `justCompleted` is true only the instant
  `newCount` first reaches `fragmentsRequired` from below (guards a
  since-lowered `fragments_required` from re-triggering completion logic; a
  duplicate-fragment add against an already-`COMPLETE` item is never routed
  through this function — the service checks status first).

## Service (`server/game/itemService.js`)

- `getDex(db, userId)` -> for every active `virtual_item`: `{ id, name,
  grade, fragmentsRequired, status: 'LOCKED'|'COLLECTING'|'COMPLETE',
  fragmentCount }` (0/no-row = LOCKED). Read-only, never creates a user.
- `getBoxes(db)` -> active boxes with `id, name, costPoints`.
- `openBox(db, userId, boxId, now)` — ONE transaction:
  1. Create user if missing. Look up the box; 404-equivalent (throw a typed
     error the route maps to 400) if missing/inactive.
  2. Compute the user's point balance (`SUM(point_history.amount)`); if less
     than `cost_points`, throw an "insufficient points" error (400).
  3. Insert `point_history` row: `-cost_points`, type `ITEM_BOX_OPEN`,
     `source_id = boxId`.
  4. Load active `box_drop_entries` for the box; `pickWeighted` one.
  5. If `result_type = FULL_ITEM`: upsert `user_items` to `COMPLETE`
     (`completed_at = now`) regardless of prior state (already-complete stays
     complete; a first-time full-item hit skips `COLLECTING` entirely, which
     is intentional and matches the spec's "완제품을 상자에서 직접 획득했을
     경우 바로 COMPLETE 처리합니다").
  6. If `result_type = FRAGMENT`: if `user_items.status = 'COMPLETE'`, just
     increment `user_item_fragments.count` (no status change — this is the
     accumulate-forever case). Otherwise increment the fragment count, call
     `applyFragment`, and if `justCompleted`, upsert `user_items` to
     `COMPLETE`; else ensure a `COLLECTING` row exists.
  7. Return `{ result: { type, itemId, itemName, grade }, pointsSpent,
     pointsBalance, dexEntry: <the affected item's getDex-shaped row> }`.
- Every step after the balance check runs inside the same transaction as the
  point deduction — a thrown error anywhere rolls back the whole open,
  including the point spend.

## HTTP API (extends `server/game/routes.js`, still under `/api/game/`, same
`X-Device-Id` header requirement)

- `GET /api/game/boxes` -> `{ boxes: [...] }`.
- `GET /api/game/dex` -> `{ items: [...] }`.
- `POST /api/game/boxes/:boxId/open` -> the `openBox` result shape above;
  400 `{error:'invalid box'}` / `{error:'insufficient points'}` as
  appropriate; 500 on unexpected errors, matching the existing route
  conventions.

## Client (`src/lib/gameApi.ts`, `src/state/GameContext.tsx` — still no screens; sub-project 3 renders this)

- `gameApi.ts` gains `fetchBoxes()`, `fetchDex()`, `openBox(boxId)` following
  the same `request<T>` wrapper pattern (device-id header, throw on non-2xx).
- `GameContext`'s reconciliation effect changes ONE line: the `masterItemId`
  collection filters out items whose `id` starts with `seed-` before calling
  `claim`. If that leaves zero ids, it falls back to `refresh()` (closing the
  gap the final review noted: previously a failed/empty claim path never
  called `refresh()`, leaving `state` `null` all session even though `GET
  /api/game/state` would have worked — this project fixes that too, since
  it's now the normal path for every fresh install).
- No new provider is added; `useGame()` gains `boxes`, `dex`, and
  `openBox(boxId)` (updates `state`/`boxes`/`dex` from the response) as
  additional context fields, loaded alongside the existing state fetch.

## Testing

Same layout as sub-project 1: `server/game/itemRules.test.mjs` (weighted pick
distribution/edge cases, `applyFragment` boundary and re-trigger guard),
`server/game/itemService.test.mjs` (in-memory SQLite: insufficient points
rejected and rolls back nothing; a fragment below threshold; a fragment that
completes an item; a fragment against an already-complete item accumulates
without a status change; a `FULL_ITEM` result completes regardless of prior
fragment count; point history shows the negative `ITEM_BOX_OPEN` row;
`getDex`/`getBoxes` never write), `server/game/routes.test.mjs` additions
(new endpoints, box-not-found, insufficient-points), `src/lib/gameApi.test.ts`
additions, `src/state/GameContext.test.tsx` additions (the `seed-` filter,
the new empty-ids-falls-back-to-refresh path). Manual: open the real server,
`POST /api/game/boxes/box-starter/open` repeatedly with a fresh device id and
confirm the balance only ever decreases by 500 and never goes negative
(insufficient-points kicks in at 0-499 remaining).

## Out of scope

Any screen (sub-project 3), admin editing of items/boxes/drop
tables/fragment requirements (sub-project 4), fragment disassembly/exchange,
multi-result box opens, per-space boxes, seasonal/limited boxes (the
`start_at`/`end_at`/`event_id`/`limited` columns exist but are unused),
gifting a box or item, retroactively correcting any point balance a user
already earned from the pre-fix demo-seed reconciliation, photo-based item
recognition.
