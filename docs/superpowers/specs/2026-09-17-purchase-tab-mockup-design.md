# Purchase Tab Mockup — Design Spec

Date: 2026-09-17

## Purpose

The user wants the "공유" (share) tab removed entirely — its dummy social
feed serves no purpose — and replaced, at the same tab slot, with a
"구매" (purchase) tab: a commerce surface combining AI-recommended
products, discount listings, and group-buy campaigns. Real recommendation
logic, real discount data (would require a shopping-site integration),
and real group-buy participation (would require a backend tracking
participants/payments) are all explicitly out of scope — this is a
**visual-only mockup**, matching the precedent set by the earlier home
gamification mockup: static dummy data, no live logic.

## Scope

- Remove: `src/pages/FeedPage.tsx`, `src/data/feedData.ts` (the dummy
  social feed and its save-to-locker action) — confirmed unneeded, not
  refactored into anything.
- Remove the `/feed` route from `src/App.tsx` and its `FeedPage` import.
- Replace, at the same position in the bottom tab bar / sidebar (5 tabs
  stay 5 tabs, only this one changes): `AppLayout.tsx`'s `TABS` array
  entry `{ to: '/feed', label: '공유', icon: '👥' }` becomes
  `{ to: '/purchase', label: '구매', icon: '🛒' }`.
- Add a new route `/purchase` → new `PurchasePage.tsx`.
- No changes to any other page, to `LockerContext`, or to the `Item`/
  `Location`/`Category` data model — this is a new, self-contained page
  with its own static dummy data, same pattern as `homeDummy.ts`.

## `PurchasePage.tsx` — Sections

Three stacked sections, each a simple list of cards (no drill-down, no
interactivity beyond a decorative button where noted):

1. **"🤖 AI 추천 상품"** — a list of recommended-product cards, each
   showing a product name, a one-line "why recommended" text, and a
   price. No real recommendation logic — the reasons are pre-written
   dummy strings (e.g. "지난달 재구매 주기가 다가와요" — deliberately
   written to *look like* the kind of output the Phase 2/3 roadmap
   (`docs/product-roadmap.md`) describes, since that's the eventual
   intent, but nothing here is computed).
2. **"🔥 할인 중"** — a list of discount cards: product name, original
   price (struck through), discounted price, and a discount-percentage
   badge.
3. **"👥 공동구매 진행중"** — a list of group-buy campaign cards: product
   name, a progress bar (current participants / target participants),
   price-per-person, and a "참여하기" button. The button has no `onClick`
   (a true no-op, not a fake success message) — clicking it does nothing,
   consistent with this being a pure visual mockup.

All three sections reuse existing design tokens (`bg-card`, `text-ink`,
`bg-stamp`, the same card/rounded-corner/spacing conventions already used
throughout this app) — no new colors.

## Data

New file `src/data/purchaseDummy.ts`, following the `homeDummy.ts`/
`feedData.ts` static-data precedent:

```ts
export type DummyRecommendation = {
  id: string
  name: string
  reason: string
  price: number
}

export const DUMMY_RECOMMENDATIONS: DummyRecommendation[] = [
  { id: 'rec-1', name: '샴푸', reason: '지난달 재구매 주기가 다가와요', price: 12000 },
  { id: 'rec-2', name: '주방세제', reason: '자주 함께 기록되는 상품이에요', price: 5000 },
]

export type DummyDiscount = {
  id: string
  name: string
  originalPrice: number
  discountedPrice: number
}

export const DUMMY_DISCOUNTS: DummyDiscount[] = [
  { id: 'disc-1', name: '2겹 화장지 30롤', originalPrice: 25000, discountedPrice: 18000 },
  { id: 'disc-2', name: '섬유유연제 3L', originalPrice: 15000, discountedPrice: 11000 },
]

export type DummyGroupBuy = {
  id: string
  name: string
  currentParticipants: number
  targetParticipants: number
  pricePerPerson: number
}

export const DUMMY_GROUP_BUYS: DummyGroupBuy[] = [
  { id: 'gb-1', name: '고급 세탁세제 대용량', currentParticipants: 7, targetParticipants: 10, pricePerPerson: 9000 },
  { id: 'gb-2', name: '유기농 주방타월 세트', currentParticipants: 3, targetParticipants: 8, pricePerPerson: 6000 },
]
```

Discount percentage is derived in the component from
`originalPrice`/`discountedPrice`, not stored (avoids a redundant field
that could drift from the two prices it's computed from).

## Testing

No automated test for `PurchasePage.tsx` — same precedent as every other
page-level component in this branch (`HomePage`, `RankingPage`, etc.):
verified via `tsc --noEmit` + manual trace. Manual trace: navigate to the
tab (bottom bar on mobile widths, sidebar on desktop widths per the
earlier layout migration), confirm the three sections render with the
dummy data, confirm the discount percentage badge computes correctly
(e.g. 18000/25000 → "28% 할인"), confirm "참여하기" does nothing when
clicked, confirm the old `/feed` route and "공유" label no longer exist
anywhere (no leftover FeedPage import, no dangling route).

## Out of Scope (explicitly)

- Real recommendation logic (Phase 2/3 of `docs/product-roadmap.md`).
- Real discount data from any shopping-site integration.
- Real group-buy participation, payment, or backend tracking.
- The still-paused link-analysis AI feature — unrelated to this plan.
