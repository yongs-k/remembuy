# Link Analysis Auto-Fill — Design Spec

Date: 2026-09-17

## Purpose

When the user picks "🔗 링크로 가져오기" from the home screen's record-options
sheet, they should be able to paste a product URL and have the app
auto-fill the new-item form: product name, location, category, linked
standard item, place of purchase, price, and restock cycle. This was
paused earlier this session pending a backend decision; the app now has
a small Node backend (`server/`, added for the podium-ranking feature),
so this plan extends it rather than creating a new one.

## Model

The user provided a Gemini API key. The backend calls Google's Gemini
API directly via Node's built-in `fetch` (no `@google/generative-ai` SDK
dependency, consistent with this backend's "no new dependencies"
precedent), using Gemini's JSON-mode (`responseMimeType:
"application/json"` + `responseSchema`) for structured extraction. The
key lives in `server/.env` as `GEMINI_API_KEY` (already created,
git-ignored).

## Backend

Extends the existing `server/` (does not create a new server):

- **New `server/linkAnalysis.js`**:
  - `fetchPageText(url)`: fetches the target URL (5s timeout via
    `AbortSignal.timeout(5000)`, response capped at 200KB), strips HTML
    tags with regex extraction of `<title>`, `og:title`/`og:description`
    meta tags, and the first ~4000 characters of visible body text
    (tags stripped). No headless browser, no HTML parser dependency —
    regex extraction is sufficient for title/meta/text and keeps this
    dependency-free.
  - `buildPrompt(pageText, locations, categories)`: builds the Gemini
    prompt, including the page text and the user's current
    locations/categories/masterItems (name + id for each), instructing
    the model to match existing ids where possible and suggest new
    names only when nothing fits.
  - `callGemini(prompt)`: POSTs to
    `https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={GEMINI_API_KEY}`
    (`MODEL` from `process.env.GEMINI_MODEL`, defaulting to a current
    Gemini Flash model) with a `responseSchema` matching the 7-field
    result shape below, parses the returned JSON.
- **`server/index.js`** gains one more route in its existing if/else-if
  dispatch chain: `POST /api/analyze-link`, reusing the same
  buffer-then-decode body-reading pattern already used for
  `/api/podium-submissions` (avoids the UTF-8 chunk-boundary bug fixed
  there). Request body: `{ url, locations, categories }` (the frontend's
  current `locations`/`categories` from `useLocker()`, sent as-is — just
  `{id, name}` for locations and `{id, locationId, name, masterItems:
  [{id, name}]}` for categories). On any failure (fetch timeout, Gemini
  error, malformed response), responds with `{ error: string }` and a
  4xx/5xx status — never a partial/malformed 200.

**Response shape** (matches `LinkAnalysisResult`, returned as the 200 body):

```ts
type LinkAnalysisResult = {
  name: string | null
  locationId: string | null
  suggestedLocationName: string | null // only meaningful when locationId is null
  categoryId: string | null
  suggestedCategoryName: string | null // only meaningful when categoryId is null
  masterItemId: string | null
  place: string | null
  price: number | null
  restockCycle: string | null
}
```

## Frontend

### `HomePage.tsx` — record-options sheet

The "🔗 링크로 가져오기" option currently navigates straight to `/new`
(`src/pages/HomePage.tsx`, one of four identical sheet buttons). It
changes to: clicking it swaps the sheet's content (the other three
options hide) for a URL `<input>` + "분석하기" button, inside the same
sheet component — no new route, no new page. Submitting:
1. Shows a loading state (button disabled, "분석 중..." label).
2. `POST /api/analyze-link` with `{ url, locations, categories }` (from
   `useLocker()`).
3. On success: `navigate('/new', { state: { prefill: { ...result,
   sourceUrl: url } } })` — the original URL is carried along
   separately from the Gemini result, since it becomes the item's
   `affiliateUrl` (the pasted link IS the purchase link).
4. On failure (network error, non-2xx response): shows an inline error
   message in the sheet ("페이지를 분석하지 못했어요.") plus a "직접
   입력하기" button that navigates to plain `/new` (no prefill) as a
   fallback — the feature degrades to today's manual-entry behavior
   rather than blocking the user.

### `NewItemPage.tsx` — reading the prefill

`NewItemPage` reads `useLocation().state?.prefill` (React Router's
route state, not a query param — avoids URL-encoding a multi-field
object) and uses it, only when NOT editing an existing item (`existing`
is `undefined`), to seed its `useState` initializers:

- `name`, `place`, `restockCycle`, `price` ← the matching prefill field
  when present, else the current defaults (`''`, `''`, `''`, `''`).
- `locationId` ← `prefill.locationId` when present, else current default
  (`locations[0].id`).
- `categoryId` ← `prefill.categoryId` when present, else current default
  (first category for the resolved location).
- `masterItemId` ← `prefill.masterItemId` when present, else `''`.
- `affiliateUrl` ← `prefill.sourceUrl` when present, else `''` (the
  pasted URL becomes the purchase link automatically).
- `newLocationName`/`newCategoryName` ← seeded from
  `prefill.suggestedLocationName`/`prefill.suggestedCategoryName` when
  the corresponding id is `null` — this only pre-fills the existing "새
  장소 이름"/"새 카테고리 이름" text inputs; the user still has to click
  the existing "장소 추가"/"카테고리 추가" buttons themselves to actually
  create it. **No location or category is ever auto-created** — this
  was an explicit decision earlier in the session (AI suggestions are
  proposals, not silent writes).

No new fields are added to `Item` — this feature only pre-fills existing
form inputs.

## Testing

- `fetchPageText`'s HTML-to-text extraction (title/meta/body regex
  stripping) is a pure function given a fixed HTML string input — gets
  unit tests in a new `server/linkAnalysis.test.mjs`, following the same
  `node:test` pattern as `server/podium.test.mjs`.
- `buildPrompt` is also pure (string in, string out) and gets a test
  confirming it includes the page text and the location/category names
  passed in.
- No automated test for `callGemini` itself (a real network call to a
  paid external API — not something to exercise in a test run) or for
  the HTTP route/frontend wiring, consistent with this branch's
  precedent for glue code: verified via manual trace (a real URL, a real
  Gemini call, checking the resulting prefilled form) instead.
- `NewItemPage`'s prefill-seeding logic is plain `useState` initializer
  expressions, not extracted into a separately-testable function — this
  matches the file's existing style (`existing?.field ?? default`, now
  extended to `existing?.field ?? prefill?.field ?? default`) and this
  branch's precedent of not unit-testing page-level form components.

## Out of Scope (explicitly)

- Real camera/photo-based input (the other two options in the same
  sheet) — still stubbed as before, unrelated to this plan.
- Any account/login system, or moving `GEMINI_API_KEY` to a production
  secrets manager — this is a local-dev-only feature for now, matching
  the rest of this backend's current deployment status (no hosting
  target chosen yet).
- Auto-creating locations/categories from AI suggestions — explicitly
  rejected; suggestions only pre-fill the existing manual "add" inputs.
