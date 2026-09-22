# Collection Game — Sub-project 1: Game Server Core — Design Spec

Date: 2026-09-22

## Context and roadmap

Source: product brief "REMEMBUY 추가 기능 개발 기획안" (real product
registration -> collection slots -> titles -> benefits -> points -> virtual
items via random boxes -> virtual item dex; the virtual house is a later
release, so data structures must stay extensible for it).

Architecture decision (confirmed with the user): **option A — server-
authoritative economy**. Points, the point log, title state and (later) box
drops live on the server; identity is the client's existing anonymous device
id, stored as `user_id` everywhere so real accounts can replace it later. There
is no login in this project.

Sub-projects (each gets its own spec -> plan -> implementation):

1. **Game server core (this spec):** catalog on the server, slot claims,
   per-space progress, title promotion, points + point log, title benefits
   (POINT_RATE), thin client API layer and the "claim on save" hook.
2. Virtual items: catalog, grades, fragments, boxes, drop tables, open-box
   transaction, dex state.
3. Screens: home additions, real collection, titles, box, virtual dex
   (also unifies the progress number, see "Progress semantics").
4. Admin: config editing API + UI protected by an admin key (slots, title
   conditions, benefit %, items, grades, fragments, boxes, prices,
   probabilities, point grant/revoke, event periods).
5. Photo-based AI product recognition (currently only link analysis exists).

## Current state (verified)

- The client already models Location (10 spaces) > Category (23 product
  groups with `masterItems`) > MasterItem (slot); ids like
  `bathroom-haircare-shampoo` (`src/data/locations.ts`). Registering an item
  with a `masterItemId` fills that slot; duplicates do not add progress.
- No accounts, no DB; the backend is plain Node (`server/index.js`) storing
  podium submissions in `server/data/podiums.json`. `server/data/` is
  git-ignored. Server tests use `node:test`.
- Node 24 ships `node:sqlite` (verified: queries and transactions work; prints
  one ExperimentalWarning). No new dependency is needed.

## Storage

SQLite via `node:sqlite` at `server/data/game.sqlite` (git-ignored), opened once
per process, `PRAGMA foreign_keys = ON`, schema created by an idempotent
`migrate(db)` (a `schema_version` row). Tests use `:memory:`.

## Data model

Catalog (seeded from the client's current data, then owned by the server DB;
ids are unchanged):
- `spaces(id PK, name, sort, active)`
- `groups(id PK, space_id -> spaces, name, sort, active)`
- `slots(id PK, group_id -> groups, name, sort, active)`

The seed comes from `server/game/catalog.seed.json`, generated once by
`scripts/export-catalog.mjs` importing `src/data/locations.ts`
(`import type` only, so Node's type stripping handles it; the plan verifies
this and falls back to a hand-verified JSON if it does not). Seeding runs only
when `spaces` is empty. Deactivating (`active = 0`) hides a slot/group/space
from progress denominators but never deletes user claims.

Users and progress:
- `users(id TEXT PK /* device id */, created_at)`
- `slot_claims(user_id, slot_id, claimed_at, source, PRIMARY KEY(user_id, slot_id))`
  where `source` is `REGISTER` or `SYNC`.
- `group_completions(user_id, group_id, completed_at, PRIMARY KEY(user_id, group_id))`
- `user_titles(user_id, space_id, tier_code, earned_at, PRIMARY KEY(user_id, space_id, tier_code))`

Configuration (all values are data, nothing hard-coded in logic):
- `title_tiers(code PK, name, min_percent, sort, color_token, reward_points)`
  seeded: SPROUT 새싹 25 / MANAGER 관리자 50 / EXPERT 전문가 75 /
  MASTER 마스터 100; colors gray / green / purple / red; reward points
  200 / 500 / 1000 / 2000 (initial values chosen by us, adjustable later).
- `title_benefits(id PK, tier_code -> title_tiers, type, value INTEGER, payload TEXT NULL, start_at NULL, end_at NULL, event_id NULL)`
  with `type` in `POINT_RATE | COUPON | DISCOUNT | SPECIAL_REWARD | EVENT_ACCESS`.
  For `POINT_RATE`, `value` is basis points (SPROUT 0, MANAGER 300, EXPERT 700,
  MASTER 1200). Only POINT_RATE is evaluated in this project; the other types
  are stored and returned but have no effect. Rows outside their
  `start_at`/`end_at` window are ignored.
- `point_rules(key PK, amount)` seeded: `REGISTER` 100, `COLLECTION_COMPLETE` 500.

Point log:
- `point_history(id INTEGER PK AUTOINCREMENT, user_id, amount INTEGER, type, source_id, created_at)`.
  `type` values: `REGISTER`, `COLLECTION_COMPLETE`, `TITLE_REWARD`,
  `TITLE_BONUS` (later `ITEM_BOX_OPEN`, admin grant/revoke, ...; the column is
  intentionally not CHECK-constrained). `source_id`: slot id, group id,
  `spaceId:tierCode`, and the parent history id for `TITLE_BONUS`.
  Balance = `SUM(amount)` for the user (index on `user_id`); never stored.

## Rules (pure functions in `server/game/rules.js`)

- **Progress semantics:** space progress = distinct claimed slots in the space
  (active slots only) / active slots in the space. The current client averages
  category percentages instead; sub-project 3 unifies the screens on the slot
  ratio.
- **Title tiers reached:** every tier with `min_percent <= percent`. Each tier a
  user newly reaches in a space is recorded once and pays that tier's
  `reward_points` (`TITLE_REWARD`); jumping several tiers at once (backfill)
  pays each one.
- **Highest title of a space** = highest reached tier; its `POINT_RATE` benefit
  gives `bonusRateBp` for that space.
- **Bonus:** for activity points earned in a space (`REGISTER`,
  `COLLECTION_COMPLETE`), bonus = `floor(base * bonusRateBp / 10000)` using the
  title held *before* this action's promotions, logged as a separate
  `TITLE_BONUS` row (spec example: base +1000, bonus +70). `TITLE_REWARD` gets no
  bonus. A zero bonus writes no row.
- **Group completion:** the first time all active slots of a group are claimed
  -> one `COLLECTION_COMPLETE` (+500 default) per group per user, source id =
  group id, with the space bonus.

## Claiming

`claimSlots(db, userId, slotIds, mode)` runs in ONE transaction:

1. Create the user if missing.
2. For each slot id that exists and is active and not yet claimed: insert the
   claim with `source = REGISTER` (mode `register`) or `SYNC` (mode `sync`).
   Unknown or inactive ids are ignored and reported in `ignored`.
3. `register` mode only: each newly claimed slot pays the `REGISTER` rule
   (plus space bonus). `sync` mode never pays registration points.
4. Detect newly completed groups -> `COLLECTION_COMPLETE` (both modes).
5. Recompute progress of affected spaces -> newly reached tiers ->
   `TITLE_REWARD` rows and `user_titles` (both modes).
6. Return `{ newSlots, ignored, pointsAwarded, history: [...new rows], state }`.

Decisions confirmed by the user in the design discussion:
- Registration points only for the first claim of a slot; re-registering the
  same type, or items without a master item, earns nothing.
- Claims are permanent: deleting the item locally never revokes a claim.
- Progress is the slot ratio per space; initial point/title numbers are ours
  and adjustable.

Decisions first made in this spec (NOT yet reviewed by the user — please check):
- Sync/backfill: on the first sync every existing local item with a
  `masterItemId` is claimed without registration points, but group completions
  and title rewards are evaluated normally (so the demo seed items may pay
  some rewards once). Later syncs only reconcile missed claims.
- The space bonus applies to `REGISTER` and `COLLECTION_COMPLETE` only (not to
  `TITLE_REWARD`), using the title held before the action's promotions.
- "Collection complete" means one product group (제품군) fully claimed, once
  per group; completing a whole space is expressed by the MASTER title.
- `register` mode accepts at most 5 slot ids per request.

Known limitation (inherent to option A without accounts): the server cannot
verify that a product was really registered; a modified client can post any
slot ids. Not mitigated here; accounts and server-owned inventory are the
future fix. A cheap guard is included: `register` mode accepts at most 5 slot
ids per request.

## HTTP API (`server/game/routes.js`, mounted under `/api/game/`)

Every request needs header `X-Device-Id` (UUID-shaped, 8-64 chars of
`[A-Za-z0-9-]`) else 400.
- `GET /api/game/catalog` -> `{ spaces: [{id, name, groups: [{id, name, slots: [{id, name}]}]}], titleTiers: [...] }` (active only).
- `GET /api/game/state` -> `{ points, spaces: [{spaceId, claimed, total, percent, highestTier, nextTier, percentToNext, bonusRateBp}], titles: [{spaceId, tierCode, earnedAt}], benefits: [...active benefits of the highest tiers] }`.
- `POST /api/game/claims` body `{ mode: 'register' | 'sync', slotIds: string[] }` -> result above.
- `GET /api/game/points-history?limit=50&before=<id>` -> `{ items: [...], nextBefore }` (limit 1..100).
Errors: 400 invalid payload, 500 generic. `server/index.js` only delegates
`/api/game/*` to `handleGameRequest(req, res, db)` (exported so tests can host
it on their own ephemeral server); existing routes are untouched.

## Client (thin layer, no screens)

- `src/lib/gameApi.ts`: typed fetch wrappers adding `X-Device-Id` from the
  existing `getDeviceId()`; network/HTTP errors are thrown as `Error`.
- `src/state/GameContext.tsx` (`GameProvider`, `useGame()`): holds `state`
  (nullable), `refresh()`, `claim(slotIds)`; on mount it loads state and runs
  one `sync` with all current items' `masterItemId`s (once per app session).
  All failures are swallowed with `console.warn`; the app never depends on the
  server for registration.
- `NewItemPage.handleSubmit` (unchanged logic) additionally calls
  `game.claim([masterItemId])` (register mode) after saving when
  `masterItemId` is set; fire-and-forget, never blocks navigation.
- Provider is added in `src/main.tsx`/`App.tsx` inside the existing
  `LockerProvider`. No UI changes: sub-project 3 renders the state.
- Failure trade-off: if the register call fails (offline), the next session's
  sync still marks the slot claimed but without registration points.

## Testing

- `server/game/rules.test.mjs`: progress ratio, tiers reached, bonus rounding,
  inactive slots excluded.
- `server/game/service.test.mjs` (in-memory SQLite): first claim pays 100P; same
  slot again pays nothing; permanent claims; sync mode pays no registration
  points but pays group completion/title rewards; multi-tier jump pays every
  tier; bonus row uses the title held before promotion; deactivated slot leaves
  progress denominators; point history ordering/pagination; transaction rolls
  back on failure.
- `server/game/routes.test.mjs`: header validation, payload validation,
  end-to-end claim/state/history over a real ephemeral HTTP server.
- `src/lib/gameApi.test.ts` (vitest, mocked fetch): header added, error thrown
  on non-2xx.
- `package.json` `test:server` lists the new test files.
- Manual: start the server, register an item with a master item in the UI,
  `GET /api/game/state` shows points and progress.

## Out of scope

Screens, admin (API and UI), virtual items/boxes/fragments, photo recognition,
accounts, server-side proof of registration, non-POINT_RATE benefit effects,
representative title selection, set/season structures.
