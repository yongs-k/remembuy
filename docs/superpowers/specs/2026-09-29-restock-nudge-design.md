# 재구매 알림 (Restock Nudge) — Design

> **Update 2026-09-30:** the preset-only parsing below was widened by user
> decision. `parseRestockCycleDays` now reads any "N일 / N주 / N개월(달) / N년"
> in the text (a month = 30 days), so free-text and seed cycles get due dates too.

## Context

`docs/product-roadmap.md`'s Phase 2/3 vision and its "recommended build order"
both point at the same first step: a rule-based nudge —
`today - lastRecordedDate(item) >= item.restockCycle` — that needs no new
data collection, only logic over the `Item.restockCycle` field that Phase 1
already collects.

This is the first Phase 2/3 feature built. It intentionally stays
rule-based (stage 1 of the roadmap's 3-stage build order); statistical
refinement (stage 2) and any model-based approach (stage 3) are explicitly
out of scope until this stage is validated with real usage.

## Problem

`Item.restockCycle` is a **free-text** field (`string | null`), not a
structured day count. It is populated one of two ways in `NewItemPage.tsx`:

- Three preset chips (`CYCLE_PRESETS = [45, 60, 90]`), which write the exact
  string `` `약 ${d}일마다` `` (e.g. `"약 45일마다"`).
- An arbitrary free-text input (also reachable via Gemini-generated
  link/photo analysis, e.g. `"약 2개월마다"`).

Only the three preset strings can be parsed into a day count without
ambiguity. Free text is out of scope for this feature — those items keep
displaying `restockCycle` as read-only info (as they do today) but are not
included in nudge calculations.

Additionally, the app has no "I just repurchased this" action anywhere.
The only date on `Item` is `createdAt` (registration date). Without a way
to reset the clock, a nudge computed purely from `createdAt` would go
permanently stale the first time it fires — it would just keep counting
up (`D+1`, `D+2`, ...) forever, with no way to clear it short of editing
the item. This feature adds the minimal reset action needed to make the
nudge usable in practice.

## Data model

Add one optional field to `Item` (`src/types.ts`):

```ts
restockedAt?: string | null // ISO date; last time the user confirmed a repurchase. Falls back to createdAt when unset.
```

No migration needed — existing items simply have `restockedAt` undefined
and fall back to `createdAt`, identical to how they behave today.

## Logic (`src/state/selectors.ts`)

Two new functions, following the exact pattern already established by
`getRemainingDays`/`formatDday` for `daysUntilEmpty`:

```ts
export function parseRestockCycleDays(restockCycle: string | null | undefined): number | undefined {
  if (!restockCycle) return undefined
  const preset = [45, 60, 90].find((d) => restockCycle === `약 ${d}일마다`)
  return preset
}

export function getRestockDueDays(item: Item, today: string = new Date().toISOString().slice(0, 10)): number | undefined {
  const cycleDays = parseRestockCycleDays(item.restockCycle)
  if (cycleDays === undefined) return undefined
  const anchor = item.restockedAt ?? item.createdAt
  const elapsedDays = Math.round((new Date(today).getTime() - new Date(anchor).getTime()) / 86_400_000)
  return cycleDays - elapsedDays
}
```

`parseRestockCycleDays` exact-matches only the three known preset strings.
Anything else (free text, null) returns `undefined` and is excluded from
nudge logic — no attempt to parse "약 2개월마다"-style text in this pass.

### Merging into the existing notification list

`getUpcomingNotifications` currently only looks at `getRemainingDays`
(the `daysUntilEmpty`-based signal). It's extended to also consider
`getRestockDueDays`, taking whichever signal is more urgent (smaller
value) per item when both are present:

```ts
function getSoonestRemaining(item: Item, today?: string): number | undefined {
  const a = getRemainingDays(item, today)
  const b = getRestockDueDays(item, today)
  if (a === undefined) return b
  if (b === undefined) return a
  return Math.min(a, b)
}

export function getUpcomingNotifications(items: Item[], thresholdDays = 7, today?: string): Item[] {
  return items
    .map((item) => ({ item, remaining: getSoonestRemaining(item, today) }))
    .filter((entry): entry is { item: Item; remaining: number } => entry.remaining !== undefined)
    .filter((entry) => entry.remaining <= thresholdDays)
    .sort((a, b) => a.remaining - b.remaining)
    .map((entry) => entry.item)
}
```

`NotificationsPage.tsx`'s per-row D-day badge (currently calls
`getRemainingDays(item)` directly at line 43) switches to the same
`getSoonestRemaining` helper so restock-driven items also render a
correct badge instead of blank. `Item.recommendation`'s existing "mutually
exclusive with daysUntilEmpty" comment is unaffected — `restockCycle` isn't
part of that exclusivity rule and can coexist with either.

## UI — "재구매함" (restocked) button

Shown only for items where `parseRestockCycleDays(item.restockCycle)` is
defined (i.e. one of the three presets) — free-text-cycle items never show
it, since there's nothing to reset a clock against.

Two locations, both calling `updateItem(item.id, { restockedAt: todayIso })`:

1. **`NotificationsPage.tsx`** — inside each list item's action row
   (alongside the existing "상세보기"/"구매하기" buttons), for items
   currently surfaced by the nudge.
2. **`ItemDetailPage.tsx`** — next to the existing "재구매 주기" row inside
   the `<dl>` info block, so the reset is available even when the item
   isn't currently due.

No confirmation dialog — this mirrors the low-friction pattern used
elsewhere in the app (e.g. recommendation toggle, category chips).

## Testing

- `selectors.test.ts`: unit tests for `parseRestockCycleDays` (all 3
  presets match, free text and null return undefined) and
  `getRestockDueDays` (due/not-due math, `restockedAt` fallback to
  `createdAt`, unparseable cycle returns undefined).
- Existing `getUpcomingNotifications` tests extended to cover a
  restock-driven item appearing/not appearing based on threshold, and the
  "soonest of the two signals" merge behavior.

## Out of scope

- Parsing free-text `restockCycle` values (stays a roadmap stage-2/3
  concern, or a separate future pass).
- Any statistical/observed-average cadence calculation (roadmap stage 2).
- Any model-based/conversational recommendation (roadmap stage 3).
- Push/OS-level notifications — this reuses the existing in-app
  `NotificationsPage`, no new delivery mechanism.
