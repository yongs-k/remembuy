# Minor Issue Cleanup — Design Spec

Date: 2026-09-28

## Purpose

The final whole-branch reviews for sub-project 4a (admin-catalog) and
sub-project 5 (photo-analysis) each surfaced a handful of Minor findings
that were explicitly deferred at the time (documented in each plan's now-
deleted SDD ledger, and reported back to the user in this session). Of
those, the user picked three worth fixing now — a small, independent
grab-bag of correctness/UX fixes across three files, none of which touch
each other. Everything else from those two lists (drop-entry table
staleness, admin `name` field trimming, category-shape defense-in-depth,
zero-size image handling, `DEFAULT_MODEL` deduplication, auth/rate-
limiting, and the intentional duplicate fallback buttons) is explicitly
deferred/out of scope — not relitigated here.

## Scope

Three independent fixes:

1. **`src/pages/AdminPage.tsx` — `handleUnlockSubmit` misreports every
   failure as "wrong key".** Any fetch failure (network error, 500, and
   specifically a 503 when the server has no `ADMIN_KEY` configured —
   the single most likely first-run mistake) is shown as "키가
   올바르지 않습니다" and wipes the key the user just typed, even
   though the key itself may have been correct.
2. **`server/game/adminRoutes.js` — a malformed `%`-escape in an admin
   item/box id crashes to a generic 500.** `decodeURIComponent()` on
   `itemMatch[1]`/`boxMatch[1]` is called inside the same `try` block as
   the actual update call, so a `URIError` (e.g. a lone `%` in the URL)
   falls through to the route's outer catch-all and reports 500 instead
   of a client-error status.
3. **`server/index.js`'s `/api/analyze-link` route returns 502 for a
   malformed request body, where `/api/analyze-photo` correctly returns
   400 for the equivalent failure.** The two "send something to an AI
   for analysis" routes should behave the same way for the same failure
   class; `photoRoutes.js`'s already-fixed structure (JSON.parse errors
   and null/non-object bodies caught and reported as 400 *before* the
   real external-API call, which alone is wrapped for 502) is the
   correct pattern to bring `analyze-link` in line with.

## Fix 1: AdminPage key-submit error branching

`AdminPage.tsx` already has an `isUnauthorized(error)` helper
(`error.message === 'admin api 401'`, from `src/lib/adminApi.ts`'s
`request()` throwing `` `admin api ${res.status}` ``) and `loadAll()`
already branches on it correctly. `handleUnlockSubmit` does not — it has
one unconditional catch block.

Add a parallel `isUnconfigured(error)` helper
(`error.message === 'admin api 503'`) next to `isUnauthorized`. In
`handleUnlockSubmit`'s catch block, branch three ways:

- `isUnauthorized(error)` → today's behavior: clear the key, show "키가
  올바르지 않습니다" (this key really was wrong).
- `isUnconfigured(error)` → keep the typed key (it may well be right —
  the server just hasn't been given one to compare against), show
  "관리자 기능이 아직 설정되지 않았어요" (a new, distinct message so the
  user doesn't retype a correct key thinking it was wrong).
- anything else (network error, 500, etc.) → keep the typed key, show
  "서버에 연결하지 못했어요" (also distinct — a transient failure isn't
  the user's fault either).

No change to `loadAll`'s existing branching, and no change to
`isUnauthorized` itself.

## Fix 2: adminRoutes.js decode-before-dispatch

For both the item-PATCH and box-PATCH handlers, move
`decodeURIComponent(...Match[1])` out of the try block that currently
wraps the update call, into its own small try/catch that returns
`sendJson(res, 400, invalid)` (the route's existing `invalid` constant,
`{ error: 'invalid payload' }`) on a `URIError`. The existing
"not found → 404" try/catch around the update call itself is unchanged,
now receiving an already-decoded, known-valid id.

## Fix 3: analyze-link body-parsing restructure

Restructure `server/index.js`'s `/api/analyze-link` handler to match
`photoRoutes.js`'s already-established shape:

1. `JSON.parse` the body in its own try/catch → 400 on failure (today
   this is inside the same try as everything else → 502).
2. Check the parsed value is a non-null object → 400 if not (today this
   case isn't checked at all — a literal `null` body would throw on the
   destructure and also report 502; this closes the same gap
   `photoRoutes.js` closed in its own Task 2 fix round).
3. Validate `url`/`locations`/`categories` shape as today → 400 (unchanged
   logic, just runs after the above two checks instead of implicitly
   depending on JSON.parse having already succeeded).
4. Only the actual `analyzeLink(...)` call is wrapped in a try/catch that
   reports 502 — a real Gemini/fetch failure, not a client input error.

No change to `analyzeLink`, `buildPrompt`, or any other function in
`linkAnalysis.js` — this is purely a restructure of the route handler.

**Correction, decided during planning:** the handler cannot stay a local
function inside `server/index.js` as first sketched — `index.js` has
top-level side effects (`server.listen(...)`, `openDb(...)`) that fire on
import, so a test file cannot `import` anything from it without starting
a real server on the real port. It instead moves into its own
side-effect-free module, `server/analyzeLinkRoute.js`, mirroring
`server/photoRoutes.js`'s already-proven shape. This changes only which
file the logic lives in, not its behavior.

## Testing

- Fix 1 (`AdminPage.tsx`): correction — `src/pages/AdminPage.test.tsx`
  already exists (added in the admin-catalog plan) and already covers
  the 401 branch. Add two new tests to that existing file covering the
  503 (`isUnconfigured`) and generic-error branches, following its
  established `vi.mock('../lib/adminApi')` + `mockRejectedValue`
  pattern.
- Fix 2 (`adminRoutes.js`): add one test to the existing
  `server/game/adminRoutes.test.mjs` — a PATCH to
  `/api/admin/items/%` (an incomplete percent-escape) with a valid admin
  key returns 400, not 500.
- Fix 3 (`server/index.js`): `server/linkAnalysis.test.mjs` currently
  only tests `extractText`/`buildPrompt`, both pure functions — the HTTP
  route itself (`/api/analyze-link` in `index.js`) has no existing test
  file, mirroring `photoRoutes.js`'s situation before its own route-level
  test file was added in the photo-analysis plan. Add a new
  `server/analyzeLinkRoute.test.mjs` following
  `server/game/adminRoutes.test.mjs`'s/`server/photoRoutes.test.mjs`'s
  established pattern (spin up a real `http.Server` wrapping just this
  route's logic, assert status codes) covering: malformed JSON → 400,
  a literal `null` body → 400, a body missing `url`/`locations`/
  `categories` → 400. None of these reach `analyzeLink`, so no
  `GEMINI_API_KEY` or network access is required to run this file —
  same policy as the rest of this codebase's AI-route tests. This means
  extracting the route's logic out of `index.js`'s inline dispatch into
  `handleAnalyzeLinkRequest(req, res)` in its own module,
  `server/analyzeLinkRoute.js` (see the correction above), which the test
  file imports directly and `index.js`'s dispatch chain calls — the same
  shape as `handleGameRequest`/`handleAdminRequest`/`handlePhotoRequest`.

## Out of Scope (recap)

Everything from the two source reviews not listed as Fix 1-3 above:
`AdminPage.tsx`'s drop-entry table staleness, `adminRoutes.js`'s `name`
field trim/length-cap, `linkAnalysis.js`/`photoAnalysis.js`'s missing
category-shape validation, `imageResize.ts`'s zero-dimension-image edge
case, `DEFAULT_MODEL` deduplication between the two analysis modules, any
auth/rate-limiting work (that's the user's next sequence item, "user
onboarding/login"), and the two near-identical fallback buttons in
`HomePage.tsx` (intentional, not a defect).
