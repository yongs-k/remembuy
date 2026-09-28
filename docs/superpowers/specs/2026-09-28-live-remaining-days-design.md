# Live Remaining-Days Calculation — Design Spec

Date: 2026-09-28

## Purpose

`docs/product-roadmap.md`'s Phase 3 recommends building the AI-vision
roadmap "rule-based first": `today - lastRecordedDate(item) >=
item.restockCycle`, explicitly because it "requires nothing but data
already in `Item` and ships value immediately." An even smaller version
of that same idea is already possible today: `Item.daysUntilEmpty` is a
plain number the user types once at creation time ("며칠 후 바닥날 것
같아요") and every screen that shows it (`ItemCard`, `CategoryChecklist`,
`PodiumItemCard`, `HomePage`'s urgent filter, `PurchasePage`'s
"AI 비서" hero, and `getUpcomingNotifications`) displays that exact
number forever, un-decayed — a "D-7" item still reads "D-7" a week later
even though it's actually due today.

This plan makes that value live: displayed and filtered as
`daysUntilEmpty - (today - createdAt)`, computed on read, not stored.
`Item.createdAt` (already recorded on every item, `YYYY-MM-DD`) is the
only additional input needed — no schema change, no new field, no
accumulated usage history, no login. This is the smallest possible
first slice of Phase 3's "rule-based nudge" idea from the roadmap.

## Scope

- **In scope:** replacing every read of `item.daysUntilEmpty` across the
  codebase with a live-computed "remaining days" value, and updating the
  "D-N" display text to also handle the now-reachable negative case
  ("D+N", meaning N days overdue — decided explicitly: accurate negative
  display, not clamped to zero).
- **Out of scope (explicitly):**
  - `NewItemPage.tsx`'s input side — the user still types a plain "N
    days from now" estimate at creation/edit time; this plan only
    changes how that stored estimate is *read* later, not how it's
    entered. No UI copy change there.
  - `restockCycle`-based automatic re-alerts (parsing "약 45일마다" and
    pinging again after each cycle) — a materially bigger feature
    (needs a notion of "last restocked," not just "created"), deferred.
  - The `FamilyMember` type's `items: Array<{ itemName, daysUntilEmpty
    }>` (`src/types.ts`) — confirmed unused outside
    `src/data/familyData.ts`'s dummy fixture; not a real `Item`, not
    touched.
  - Any change to `Item.daysUntilEmpty`'s storage format, field name, or
    the `Item` type itself — it keeps meaning "the estimate given at
    creation time"; only how it's *displayed* changes.

## Design

Two new pure functions in `src/state/selectors.ts`, alongside its
existing derived-value functions (`getCategoryCompletion`,
`getUpcomingNotifications`, etc.):

```ts
export function getRemainingDays(
  item: Item,
  today: string = new Date().toISOString().slice(0, 10)
): number | undefined {
  if (item.daysUntilEmpty === undefined) return undefined
  const elapsedDays = Math.round(
    (new Date(today).getTime() - new Date(item.createdAt).getTime()) / 86_400_000
  )
  return item.daysUntilEmpty - elapsedDays
}

export function formatDday(days: number): string {
  return days >= 0 ? `D-${days}` : `D+${Math.abs(days)}`
}
```

`today` is an optional parameter (not read from `Date.now()` internally
by default callers, but overridable) specifically so call sites and
tests can pass a fixed date instead of mocking global `Date` — this
matches `Item.createdAt`'s existing `YYYY-MM-DD`-only granularity (no
time-of-day component to worry about), so a simple day-difference is
exact and needs no timezone handling.

### Read-site changes (all mechanical — replace `item.daysUntilEmpty` with `getRemainingDays(item)`, and any `D-{n}` template with `formatDday(getRemainingDays(item))`)

1. **`src/state/selectors.ts`'s `getUpcomingNotifications`** — filters
   and sorts by the live value instead of the stored one, so an item
   that's crossed the threshold *today* (even though its stored number
   hasn't been touched) now correctly surfaces.
2. **`src/components/ItemCard.tsx`** — `urgent` check and the `D-{n}`
   badge.
3. **`src/components/CategoryChecklist.tsx`** — same pattern, `urgent`
   check and badge.
4. **`src/components/PodiumItemCard.tsx`** — same pattern, `urgent`
   check and badge (plus its "소진임박" suffix, unchanged text, just
   driven by the live `urgent` flag now).
5. **`src/pages/HomePage.tsx`**'s `urgent` filter (`item.daysUntilEmpty
   !== undefined && item.daysUntilEmpty <= 7`) — same threshold, live
   value.
6. **`src/pages/PurchasePage.tsx`** — `heroDays` currently reads
   `Math.max(0, urgent?.daysUntilEmpty ?? fallback.daysUntilEmpty)`
   from the item `getUpcomingNotifications(items, 30)[0]` returns. Two
   changes: read `getRemainingDays(urgent)` instead of
   `urgent.daysUntilEmpty`, and drop the `Math.max(0, ...)` clamp — per
   this plan's negative-display decision, an overdue "AI 비서" hero
   should say so, not floor at "D-0".
7. **`src/components/ButlerHero.tsx`** — its `daysUntilEmpty: number`
   prop keeps its name and type (still just "a number of days, possibly
   negative") since it's a presentational component with no `Item`
   access of its own; internally, both of its two `{daysUntilEmpty}`-
   based text spots switch to `formatDday(daysUntilEmpty)`.

No change to `Item`, `src/types.ts`, `NewItemPage.tsx`'s write path, or
`FamilyMember`/`familyData.ts`.

## Testing

- `getRemainingDays` and `formatDday` are pure functions — get direct
  unit tests in `src/state/selectors.test.ts` (the existing test file
  for this module, following its established pattern): a same-day
  item (`today === createdAt`) returns the stored value unchanged; an
  item several days past its estimate returns a negative number;
  `formatDday` covers zero, a positive number, and a negative number.
- `getUpcomingNotifications`'s existing tests (if any) get one added
  case: an item whose *stored* `daysUntilEmpty` is above the threshold
  but whose *live* remaining days (given a later `today`) is at or below
  it — confirming the live value, not the stored one, drives inclusion.
- Confirmed: none of the six UI read-sites (`ItemCard.tsx`,
  `CategoryChecklist.tsx`, `PodiumItemCard.tsx`, `HomePage.tsx`,
  `PurchasePage.tsx`, `ButlerHero.tsx`) have an existing test file
  (`src/state/selectors.test.ts` does exist and is where the new
  selector tests go; `DexItemCard.test.tsx` exists but `DexItemCard` is
  unrelated to this plan). No new test file is created for wiring an
  existing prop/read through the new selector — consistent with this
  codebase's established precedent of not unit-testing this class of
  presentational/page component. This plan's test coverage is for the
  new *logic* (`getRemainingDays`/`formatDday`) only.

## Out of Scope (recap)

`restockCycle`-based automatic re-alerts, `NewItemPage.tsx`'s input UI,
`Item`'s stored shape, `FamilyMember`/dummy family data.
