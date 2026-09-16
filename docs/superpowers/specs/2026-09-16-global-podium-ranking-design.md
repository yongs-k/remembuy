# Global Podium Ranking — Design Spec

Date: 2026-09-16

## Purpose

Building on the per-user "podium" feature (`Item.podiumRank`, per-category
1st/2nd/3rd selection, already shipped), this adds a cross-user ranking:
once a user completes a category's podium (all of 1st/2nd/3rd assigned),
their picks are submitted to a shared backend, and `RankingPage`'s
product-list view shows an aggregated "global popularity" ranking for
that category, built from every user's completed podiums.

This is the first feature in this app requiring a real backend and any
notion of "a user" distinct from the browser's own localStorage — both
introduced here for the first time.

## User Identity

- No login. On first load, the client generates a random `deviceId`
  (`crypto.randomUUID()`) and persists it in `localStorage` under
  `remembuy:deviceId`. Every submission to the backend carries this
  `deviceId`.
- This is deliberately the simplest thing that works now, with an
  explicit path forward: the backend keys all data by `deviceId`
  (not by category, not by session), so a future real account system
  can migrate a device's history wholesale by mapping one `deviceId` to
  one account — but building that migration/redeem flow itself is
  out of scope for this plan.

## What Gets Submitted, and When

- **Trigger:** whenever `setPodiumRank` results in a category having all
  three ranks (1, 2, 3) assigned to some item, the client automatically
  submits that category's podium to the backend. No user-facing "share"
  button — this was an explicit product decision (auto-submit on
  completion).
- **Why this works without extra "same product" matching logic:** this
  app's default (seeded) locations, categories, and master items all use
  fixed, hardcoded string ids (e.g. `bathroom`, `bathroom-skincare`,
  `bathroom-skincare-sunscreen` — confirmed by reading `src/data/locations.ts`),
  identical across every install of the app. So aggregating by
  `categoryId` and `masterItemId` directly (no fuzzy name-matching)
  naturally produces meaningful cross-user matches for anything tied to
  the app's standard taxonomy. Only a user-created custom category (id
  like `cat-<timestamp>`) or a custom item with no `masterItemId` won't
  match anyone else's — which is correct (there's nothing to match,
  since nobody else has that user's custom category/item).
- **Submission payload** (one row per completed category, upserted — a
  user changing their podium later re-submits and replaces their own
  prior row for that category, not appended):

  ```json
  {
    "deviceId": "a1b2c3d4-...",
    "categoryId": "bathroom-skincare",
    "items": [
      { "rank": 1, "masterItemId": "bathroom-skincare-sunscreen", "name": "톤업 선크림" },
      { "rank": 2, "masterItemId": null, "name": "커스텀 세럼" },
      { "rank": 3, "masterItemId": "bathroom-skincare-toner", "name": "토너" }
    ]
  }
  ```

  `name` is always included (for display and as the fallback matching
  key when `masterItemId` is `null`); `masterItemId` is the item's
  `Item.masterItemId` if set, else `null`.

## Backend

- **New `server/` directory**, a small standalone Node server (built on
  this session's earlier decision, from the paused link-analysis
  feature, to add a lightweight local Node server rather than a
  hosted-platform serverless function). This is the first thing to
  actually populate that directory.
- **Storage:** a single JSON file, `server/data/podiums.json` (git-ignored),
  holding an array of submission rows keyed by `(deviceId, categoryId)`.
  No database dependency — at this app's scale (a personal/small-group
  utility), a JSON file read/written on each request is simpler and
  sufficient; a real DB is unwarranted complexity for now.
- **`POST /api/podium-submissions`** — body matches the payload shape
  above. Server upserts: replaces any existing row with the same
  `(deviceId, categoryId)`, otherwise appends. Responds `204 No Content`
  on success.
- **`GET /api/podium-rankings/:categoryId`** — aggregates all submission
  rows for that `categoryId` using Borda-count scoring (rank 1 = 3
  points, rank 2 = 2 points, rank 3 = 1 point), grouping by
  `masterItemId` when present, else by the normalized (trimmed,
  lowercased) `name`. Returns the top 3 groups by total score:

  ```json
  {
    "categoryId": "bathroom-skincare",
    "ranking": [
      { "name": "톤업 선크림", "masterItemId": "bathroom-skincare-sunscreen", "score": 14, "voters": 5 },
      { "name": "토너", "masterItemId": "bathroom-skincare-toner", "score": 9, "voters": 4 },
      { "name": "커스텀 세럼", "masterItemId": null, "score": 4, "voters": 2 }
    ]
  }
  ```

  Returns `{ "categoryId": "...", "ranking": [] }` (never an error) when
  there are zero submissions for that category — the frontend treats an
  empty array as "not enough data yet."
- **Dev wiring:** `vite.config.ts` gets a `server.proxy` entry routing
  `/api` to the Node server's port (e.g. `http://localhost:8787`), so the
  frontend can call relative `/api/...` paths in dev without a CORS
  concern. `package.json` gets a `dev:server` script
  (`"node server/index.js"`) run in a second terminal alongside the
  existing `dev` script — no new process-orchestration dependency
  (no `concurrently`/`npm-run-all`) added, consistent with keeping this
  addition minimal.

## Frontend Changes

- **`src/lib/deviceId.ts`** (new): `getDeviceId(): string` — reads
  `localStorage['remembuy:deviceId']`, generating and persisting a new
  `crypto.randomUUID()` if absent.
- **`src/state/selectors.ts`** (modify): a new selector
  `getCompletedPodium(items: Item[], categoryId: string): { rank: 1 | 2 | 3; item: Item }[] | null` —
  returns the three podium entries (sorted by rank) if and only if all
  three ranks are assigned within that category, else `null`. Pure
  function, easily testable.
- **`src/pages/RankingPage.tsx`** (modify): after every `setPodiumRank`
  call, check `getCompletedPodium` for the affected category; if it
  returns non-null, fire a `POST /api/podium-submissions` (fire-and-forget
  — a network failure here is silently ignored, since this is a
  best-effort background sync, not a user-facing action with a loading
  state). Additionally, the product-list view (`drill.level ===
  'products'`) fetches `GET /api/podium-rankings/:categoryId` when that
  view mounts (and whenever `drill.categoryId` changes) and renders a new
  "🌍 전체 유저 인기 랭킹" section below the personal ranked list, showing
  up to 3 entries (name + a small rank/medal indicator), or "아직 데이터가
  부족해요" if the response's `ranking` array is empty or the request
  fails.

## Testing

- `getCompletedPodium` (pure selector) gets automated tests in
  `src/state/selectors.test.ts`, following that file's existing pattern:
  incomplete podium (0/1/2 ranks assigned) returns `null`; complete
  podium (all 3) returns the 3 entries sorted by rank.
- The server's aggregation function (Borda-count scoring, grouping by
  `masterItemId`/normalized name) is a pure function separable from the
  HTTP handling — it gets a small standalone test file (plain Node
  `assert`-based, no new test framework for the server, since this
  server has no other tests yet and pulling in Vitest for one function
  would be more setup than the function itself).
- No automated test for `RankingPage`'s new fetch-on-mount/submit-on-complete
  wiring or for the server's HTTP layer itself — consistent with this
  branch's precedent (page-level components and, now, simple HTTP glue
  are verified via manual trace, not integration tests). Manual trace:
  complete a category's podium in one browser session, confirm the
  submission POST fires (check the server's `podiums.json` file
  directly), then reload and confirm the "🌍 전체 유저 인기 랭킹" section
  shows the submitted picks.

## Out of Scope (explicitly)

- Any real account system, login, or the "redeem a code to migrate a
  device's data to an account" flow — `deviceId` is designed to make
  that possible later, not to implement it now.
- The paused link-analysis AI feature and the paused "replace share tab
  with a purchase/discount/group-buy tab" feature — both remain paused,
  unrelated to this plan (though the link-analysis feature, whenever it
  resumes, will likely reuse this same `server/` directory and process).
- Any UI for browsing rankings across categories/locations at once (e.g.
  a global leaderboard page) — this plan only surfaces the per-category
  aggregate inside the existing per-category product-list view.
- Rate limiting, abuse prevention, or data validation beyond basic shape
  checking on the backend — acceptable for a personal-scale, trusted-use
  app; would need revisiting before any public/untrusted deployment.
