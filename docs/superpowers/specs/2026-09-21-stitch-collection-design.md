# Stitch Design Port — Collection Page (3b) — Design Spec

Date: 2026-09-21

## Purpose

Sub-project 3b of 6. Ports `remembuy_3` (도감 라이브러리 = overview) and
`_4` / `remembuy_1` (욕실 도감 = per-space detail) onto `CollectionPage`.
Uses the Material-3 tokens, the `Icon` helper and the lessons of 3a
(only `font-heading`/`font-body` exist as font-family utilities; type-scale
sizes are `text-label-sm` etc.; verify every class in the generated CSS).

Also removes dead code: `LocationIcon.tsx` and `data/locationEmoji.ts`
have no remaining importers (verified by grep; `LocationIcon` was only ever
imported by `HomePage`, replaced in the Home port). The earlier claim that
`CollectionPage` used `LocationIcon` was wrong.

## Data policy

Same as Home/Ranking: real data where the model has it, static dummy for
gamified extras.

Real: location and category names, per-space owned/total master items,
`getLocationCompletion` / `getCategoryCompletion` / `getMissingMasterItems`,
overall collection rate (owned/total master items across all locations),
owned master item -> the matching `Item` (`items.find(i => i.masterItemId
=== m.id)`) for name, `daysUntilEmpty` pill and `/item/:id` link, rename and
delete of locations/categories (existing `window.prompt/confirm/alert`
handlers, unchanged).

Dummy (static, visual only): level/EXP profile card except the collection
rate, badge shelf, monthly quest banner, "보유 배지"/"누적 절약액" stats,
goal line in the detail master card, barcode CTA (rendered `disabled`).

Note: the percent shown on cards comes from `getLocationCompletion` (average
of category percents, consistent with Home and Ranking); the "M / N종" counts
are simple owned/total sums, so the two can differ slightly when categories
have different sizes. Accepted.

## Views

`CollectionPage` keeps its handlers and gains one state,
`openLocationId: string | null` (`null` = overview). It renders
`CollectionOverview` or `CollectionDetail`.

**Overview** (`remembuy_3`), top to bottom:
1. Profile card (dummy Lv/EXP, `auto_stories` tile) with a 3-stat grid:
   전체 수집률 (real %, "owned / total개"), 보유 배지 (dummy), 누적 절약액 (dummy).
2. Badge shelf: horizontal snap carousel of 5 static badges (3 achieved, 2
   locked with lock overlay and progress), from `src/data/collectionDummy.ts`.
3. Monthly challenge quest banner (dummy).
4. "공간별 도감 컬렉션" header with "총 N개 공간", filter chips (전체 /
   수집 진행 중 / 완성 임박 / 미시작 with real counts; 미시작 = 0%, 완성 임박
   = 70-99%, 수집 진행 중 = 1-99%), then one `LocationDexCard` per matching
   location: `#NN` rank chip, `LOCATION_MATERIAL_ICON` tile, name, "M / N종 수집
   완료 (P%)", percent bubble, progress bar, status tag ("완성 임박!" at >=70%,
   "완성" at 100%), chevron. Click -> `setOpenLocationId(location.id)`.
5. Disabled barcode CTA at the bottom.

**Detail** (`_4`), for `openLocationId`:
1. Header: back pill (-> overview), location icon + name, status pill
   ("진행중"/"완성"), and rename/delete icon buttons wired to the existing
   `handleRenameLocation`/`handleRemoveLocation` (delete returns to overview).
2. Space chips (all locations with owned/total), selecting one switches
   `openLocationId`.
3. Master card: percent bubble, "도감 마스터리", "N종 중 M개 채움", progress
   bar, dummy goal line.
4. Guide banner: "표준 소모품 {categories.length}개 카테고리 분류 기준" (no button).
5. One `CategoryChecklist` per category: icon (`category`), name, "M/N 완료
   (P%)", progress bar, rename/delete icon buttons (existing handlers). Rows per
   master item: owned -> checked box, master name, matching item name and D-day
   pill when `daysUntilEmpty` is set, "관리" button -> `/item/:id`; missing ->
   empty box, name, "미등록 슬롯", "기록하기" -> `/new`. Empty
   `masterItems` keeps the existing "표준 품목이 아직 없는 카테고리입니다." text.
6. Bottom dock: "아이템 직접등록" (-> `/new`) and the disabled barcode button
   (no aria-label override, no onClick), `items-stretch` container.

## Components / files

- Create `src/components/LocationDexCard.tsx`, `CollectionOverview.tsx`,
  `CollectionDetail.tsx`, `CategoryChecklist.tsx`, `src/data/collectionDummy.ts`.
- Modify `src/pages/CollectionPage.tsx` (state + handlers + view switch).
- Delete `src/components/LocationIcon.tsx`, `src/data/locationEmoji.ts` (after
  confirming with grep that nothing imports them).
- `ProgressRing.tsx` (and its test) stays: it is no longer used by
  CollectionPage after this port, but its test file exists; leaving it is
  out of scope — flag it as dead code candidate in the final review.

## Explicitly unchanged

Store/selectors, all handlers' behavior (prompt/confirm/alert texts, "cannot
delete the last location/category" guards), routes, other pages, `chunky-*`
classes.

## Testing

No new automated tests (markup port). Verification: `tsc --noEmit`, vitest
(50/50; no test imports `LocationIcon`/`locationEmoji`),
server tests, build, the Tailwind class-existence script from 3a (checks every
string literal token against the generated CSS; note Tailwind escapes `,` as
`\2c `), grep for `font-(display|headline|body|label|stat)-`, and a manual
walkthrough against the two screenshots at mobile and tablet widths.

## Out of scope

Real badges/EXP/quests, barcode scanning, product photos, the space dropdown
of `_4` (chips cover it), `remembuy_1`'s inventory list (it is a different
layout of the same data), Purchase (sub-project 4).
