# Stitch Design Port — New Item Registration (5) — Design Spec

Date: 2026-09-21

## Purpose

Sub-project 5 of 6. Ports `remembuy_6` (아이템도감 등록) onto `NewItemPage`
and `ai` (업로드한 정보를 분석하고 있어요) onto the link-analysis "in
progress" state in `HomePage`.

Mapping correction: `_3` (최저가 추적 & 공구 레이더) is a product-detail
style screen, not a registration screen; it moves to sub-project 6 (Item
Detail), together with `RecommendationToggle` (shared with `ItemDetailPage`,
so it is NOT restyled here).

Lessons applied from 3a/3b/4: only `font-heading`/`font-body` exist as
font-family utilities (sizes are `text-label-sm` etc.); no `scrollbar-none`;
icons only via `Icon`; every Tailwind class must exist in the generated CSS
(the check script scans all string literals; Tailwind escapes `,` as `\2c `);
"coming soon" notices use an always-mounted `role="status"` live region.

## NewItemPage — hard constraint

The mockup is barcode-first and has no name, category, master-item, place,
URL, recommendation or note fields. Real functionality must not be removed.
Everything below is a restyle plus additions bound to real state. These stay
exactly as they are: all `useState` initializers (edit mode via `editId`,
link-analysis `location.state.prefill`), `handleLocationChange`,
`handleAddLocation`, `handleAddCategory`, `handleSubmit` (including
`podiumRank` retention and `navigate('/')`), field semantics
(`required` name, numeric price / days), and the "표준 품목과 연결" select.

## Layout (top to bottom)

1. **Header**: back button (`navigate(-1)`), title (`새로 기록하기` /
   `메모 수정하기`, unchanged texts), subline `NEW DEX ENTRY #N` with
   N = `items.length + 1` (real; in edit mode show the item's own order:
   `items.findIndex(existing) + 1`).
2. **`EntryTabs`**: 바코드 스캔 / 구매내역 / 직접 입력. Only 직접 입력 is real
   and always active. The other two call `onSoon()` -> snackbar "아직 준비
   중인 기능이에요" (same pattern as the purchase page: `notice: { id }`
   state, 2.5 s timeout cleared in an effect cleanup, always-mounted
   `role="status" aria-live="polite"` wrapper with `pointer-events-none`).
   No scanner viewport is built.
3. **`EntryPreviewCard`** (live): location + category chips, item name (or
   placeholder "상품 이름을 입력하세요"), price ("정가 N원" when set), restock
   cycle line when set, generic `inventory_2` icon tile.
4. **Reward card**: "도감 등록 보상 예정", "{장소}도감 수집률 {before}% →
   {after}% UP!" from the new selector `getCompletionGain` (below), progress
   bar filled to `before` with the gain segment, dummy "+20P"; when there is no
   gain (no linked master item or already owned) show "표준 품목을 연결하면
   수집률이 올라가요" instead of the arrow.
5. **Card "도감 보관 구역"**: name input first (`required`), location chips
   (replacing the `<select>`; `aria-pressed`), the existing "새 장소 이름"
   input + "장소 추가" button, category `<select>` + add-category input/button,
   master-item `<select>` (only when a category is selected) — all with the
   same handlers.
6. **Card "구매 정보"**: 구매처, 가격, 구매 링크 inputs (unchanged fields).
7. **Card "예상 소모 & 재구매 주기"**: chips 45일 / 60일 / 90일 / 직접설정
   that set `restockCycle` to `약 45일마다` / `약 60일마다` / `약 90일마다`
   (active when the current text equals that value); 직접설정 focuses the text
   input (existing input kept, placeholder unchanged); the existing
   추천/비추천 vs 소진까지 D-day mode toggle (same state and
   `RecommendationToggle`, unchanged) restyled only at the wrapper level.
8. **메모** textarea card.
9. **Submit**: full-width primary button "{장소}도감에 등록하기(+20P)" in create
   mode; "저장하기" in edit mode. `type="submit"`.

Inputs use new tokens (e.g. `rounded-lg bg-surface-container-low p-2.5
text-body-md text-on-surface border-2 border-transparent focus:border-primary
focus:outline-none`), not `chunky-input`.

## New selector (tested)

`getCompletionGain(items, categories, locationId, categoryId, masterItemId,
excludeItemId?)` in `src/state/selectors.ts` returns `{ before, after }`
using `getLocationCompletion`: `before` over `items` without `excludeItemId`;
`after` over the same list plus a synthetic item `{ id: '__preview__', name:
'', locationId, categoryId, masterItemId: masterItemId || undefined,
createdAt: '' }`. Unit tests: linking an unowned master item raises `after`
above `before`; no master item -> equal; already-owned master item -> equal;
`excludeItemId` (edit mode) removes the item's own ownership from `before`.

## HomePage — analyzing overlay (`ai`)

New `AnalyzingOverlay` component, shown when `isAnalyzing` is true (fixed
full-screen, `z-50`, above the record sheet): AI-scanner header chip, headline
"업로드한 정보를 분석하고 있어요", subtitle, a card showing the entered
`linkUrl` (truncated) with "INDEX #N 감지" (N = `items.length + 1`) instead of
a photo, a static 4-step list (2 완료, 1 분석중, 1 대기: OCR / 도감 슬롯 매칭 /
소모 주기 계산 / 최저가 알림 추적), the dummy tip card, and one button
"분석 중단 및 취소".

Behavior change (small, contained): `handleAnalyzeLink` creates an
`AbortController` stored in a ref and passes `signal` to `fetch`; the
overlay's cancel calls `abort()`; in the `catch`, the error message is set
only when `!controller.signal.aborted`; `finally` still clears `isAnalyzing`.
Success navigation and the error message are otherwise unchanged. The mockup's
"백그라운드에서 분석하고 알림 받기" button is not built (no such feature).

## Components / files

- Create `src/components/EntryTabs.tsx`, `EntryPreviewCard.tsx`,
  `AnalyzingOverlay.tsx`.
- Modify `src/pages/NewItemPage.tsx` (markup only; logic verbatim + notice
  state), `src/pages/HomePage.tsx` (overlay + abort), `src/state/selectors.ts`
  and its test.
- Not modified: `RecommendationToggle.tsx`, `ItemDetailPage.tsx`, store, routes.

## Testing

`getCompletionGain` unit tests (TDD). Everything else is markup: `tsc`,
vitest, server tests, build, the class-existence script (scan all string
literals), grep for `font-(display|headline|body|label|stat)-` and
`scrollbar-none`, and a manual walkthrough: create an item (all fields), edit
an item (`?editId=`), link-analysis prefill, switch location chips (category
and master-item selects follow), restock chips, tabs snackbar, reward numbers
change when linking a master item, overlay appears during analysis and cancel
returns to the link sheet without an error message.

## Out of scope

Barcode scanner, purchase-history import, 가구원 chips and the 알림 toggle (no
data fields), 재스캔, "백그라운드에서 분석", `_3`, `RecommendationToggle`
restyle, product photos.
