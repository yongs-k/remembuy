# Stitch Design Port — Remaining Pages & Legacy Cleanup (6) — Design Spec

Date: 2026-09-21

## Purpose

Sub-project 6 of 6 (last). Ports the pages and shared components that still
use the legacy `chunky-*` / `paper` / `card` / `stamp` / `accent` / `warn`
styling to the Material-3 tokens, then retires the legacy tokens once grep
proves nothing references them.

Lessons applied from 3a-5: only `font-heading`/`font-body` exist as font-family
utilities (sizes are `text-label-sm` etc.); no `scrollbar-none`; icons only via
`Icon`; every Tailwind class must exist in the generated CSS (the check script
scans all string literals; Tailwind escapes `,` as `\2c `); notices use an
always-mounted `role="status"` region; existing logic and behavior are kept.

## Mockup triage

- `image.png_1`, `image.png_2`: screenshots of the OLD app, not designs. Ignored.
- `remembuy_7` (drawer tiers), `remembuy_8` / `remembuy_9` (storage dashboards),
  `_1` (household / reminder settings): new features with no page, route or
  data model. Out of scope.
- `_3` (최저가 추적 & 공구 레이더): used only as the visual reference for the top
  card of the Item Detail page. Its price chart, AI insight and group-buy list
  need price-history data that does not exist (group buys already live on the
  Purchase page) and are not built.

## Pages

**`NotificationsPage`** (logic unchanged: `getUpcomingNotifications(items, 7)`,
`markSeen` effect, navigation, affiliate link): title + count pill; each item a
card with an icon tile, name, D-day pill (error-container style when D-3 or
less, otherwise neutral), a "상세보기" secondary button and a "구매하기" primary
link (or the disabled "구매 링크 없음"); empty state as a card with an icon and
the existing text "임박한 소모품이 없습니다.".

**`FamilyPage`** (logic unchanged: `FAMILY_MEMBERS`, `invited` state): member
card with initial avatar, name, relation chip, item rows with D-day pills;
invite button unchanged in behavior; the existing message text
"초대 링크는 아직 준비 중이에요. (MVP에서는 실제 초대가 불가합니다)" moves into an
always-mounted `role="status"` region.

**`ItemDetailPage`** (logic unchanged: `updateItem` for the recommendation,
edit navigation `/new?editId=`, affiliate link, related items, the not-found
state with its texts): top card in the `_3` style (icon tile, "장소 > 카테고리"
chips, item name, large price, D-day pill or the recommendation toggle); note
card; `dl` rows (구매처, 재구매 주기) as an info card; action row: "구매하기"
(link) or disabled "구매 링크 없음", and "메모 수정하기"; related items as
`ItemCard`s.

## Shared components

- `ItemCard`: token styles, `inventory_2` icon tile instead of the emoji, D-day
  as a pill.
- `Badge`: token pill (`bg-tertiary-fixed text-on-tertiary-fixed rounded-full`),
  no rotation (only `PodiumItemCard` uses it).
- `RecommendationBadge`: `thumb_up` / `thumb_down` icons + token colors, same
  texts ("추천해요" / "비추천해요").
- `RecommendationToggle` (also used by `NewItemPage`, so both pages change):
  token buttons, `Icon` instead of emoji, same props, same `aria-label`-free
  visible texts ("추천해요" / "비추천해요"), add `aria-pressed`.

## HomePage remaining legacy styling

Replace every legacy class still in `HomePage.tsx`: "검색 결과가 없습니다."
and "조건에 맞는 상품이 없습니다." text colors, the "전체보기 →" span, the back
button, the category buttons in the drill-down (`chunky-btn rounded-2xl
bg-card`), the three filter pills (`bg-stamp`/`bg-card`, add `aria-pressed`),
and the whole link sub-sheet (prompt text, input, "분석하기" button incl. its
disabled styling, error text, "직접 입력하기", "뒤로"). The four record-option
buttons keep `border-2 border-ink` (the `ink` token stays).

## Legacy cleanup (only after grep proves it is safe)

After the ports above, run greps for every class name derived from these tokens
across `src`: `chunky-card`, `chunky-btn`, `chunky-input`, `shadow-chunky`,
`bg-paper`, `bg-card`, `bg-stamp`, `text-stamp`, `border-stamp`, `bg-accent`,
`text-accent`, `border-accent`, `text-warn`, `bg-warn`, `border-warn`, `text-paper`,
`text-card`, and any `loc-` color class. Only if all return nothing (except
`src/index.css` and `tailwind.config.ts` themselves):
- delete `.chunky-card` / `.chunky-btn` / `.chunky-input` from `src/index.css`
  and change the body rule to `@apply bg-surface text-on-surface font-body;`
- delete from `tailwind.config.ts`: colors `paper`, `card`, `stamp`, `accent`,
  `warn`, `loc`, and `boxShadow.chunky`, plus the now-obsolete "additive only"
  comment above the Material tokens.
- KEEP the `ink` color: `AppLayout` and the record sheet use `border-ink`
  deliberately; migrating them is a visual decision out of scope here.
- delete the dead `src/components/ProgressRing.tsx` and
  `src/components/ProgressRing.test.tsx` (no importers besides its own test);
  the vitest test count drops by exactly the number of tests in that file.
If any grep still matches, port that usage first; never leave a class in use
without its definition.

## Testing

No new automated tests (markup port); the ProgressRing deletion removes its
tests. Verification: `tsc --noEmit`, vitest (count = previous minus the
ProgressRing tests), server tests, build, the class-existence script over every
changed file, grep proofs above run AFTER the cleanup (they must still print
nothing), grep for `font-(display|headline|body|label|stat)-` and
`scrollbar-none`, and a manual walkthrough of every touched page at mobile and
tablet widths, including the disabled purchase-link states and the invite
message.

## Out of scope

Mockups 7 / 8 / 9 / `_1`, price chart and AI insight, group buys on the detail
page, product photos, migrating `ink` to another token, real invitation flow.
