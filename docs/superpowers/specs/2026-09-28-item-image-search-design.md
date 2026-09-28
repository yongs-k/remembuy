# Manual-Entry Item Image Search — Design Spec

Date: 2026-09-28

## Purpose

User request: "직접 등록한 상품의 경우 유사한 상품의 이미지를 탐색하여 이미지도
등록이 필요합니다" — items created via manual entry (no link/photo
analysis prefill) should be able to search for a representative image
and save it.

`Item` has no image field today, and no item display component
(`ItemCard.tsx`, `ItemDetailPage.tsx`, `CategoryChecklist.tsx`,
`PodiumItemCard.tsx`) renders a real image — all show a generic
`inventory_2` icon placeholder. This is true even for photo-analysis-
sourced items (sub-project 5), which explicitly discards the uploaded
photo by design. This plan adds a `imageUrl` field to `Item` and a way
to populate it for manual entries specifically.

## Known technical risk (accepted, with a safety net)

Gemini has no dedicated "image search" API. Asking it (even with
Google Search grounding, if the model/endpoint supports it) to return a
direct image file URL is a best-effort request — the model may return a
URL that's stale, hotlink-protected, or simply wrong; it may also
correctly say it can't find one. This plan accepts that risk (per the
user's explicit choice to reuse Gemini rather than integrate a
dedicated image-search API) and requires:
- The prompt explicitly instructs the model to return `null` rather
  than guess when it isn't confident (never fabricate a URL).
- Every place an image is rendered from this feature — the in-form
  preview and the final saved display — has an `onError` fallback that
  degrades to today's icon placeholder, exactly as if no image existed.
  A broken URL must never show a broken-image icon or blank box.

## Scope

- **In scope:** a manual "이미지 찾기" (find image) action in the new-item
  form, shown only for manual entries; a preview-then-confirm step
  (never auto-applied); storing the confirmed URL on `Item.imageUrl`;
  displaying it (with graceful fallback) on `ItemCard` and
  `ItemDetailPage`.
- **Out of scope (explicitly):**
  - Items created via the link-analysis or photo-analysis flows (they
    already have a `prefill`, so this plan's "직접 등록" trigger
    condition — `!existing && !prefill` — never applies to them).
  - Downloading/re-hosting the image — `imageUrl` stores the URL
    Gemini returned as-is (a hotlink), the same pattern this codebase
    already uses for `affiliateUrl`. No new file storage, no image
    proxy.
  - Offering multiple candidate images to choose from — one proposed
    URL per search, matching the "keep it simple" scope the user
    confirmed.
  - `CategoryChecklist.tsx`/`PodiumItemCard.tsx`'s icon display — only
    `ItemCard.tsx` and `ItemDetailPage.tsx` change in this plan; the
    other two can be extended later following the identical pattern if
    wanted.
  - A new external image-search API/service/key — reuses the existing
    `GEMINI_API_KEY`.

## Design

### Data model

`src/types.ts`'s `Item` gains one field: `imageUrl?: string | null`
(same optionality convention as `affiliateUrl`/`restockCycle` — absent
on old items, `null` when explicitly cleared, a string when set).

### Backend

New `server/imageSearch.js` (mirrors `linkAnalysis.js`/`photoAnalysis.js`'s
shape):
- `buildImageSearchPrompt(name, categoryName?)`: pure function, returns
  a prompt instructing Gemini to return a single direct image URL for
  the named household product, or `null` if it can't confidently
  identify one — explicitly telling it never to invent a URL.
- `callGeminiImageSearch(prompt)`: POSTs to the same Gemini endpoint
  pattern as the existing routes, JSON-mode with a
  `{ imageUrl: string | null }` response schema.
- `searchProductImage(name, categoryName?)`: calls the above two in
  sequence, returns the parsed result.

New `server/imageSearchRoute.js` (mirrors `analyzeLinkRoute.js`'s
shape — its own module, not inline in `index.js`, so it stays
independently testable):
- `handleImageSearchRequest(req, res)`: validates `{ name: string,
  categoryName?: string }`, 400 on malformed/missing `name`, calls
  `searchProductImage`, 200 with the result on success, 502 on a
  Gemini/network failure.

Mounted in `server/index.js` as `POST /api/search-image`.

### Frontend

**`src/lib/imageSearchApi.ts`** (new): `searchProductImage(name,
categoryName?) => Promise<{ imageUrl: string | null }>`, a thin fetch
wrapper matching this codebase's existing API-client style.

**`src/pages/NewItemPage.tsx`**: `isManualEntry = !existing && !prefill`
(this exact condition already distinguishes "blank form" from
"editing" or "prefilled from link/photo analysis" — no new signal
needed). When `isManualEntry` is true, an "이미지 찾기" button appears
right after the 이름 (name) field. Clicking it:
1. Calls `searchProductImage(name, selectedCategory's name)`.
2. On a `null` result: shows "이미지를 찾지 못했어요" inline, no preview.
3. On a URL result: shows an `<img>` preview with an `onError` handler
   that, if the URL fails to load, replaces the preview with "이미지를
   불러올 수 없어요" (the accepted-risk fallback) instead of a broken
   image.
4. If the preview loads successfully, an "이 이미지 쓰기" button appears;
   clicking it sets the form's `imageUrl` state to that URL. Nothing is
   saved to the `Item` until the form itself is submitted, same as
   every other field in this form.

On submit, `item.imageUrl` is the confirmed value (`|| null`, matching
`restockCycle`'s convention) — `undefined`/never-searched entries and
editing an existing item (where the field isn't shown at all) leave it
as `existing?.imageUrl` unchanged.

**`src/components/ItemCard.tsx`** and **`src/pages/ItemDetailPage.tsx`**:
when `item.imageUrl` is set, render an `<img>` in place of the
`inventory_2` icon, with an `onError` handler (local `useState` flag)
that falls back to the existing icon placeholder if the stored URL has
gone stale since it was saved — the same safety net applied at both
the search-time preview and at every later display.

## Testing

- `buildImageSearchPrompt` gets a direct unit test in a new
  `server/imageSearch.test.mjs` (pure function, mirrors
  `linkAnalysis.test.mjs`'s `buildPrompt` test) — confirms it includes
  the product name and, when given, the category name.
- No test for `callGeminiImageSearch`/`searchProductImage` — real
  network call to a paid API, consistent with every other Gemini-
  calling function in this codebase.
- `handleImageSearchRequest` gets route-level tests in a new
  `server/imageSearchRoute.test.mjs` (mirrors
  `analyzeLinkRoute.test.mjs`'s http.Server-spinning style): missing
  `name` → 400, wrong-typed `name` → 400, wrong-typed `categoryName` →
  400. None of these reach `searchProductImage`, so no `GEMINI_API_KEY`
  or network access is needed to run this file.
- No automated test for the `NewItemPage.tsx`/`ItemCard.tsx`/
  `ItemDetailPage.tsx` changes — none of those three files have an
  existing test file today (confirmed absent), consistent with this
  codebase's established precedent for this class of page/component.
  Verified by `npx tsc --noEmit` plus a manual trace: search for an
  image on a manual entry and confirm the preview/confirm/save flow;
  search for a product Gemini can't find and confirm the "찾지 못했어요"
  message; and (if feasible to force) confirm a broken image URL
  degrades to the icon placeholder rather than showing a broken-image
  icon.

## Out of Scope (recap)

Link/photo-analysis-sourced items, image download/re-hosting, multiple
candidate images, `CategoryChecklist.tsx`/`PodiumItemCard.tsx` display,
any new external image-search service.
