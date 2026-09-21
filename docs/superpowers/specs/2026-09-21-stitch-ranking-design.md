# Stitch Design Port — Ranking Page (3a) — Design Spec

Date: 2026-09-21

## Purpose

Sub-project 3a of 6 (3 is split: 3a Ranking, 3b Collection). Ports the
Stitch mockups `remembuy_4` (명예의 전당 · 도감 랭킹) and `_5` (카테고리
랭킹 1·2·3위 카드) onto `RankingPage.tsx`, using the Material-3 tokens
(Foundation) and `Icon` helper (Home sub-project). Visual port only:
the 3-level drill-down state machine, podium assignment, the podium
submission POST and the global-ranking fetch are unchanged.

Correction to the Home spec: `LocationIcon` is NOT used by
`CollectionPage` (never was; only `HomePage` imported it, and no longer
does). It is dead code; its removal is handled in 3b, not here.

## Data policy (same as Home)

Bind real data wherever the model has it; use static dummy for gamified
extras the model lacks. Mockups show product photos — `Item` has no image
field, so a neutral icon tile (`inventory_2`) stands in.

Real: location/category names, item counts, `getLocationCompletion`,
`getRankingForCategory` order, `Item.name/recommendation/daysUntilEmpty/
price/place/restockCycle/podiumRank`, the global ranking fetch.
Dummy/visual-only: "실시간 집계중" pill, "매주 월요일 00:00 갱신", the
"내 랭킹 기여도" card (+45점, 65% bar, +30P bonus), the barcode button.

## Levels

**Level 1 — locations** (mockup `remembuy_4`): page header
"명예의 전당 · 도감 랭킹" with a `workspace_premium` icon and the dummy
live/refresh pills. Locations from `getLocationsRankedByItemCount`:
rank 1 renders as a hero card (tertiary "1위 GOLD DEX" crown chip,
location name, `LOCATION_MATERIAL_ICON` tile, "N개 저장됨", completion %
from `getLocationCompletion`); ranks 2–3 as medium rows with silver/bronze
rank chips; the rest as compact numbered rows. Every row keeps
`onClick → setDrill({level:'categories', ...})`. Below the list, the
dummy contribution card.

**Level 2 — categories**: styled back pill ("← 장소 목록") + location
title; categories from `getCategoriesRankedByItemCount` as numbered rows
(rank chip, name, "N개 등록됨", `chevron_right`), same click behavior.

**Level 3 — products** (mockup `_5`): styled back pill + category title.
`getRankingForCategory` items as podium cards:
- 1st: card with a `bg-primary-container` top bar ("1ST PLACE"), rank
  badge, icon tile, name, `RecommendationBadge` (kept as is), a
  "D-N 소진임박" pill when `daysUntilEmpty` is defined (error-container
  style when N ≤ 7), "이전 구매가 N원" when `price` is defined,
  "재구매 주기: X" when `restockCycle` is set.
- 2nd/3rd: same content in the smaller card variant (silver/bronze chip).
- 4th+: compact numbered rows.
- The three medal buttons (`setPodiumRank`, `aria-label="N등으로 지정"`,
  `stopPropagation`) and the "다시 살래요" `Badge` on podium rank 1 remain,
  restyled as small chips inside each card. Card click still navigates to
  `/item/:id`.
- Empty state text unchanged in meaning.
- A dashed "N+1위 등록하기" slot (icon `add`) navigating to `/new`.
- Bottom dock: "아이템 직접등록" (→ `/new`) and a visual-only barcode
  button (no onClick), matching the mockup's two-button dock.
- Global ranking ("전체 유저 인기 랭킹") keeps its three states
  (loading / empty / list) but renders as a card with numbered chips.

## Components

- New `src/components/RankRow.tsx`: numbered/medal row used at levels 1–2
  (props: `rank`, `title`, `subtitle`, `icon`, `onClick`).
- New `src/components/PodiumItemCard.tsx`: level-3 card (props: `item`,
  `rank`, `onOpen`, `onAssign`, `variant: 'first' | 'medal' | 'compact'`
  driven by index).
- `RankingPage.tsx`: keeps all state/effects verbatim; only JSX changes.

## Explicitly unchanged

Effects (podium POST, global fetch), `DrillLevel` type, selectors, routes,
`RecommendationBadge`, `Badge`, all other pages, `chunky-*` classes.

## Testing

No new automated tests (pure markup port; none of the existing 50 tests
render `RankingPage`). Verification: `tsc --noEmit`, vitest 50/50, server
tests, build, plus a check that every Tailwind class used exists (build the
CSS and grep) — the Home sub-project's final review caught nonexistent
`font-<scale>` classes this way — and manual comparison against
`remembuy_4` / `_5` screenshots at mobile and tablet widths. Icons must use
the `Icon` helper (already `aria-hidden`).

## Out of scope

Collection page (3b), real product photos, real barcode scanning, real
wishlist ("관심등록") and repurchase actions, per-space TOP 3 boards fed by
global data, category filter chips on level 1.
