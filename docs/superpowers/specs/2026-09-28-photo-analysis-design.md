# Photo Analysis Auto-Fill — Design Spec (Sub-project 5)

Date: 2026-09-28

## Purpose

The home screen's record-options sheet has four buttons: "카메라로 촬영",
"사진 선택", "링크로 가져오기", "직접 입력". The link option was implemented
in sub-project [[link-analysis]] (2026-09-17); the two photo options still
just `navigate('/new')` with no analysis, same as link-import did before
that plan. This plan makes them do real work: the user photographs (or
picks from their gallery) a single product, and the app auto-fills the
new-item form the same way link-import does — name, location, category,
linked master item, place of purchase, price, restock cycle.

This is the last of the 5 sub-projects in `docs/product-roadmap.md`'s
architecture breakdown (game core, virtual items, screens, admin catalog,
photo recognition).

## Scope

- **In scope:** a single photo of a single product (a bottle, a box, a
  package — whatever the user is about to log), from either the camera or
  the photo library, analyzed once, producing one prefill result — the
  same shape as link-analysis's result.
- **Out of scope (explicitly):**
  - Receipt/multi-item photos (PRD's "영수증 OCR" aspiration) — a
    materially different feature (multiple items per photo, a
    review/select-which-items UI, bulk creation) deferred to a future
    sub-project if ever built.
  - A photo preview/confirm step before analysis — selecting a file
    triggers upload+analysis immediately, matching link-import's
    type-URL-then-analyze pattern staying single-step.
  - Storing the photo anywhere — it is base64-encoded, sent to the
    server, used for one Gemini call, and discarded. No `Item` field
    holds a photo URL or blob after this feature.
  - Any account/login system, or moving `GEMINI_API_KEY` out of local
    `server/.env` — same local-dev-only status as link-analysis.
  - Auto-creating locations/categories from AI suggestions — same
    explicit rejection as link-analysis; suggestions only pre-fill the
    existing manual "add" text inputs.

## Model

Reuses the existing Gemini setup (`GEMINI_API_KEY`, `GEMINI_MODEL` env
vars, already in `server/.env`) via Gemini's vision input: an `inlineData`
part (base64 image bytes + mime type) alongside a text part, using the
same JSON-mode (`responseMimeType: "application/json"` + `responseSchema`)
structured-output approach as link-analysis. No new dependency, no new
API key.

## Backend

Extends the existing `server/` (does not create a new server):

- **New `server/photoAnalysis.js`**, mirroring `server/linkAnalysis.js`'s
  shape:
  - `buildPhotoPrompt(locations, categories)`: pure function, returns the
    instruction text sent alongside the image — the user's current
    locations/categories/masterItems (name + id for each, same as
    link-analysis), instructing the model to identify the product from
    the photo, match existing location/category/masterItem ids where
    possible, suggest new names only when nothing fits, and return `null`
    for any field it cannot determine from the image (explicitly calling
    out `place` and `price` as often unknowable from a product photo
    alone — the model should not guess a price it cannot see). The image
    itself is NOT part of this string — it goes in a separate `inlineData`
    part of the Gemini request. Gets a unit test (given fixed
    locations/categories, the returned string includes their names) —
    same pattern as `buildPrompt`'s test.
  - `callGeminiVision(prompt, imageBase64, mimeType)`: POSTs to the same
    `https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={GEMINI_API_KEY}`
    endpoint as `linkAnalysis.js`'s `callGemini`, but the request body's
    `contents[0].parts` includes both the text prompt and an
    `inlineData: { mimeType, data: imageBase64 }` part. Uses the same
    `responseSchema` shape as link-analysis (7 fields, see below). No
    automated test (real paid network call) — same policy as
    `linkAnalysis.js`'s `callGemini`.
  - `analyzePhoto(imageBase64, mimeType, locations, categories)`: calls
    `buildPhotoPrompt` then `callGeminiVision`, parses and returns the
    result. Mirrors `analyzeLink`'s shape/error behavior (throws on
    Gemini error or malformed response; the route layer turns that into a
    4xx/5xx).
- **`server/index.js`** gains one more route in the existing
  if/else-if dispatch chain: `POST /api/analyze-photo`. Request body:
  `{ imageBase64: string, mimeType: string, locations, categories }` —
  `locations`/`categories` sent as-is from `useLocker()`, identical shape
  to the link-analysis route. Body-reading reuses the existing
  buffer-then-decode-once pattern (`Buffer.concat(chunks).toString('utf-8')`)
  to avoid the UTF-8 chunk-boundary bug link-analysis already worked
  around — the body is JSON containing a base64 string, still text, so
  the same decode-once approach applies unchanged.
  - **New body-size cap for this route specifically**: 8 MB (raw request
    body, i.e. the base64-encoded image plus its JSON envelope). This is
    larger than any other existing body cap in this codebase (podium submissions
    and admin routes have no such images to carry) because even a
    client-resized JPEG can occasionally exceed a couple MB. Exceeding it
    aborts the request and responds `413 { error: 'image too large' }`
    without parsing the accumulated buffer. Track running byte count
    across `data` events and stop buffering once the cap is passed
    (matches `adminRoutes.js`'s existing `MAX_BODY_BYTES` truncation
    pattern, just with a larger constant and a distinct status code
    since 400 is already used for "malformed JSON" on this route).
  - `mimeType` is validated against an allowlist (`image/jpeg`,
    `image/png`, `image/webp`) before being forwarded to Gemini; anything
    else is a 400.
  - On any failure (oversized body, invalid mime type, malformed JSON,
    Gemini error, malformed Gemini response), responds with
    `{ error: string }` and a 4xx/5xx status — never a partial/malformed
    200. Same policy as every other route in this file.

**Response shape** (identical field set to `LinkAnalysisResult`, reused
as-is — no new type needed on the wire, `sourceUrl`/`affiliateUrl` simply
has no equivalent for a photo and is omitted from the request/response
entirely, not sent as `null`):

```ts
type PhotoAnalysisResult = {
  name: string | null
  locationId: string | null
  suggestedLocationName: string | null
  categoryId: string | null
  suggestedCategoryName: string | null
  masterItemId: string | null
  place: string | null
  price: number | null
  restockCycle: string | null
}
```

## Frontend

### `HomePage.tsx` — record-options sheet

The sheet already has "카메라로 촬영" and "사진 선택" buttons
(`src/pages/HomePage.tsx`, currently both `onClick={() => navigate('/new')}`
stubs). Each becomes a label wrapping a hidden file input instead of a
plain button, so the browser's native camera/gallery picker opens on tap:

- "카메라로 촬영" → `<input type="file" accept="image/*" capture="environment" hidden />`
- "사진 선택" → `<input type="file" accept="image/*" hidden />`

Both inputs share one `onChange` handler. As soon as a file is selected
(no separate confirm step, matching link-import's immediate-submit
pattern):

1. Client-side resize: draw the selected image onto an off-screen
   `<canvas>` scaled so its longer side is at most 1280px (no upscaling
   if the source is already smaller), then
   `canvas.toDataURL('image/jpeg', 0.8)` to get a base64 JPEG. Uses only
   standard Canvas/`Image`/`FileReader` APIs — no new dependency.
2. Shows a loading state reusing the sheet's existing pattern (the whole
   sheet shows "사진을 분석하고 있어요..." with a disabled/inert
   interaction state, buttons hidden — the sheet has no camera-specific UI
   to keep interactive during upload, unlike the link input's text field).
3. `POST /api/analyze-photo` with `{ imageBase64, mimeType: 'image/jpeg', locations, categories }` (from `useLocker()`).
4. On success: `navigate('/new', { state: { prefill: result } })`.
5. On failure (network error, non-2xx response, or the browser/canvas
   pipeline itself throwing — e.g. a corrupt file): shows the same
   inline error pattern link-import uses ("사진을 분석하지 못했어요.")
   plus a "직접 입력하기" button that navigates to plain `/new` — the
   feature degrades to manual entry, never blocks the user.

The photo flow adds one new boolean state, `isAnalyzingPhoto`, sibling to
the existing `isAnalyzing` (link) state — it has no separate "input"
sub-view the way link-import does (there's nothing to type; the file
picker itself is the input), so it does not touch `showLinkInput`. While
`isAnalyzingPhoto` is true, the options list (all four buttons) is
replaced with a single "사진을 분석하고 있어요..." message, same sheet
container. Reuses the existing `analyzeError` state/message slot for
photo failures too (one error slot, not two) — only one flow (link or
photo) can be in progress at a time from this sheet, so sharing the slot
is safe.

### `NewItemPage.tsx` — reading the prefill

No changes needed. It already reads `useLocation().state?.prefill` and
seeds its `useState` initializers from whichever fields are present,
regardless of whether the prefill came from a link or a photo. The one
field difference — no `sourceUrl`/`affiliateUrl` from a photo — is
already handled by the existing `prefill.sourceUrl` optional-chaining
(simply `undefined` for a photo-sourced prefill, falling through to the
current `''` default).

## Testing

- `buildPhotoPrompt` is a pure function (locations/categories in, string
  out) — unit tested in a new `server/photoAnalysis.test.mjs`, confirming
  it includes the location/category names passed in and does NOT include
  any image data (that travels out-of-band via `inlineData`).
- No automated test for `callGeminiVision` or `analyzePhoto`'s Gemini
  call itself (real network call to a paid external API), consistent
  with `linkAnalysis.js`'s existing precedent.
- The route's body-size cap (413) and mime-type allowlist (400) ARE
  testable without a real Gemini call — a fake oversized body / bad mime
  type never reaches `analyzePhoto`. These get `server/photoAnalysis.test.mjs`
  or route-level tests following `adminRoutes.test.mjs`'s pattern of
  spinning up a real `http.Server` and asserting status codes, with
  `analyzePhoto` itself not invoked (mime/size checks happen before it's
  called).
- No automated test for the frontend's canvas-resize pipeline or the
  HTTP route/frontend wiring (jsdom has no real canvas/image-decoding
  pipeline) — verified via manual trace (a real photo, a real Gemini
  call, checking the resulting prefilled form), consistent with
  link-analysis's precedent for this class of glue code.

## Out of Scope (recap)

- Receipt/multi-item photo recognition.
- A preview/confirm step between photo selection and analysis.
- Persisting the uploaded photo anywhere.
- Production secrets management / hosting.
- Auto-creating locations/categories from AI suggestions.

Related: [[link-analysis-design]], [[game-core-design]],
[[virtual-items-design]], [[admin-catalog-design]], `docs/product-roadmap.md`.
