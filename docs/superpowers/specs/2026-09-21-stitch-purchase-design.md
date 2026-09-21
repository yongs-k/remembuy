# Stitch Design Port — Purchase Page (4) — Design Spec

Date: 2026-09-21

## Purpose

Sub-project 4 of 6. Ports `remembuy_5` (구매/알림: AI 비서 히어로, 도감 위시 &
특가 레이더, 이웃 수집가 공구 파티, 파티 개설 배너) onto `PurchasePage`.
`PurchasePage` currently renders only static dummy data from
`src/data/purchaseDummy.ts` and touches no store, and there is no purchase or
group-buy backend, so this is a visual port with almost no real data.

Lessons applied from 3a/3b: only `font-heading`/`font-body` exist as
font-family utilities (type-scale sizes are `text-label-sm` etc.); no
`scrollbar-none`; every Tailwind class must exist in the generated CSS; icons
only through `Icon`; two-button rows use `items-stretch`.

## Data policy

Real: the butler hero's product name and D-day come from the most urgent
real item when one exists: `getUpcomingNotifications(items, 30)[0]`
(`Item.name`, `Item.daysUntilEmpty`). If none exists, the hero falls back to
the dummy item. The greeting uses `DUMMY_PROFILE.name` from `homeDummy.ts`.
Everything else is static dummy: prices, discounts, tags, remaining-amount
text, deal cards, group buys, avatar row, countdown text (static strings,
nothing ticks). Discount percent labels are computed from the dummy
original/discounted prices, not hardcoded.

## Actions (decision: option A)

None of the buttons (최저가 즉시 재구매, 주기 미루기, 쿠폰 적용 구매, 참여하기,
마지막 자리 탑승하기, 파티 개설, 상세보기 chevron, 딜 CTAs) have a backend.
Each is a normal-looking enabled button that calls one shared `onAction()`;
`PurchasePage` owns `notice: string | null` state and shows a small snackbar
"아직 준비 중인 기능이에요" for ~2.5 seconds (`setTimeout`, cleared in an
effect cleanup, repeated clicks restart the timer). The snackbar is
`role="status"`, fixed above the bottom nav (`bottom-24 md:bottom-8`), styled
with `bg-inverse-surface text-inverse-on-surface`. No `alert()` (the mockup's
own `alert()` calls are not ported).

## Layout (top to bottom)

1. **`ButlerHero`**: bubble "AI 리멤버 비서 · 스마트 리더 ON" with the
   greeting "{name}님, {location} 도감의 {item}가 {N}일 뒤 바닥나요! …";
   product card: rank tag, location label, "D-{N} 소진임박" pill, icon tile
   (`inventory_2`, no product photo), name, average cycle line, remaining
   gauge (dummy 18%), price row (current, discount %, struck-through original,
   "역대 최저가 근접"), two buttons "최저가 즉시 재구매" / "주기 미루기"; then a
   compact next-reminder row with a chevron button.
2. **Deal radar**: header "도감 위시 & 특가 레이더" with a "최대 N% OFF"
   badge (N = max computed percent), filter chips 전체 / 내 도감 등록템 /
   미등록 아이템 with real counts that actually filter the cards
   (`kind: 'owned' | 'unowned'`), then `DealCard`s: tag row, name, subtitle,
   price row with computed % OFF and struck-through original, footnote,
   CTA. Empty filter result shows "해당하는 특가가 없어요."
3. **Group-buy party**: header "이웃 수집가 실시간 공구 파티" with a
   "동네 거점 매칭" badge and a one-line description; `GroupBuyCard`
   `featured` (urgency tag, location, static countdown, name, price,
   "-20% 추가 절약", 5-slot avatar row with 4 filled + "?", progress bar
   "4 / 5명 달성 (80%)" computed from joined/target, CTA "마지막 자리
   탑승하기(15,200원)") and two `compact` cards (recruiting "2/4명 모집중",
   name, price, "참여하기", per-unit note or "+50P 파티 보너스").
4. **Party open banner**: gradient card "원하는 물품이 없나요? 내가 직접
   공구 파티 열기" with "파티 개설" button.

## Components / files

- Modify `src/data/purchaseDummy.ts`: replace the three old dummy lists
  with `DUMMY_BUTLER`, `DUMMY_DEALS` (typed `DummyDeal`), `DUMMY_PARTIES`
  (one featured + two compact). The old exports are no longer imported by
  anything else (verify by grep before removing).
- Create `src/components/ButlerHero.tsx`, `DealCard.tsx`,
  `GroupBuyCard.tsx`.
- Modify `src/pages/PurchasePage.tsx`: state (`filter`, `notice`), hero item
  selection, assembly, snackbar.

## Explicitly unchanged

Store, selectors, routes, other pages, `AppLayout`, `homeDummy.ts` (only read).

## Testing

No new automated tests (markup port with static data). Verification: `tsc
--noEmit`, vitest, server tests, build, the Tailwind class-existence check from
3b (scan every string literal against the generated CSS, remembering Tailwind
escapes `,` as `\2c `), grep for `font-(display|headline|body|label|stat)-` and
`scrollbar-none`, and a manual walkthrough: chips filter and counts agree,
every action button shows the snackbar and it disappears, the hero shows a
real item's name/D-day when one is within 30 days, and the dock/snackbar
clears the mobile bottom nav.

## Out of scope

Real purchase, coupon, group-buy or wishlist flows, real price data, tickers,
product photos, the "주기 미루기" reminder-postponing logic.
