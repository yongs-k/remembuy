# Collection Podium (1st/2nd/3rd) — Design Spec

Date: 2026-09-16

## Purpose

The user wants to explicitly designate their favorite 1st/2nd/3rd-place
product within each category, independent of the existing automatic
recommend/not-recommend sort order. This is a single-user, client-side
feature (no backend, no multi-user data) — it's the first of three
related feature requests, the other two (a cross-user ranking tab built
on "completed" podiums, and replacing the share tab with a
purchase/discount/group-buy tab) are explicitly deferred to their own
separate design cycles once this lands.

## Scope

- **Per-category**, not per-location: within one category (e.g.
  "욕실-스킨케어"), the user can mark up to three of their recorded items
  as 1st, 2nd, and 3rd place. Each rank (1/2/3) can only be held by one
  item at a time within that category; assigning a rank to a new item
  automatically clears it from whichever item held it before.
- **Assigned from `RankingPage`'s existing product-list view** (the
  `drill.level === 'products'` branch, already showing a per-category
  ranked list) — not a new screen.
- This plan does NOT implement: cross-user ranking, "completed podium"
  detection/display, or any purchase/discount/group-buy feature. Those
  are separate, later projects.

## Data Model

Add one new optional field to `Item` (`src/types.ts`):

```ts
export type Item = {
  // ...existing fields unchanged...
  podiumRank?: 1 | 2 | 3
}
```

No change to `Location`, `Category`, or any other type.

## State Management

Add one new action and one new context method to `src/state/LockerContext.tsx`,
following the existing `updateItem`-style pattern:

- **Action:** `{ type: 'SET_PODIUM_RANK'; itemId: string; categoryId: string; rank: 1 | 2 | 3 | null }`
- **Reducer behavior:** within `state.items`, for every item where
  `item.categoryId === action.categoryId`: if an item (other than
  `action.itemId`) currently has `podiumRank === action.rank` (and
  `action.rank` is not `null`), clear its `podiumRank` to `undefined`.
  Then set `action.itemId`'s `podiumRank` to `action.rank` (or clear it
  to `undefined` if `action.rank` is `null` — this is the "tap the same
  medal again to unassign" case). This is a single reducer pass over
  `state.items`, not two separate dispatches, so the reassignment is
  atomic (no intermediate state where two items hold the same rank).
- **Context method:** `setPodiumRank: (itemId: string, categoryId: string, rank: 1 | 2 | 3 | null) => void`,
  added to `LockerContextValue` and dispatching the action above.

## UI — `RankingPage`'s product list

In the `drill.level === 'products'` branch's `<ol>` (the per-category
ranked list), each `<li>` gains three small medal toggle buttons (🥇🥈🥉)
before/alongside the existing rank-index number and `RecommendationBadge`.
Tapping a medal that isn't already assigned to this item calls
`setPodiumRank(item.id, category.id, rank)` (reassigning it away from
whichever item held it, if any); tapping a medal already assigned to this
item calls `setPodiumRank(item.id, category.id, null)` (unassign). Medal
buttons need `onClick`'s event to not also trigger the `<li>`'s existing
`navigate(/item/:id)` click handler — stop propagation on the medal
buttons' click handler.

The existing `index === 0 && <Badge>다시 살래요</Badge>` (an automatic badge
tied to sort-order position) is replaced by an explicit
`item.podiumRank === 1 && <Badge>다시 살래요</Badge>` — i.e., the "buy again"
badge now reflects the user's actual 1st-place pick, not just whichever
item happens to sort first. If no item in the category has been assigned
`podiumRank === 1` yet, no badge shows. The list's sort order itself
(recommend > notRecommend > unrated, from `getRankingForCategory`) is
**unchanged** — podium assignment is an independent, additional signal
layered on top of it, not a replacement for the sort.

Visually, each medal button shows filled/bright when it matches the
item's current `podiumRank`, and dim/outlined otherwise — reusing the
existing `text-ink/40` (dim) vs. full-color (assigned) convention already
used elsewhere in this codebase (e.g. `CollectionPage`'s edit/delete
icons).

## Testing

- `LockerContext`'s reducer gets one new test in
  `src/state/LockerContext.test.tsx`, following its existing pattern:
  dispatch `SET_PODIUM_RANK` for an item, assert its `podiumRank` is set;
  dispatch it again for a different item in the same category with the
  same rank, assert the first item's `podiumRank` is cleared and the
  second item's is set; dispatch with `rank: null` for an already-assigned
  item, assert it clears to `undefined`.
- `RankingPage` itself gets no new automated test — consistent with this
  branch's established precedent (no page/route-level component here has
  automated tests; verified via `tsc --noEmit` + manual trace instead).

## Out of Scope (explicitly)

- Cross-user ranking tab, "completed podium" detection/aggregation —
  deferred to a separate future project (requires multi-user backend).
- Replacing the share tab with a purchase/discount/group-buy tab —
  deferred to a separate future project (requires commerce data
  integration).
- The paused link-analysis AI feature (from earlier this session) —
  remains paused, unrelated to this plan.
