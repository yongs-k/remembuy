# Restock Nudge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface a rule-based "time to repurchase" nudge for items whose `restockCycle` is one of the three known presets, and let users reset it with a "재구매함" button.

**Architecture:** Two new pure functions in `src/state/selectors.ts` (`parseRestockCycleDays`, `getRestockDueDays`) mirror the existing `getRemainingDays`/`formatDday` pattern for `daysUntilEmpty`. `getUpcomingNotifications` is extended to take the more urgent of the two signals per item. A new optional `Item.restockedAt` field anchors the calculation and is reset via the existing `updateItem` action from two small UI additions.

**Tech Stack:** React + TypeScript, Vitest for unit tests. No backend changes — this is entirely client-side (`localStorage`-backed `Item[]` state via `LockerContext`).

## Global Constraints

- `parseRestockCycleDays` matches ONLY the exact strings `"약 45일마다"`, `"약 60일마다"`, `"약 90일마다"` — no fuzzy/regex parsing of other free text (per spec's explicit scope cut).
- No new dependencies, no new files beyond what's listed in each task.
- Follow existing code style: no comments unless explaining non-obvious "why", Korean UI strings match existing tone (다른 화면의 "구매하기"/"상세보기" 버튼과 동일한 톤).

---

### Task 1: Data model + selector logic + tests

**Files:**
- Modify: `src/types.ts` (add `restockedAt` field to `Item`)
- Modify: `src/state/selectors.ts` (add `parseRestockCycleDays`, `getRestockDueDays`; extend `getUpcomingNotifications`)
- Modify: `src/state/selectors.test.ts` (add tests)

**Interfaces:**
- Produces: `parseRestockCycleDays(restockCycle: string | null | undefined): number | undefined` — exported.
- Produces: `getRestockDueDays(item: Item, today?: string): number | undefined` — exported, same `today` default pattern as `getRemainingDays` (`new Date().toISOString().slice(0, 10)`).
- Modifies: `getUpcomingNotifications(items: Item[], thresholdDays?: number, today?: string): Item[]` — same signature, now considers both signals internally.
- Consumes: existing `Item` type, existing `getRemainingDays` (both in the same file, no cross-file import needed).

- [ ] **Step 1: Add `restockedAt` to the `Item` type**

In `src/types.ts`, in the `Item` type (currently lines 19-35), add the new field directly below `restockCycle`:

```ts
  restockCycle?: string | null
  restockedAt?: string | null // ISO date of the last confirmed repurchase; falls back to createdAt when unset
  affiliateUrl?: string | null
```

- [ ] **Step 2: Write failing tests for `parseRestockCycleDays`**

In `src/state/selectors.test.ts`, add the import (extend the existing import block from `./selectors`):

```ts
import {
  getCategoryCompletion,
  getLocationCompletion,
  getMissingMasterItems,
  getRankingForCategory,
  getUpcomingNotifications,
  getLocationsRankedByItemCount,
  getCategoriesRankedByItemCount,
  getCompletedPodium,
  getMasterItemCounts,
  getCompletionGain,
  getRemainingDays,
  formatDday,
  parseRestockCycleDays,
  getRestockDueDays,
} from './selectors'
```

Then add a new `describe` block, placed directly after the existing `describe('formatDday', ...)` block (around line 159, before `describe('getUpcomingNotifications', ...)`):

```ts
describe('parseRestockCycleDays', () => {
  it('parses each of the three preset strings', () => {
    expect(parseRestockCycleDays('약 45일마다')).toBe(45)
    expect(parseRestockCycleDays('약 60일마다')).toBe(60)
    expect(parseRestockCycleDays('약 90일마다')).toBe(90)
  })

  it('returns undefined for free-text cycles', () => {
    expect(parseRestockCycleDays('약 2개월마다')).toBeUndefined()
  })

  it('returns undefined for null and undefined', () => {
    expect(parseRestockCycleDays(null)).toBeUndefined()
    expect(parseRestockCycleDays(undefined)).toBeUndefined()
  })
})

describe('getRestockDueDays', () => {
  it('returns undefined when restockCycle is not a known preset', () => {
    const item = makeItem({ id: 'i1', restockCycle: '약 2개월마다' })
    expect(getRestockDueDays(item, '2026-09-05')).toBeUndefined()
  })

  it('returns undefined when restockCycle is unset', () => {
    const item = makeItem({ id: 'i1' })
    expect(getRestockDueDays(item, '2026-09-05')).toBeUndefined()
  })

  it('counts down from createdAt when restockedAt is unset', () => {
    const item = makeItem({ id: 'i1', restockCycle: '약 45일마다', createdAt: '2026-09-01' })
    expect(getRestockDueDays(item, '2026-09-01')).toBe(45)
    expect(getRestockDueDays(item, '2026-09-11')).toBe(35)
  })

  it('counts down from restockedAt when set, ignoring createdAt', () => {
    const item = makeItem({
      id: 'i1',
      restockCycle: '약 45일마다',
      createdAt: '2026-01-01',
      restockedAt: '2026-09-01',
    })
    expect(getRestockDueDays(item, '2026-09-11')).toBe(35)
  })

  it('returns a negative number once the cycle has passed', () => {
    const item = makeItem({ id: 'i1', restockCycle: '약 45일마다', createdAt: '2026-09-01' })
    expect(getRestockDueDays(item, '2026-10-20')).toBe(-4)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- selectors.test.ts` (or `npx vitest run src/state/selectors.test.ts`)
Expected: FAIL — `parseRestockCycleDays` and `getRestockDueDays` are not exported from `./selectors`.

- [ ] **Step 4: Implement `parseRestockCycleDays` and `getRestockDueDays`**

In `src/state/selectors.ts`, add directly after the existing `formatDday` function (currently lines 60-62):

```ts
const RESTOCK_CYCLE_PRESETS = [45, 60, 90]

export function parseRestockCycleDays(restockCycle: string | null | undefined): number | undefined {
  if (!restockCycle) return undefined
  return RESTOCK_CYCLE_PRESETS.find((d) => restockCycle === `약 ${d}일마다`)
}

export function getRestockDueDays(item: Item, today: string = new Date().toISOString().slice(0, 10)): number | undefined {
  const cycleDays = parseRestockCycleDays(item.restockCycle)
  if (cycleDays === undefined) return undefined
  const anchor = item.restockedAt ?? item.createdAt
  const elapsedDays = Math.round(
    (new Date(today).getTime() - new Date(anchor).getTime()) / 86_400_000
  )
  return cycleDays - elapsedDays
}
```

- [ ] **Step 5: Run tests to verify `parseRestockCycleDays`/`getRestockDueDays` tests pass**

Run: `npx vitest run src/state/selectors.test.ts`
Expected: PASS for the two new `describe` blocks. The `getUpcomingNotifications` tests still pass unchanged (not yet modified).

- [ ] **Step 6: Write failing test for the merged `getUpcomingNotifications` behavior**

In `src/state/selectors.test.ts`, inside the existing `describe('getUpcomingNotifications', ...)` block (currently lines 161-181), add two more `it` blocks:

```ts
  it('includes an item whose restock cycle is due, alongside daysUntilEmpty-based items', () => {
    const items = [
      makeItem({ id: 'i1', daysUntilEmpty: 10, createdAt: '2026-09-01' }),
      makeItem({ id: 'i2', restockCycle: '약 45일마다', createdAt: '2026-08-01' }),
    ]
    // i1's live remaining is 10 - 0 = 10 (outside threshold 7).
    // i2's restock due is 45 - 31 = 14 (outside threshold 7).
    const outside = getUpcomingNotifications(items, 7, '2026-09-01')
    expect(outside.map((i) => i.id)).toEqual([])

    // Move forward so i2's restock cycle (45 days from 2026-08-01) is within 7 days.
    const within = getUpcomingNotifications(items, 7, '2026-09-14')
    expect(within.map((i) => i.id)).toEqual(['i2'])
  })

  it('uses whichever signal is more urgent when both are present', () => {
    const item = makeItem({
      id: 'i1',
      daysUntilEmpty: 3,
      restockCycle: '약 90일마다',
      createdAt: '2026-09-01',
    })
    // daysUntilEmpty-based remaining: 3 - 0 = 3 (within threshold).
    // restock-based remaining: 90 - 0 = 90 (outside threshold).
    // The item should surface because the more urgent signal wins.
    const result = getUpcomingNotifications([item], 7, '2026-09-01')
    expect(result.map((i) => i.id)).toEqual(['i1'])
  })
```

- [ ] **Step 7: Run tests to verify the new `getUpcomingNotifications` tests fail**

Run: `npx vitest run src/state/selectors.test.ts`
Expected: FAIL — the two new tests fail because `getUpcomingNotifications` doesn't yet consider `getRestockDueDays`.

- [ ] **Step 8: Extend `getUpcomingNotifications` to merge both signals**

In `src/state/selectors.ts`, replace the existing `getUpcomingNotifications` function (currently lines 64-71):

```ts
export function getUpcomingNotifications(items: Item[], thresholdDays = 7, today?: string): Item[] {
  return items
    .map((item) => ({ item, remaining: getRemainingDays(item, today) }))
    .filter((entry): entry is { item: Item; remaining: number } => entry.remaining !== undefined)
    .filter((entry) => entry.remaining <= thresholdDays)
    .sort((a, b) => a.remaining - b.remaining)
    .map((entry) => entry.item)
}
```

with:

```ts
export function getSoonestRemaining(item: Item, today?: string): number | undefined {
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

- [ ] **Step 9: Run the full selectors test suite to verify everything passes**

Run: `npx vitest run src/state/selectors.test.ts`
Expected: PASS — all tests including the two new `getUpcomingNotifications` cases and the untouched `getRemainingDays`/existing `getUpcomingNotifications` tests.

- [ ] **Step 10: Run TypeScript compiler to check for type errors**

Run: `npx tsc --noEmit`
Expected: no errors (no other file references `Item` exhaustively in a way that would break from the new optional field).

- [ ] **Step 11: Commit**

```bash
git add src/types.ts src/state/selectors.ts src/state/selectors.test.ts
git commit -m "feat: add restock-cycle due-date calculation and merge into notifications

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: UI — "재구매함" button in NotificationsPage and ItemDetailPage

**Files:**
- Modify: `src/pages/NotificationsPage.tsx`
- Modify: `src/pages/ItemDetailPage.tsx`

**Interfaces:**
- Consumes: `parseRestockCycleDays(restockCycle: string | null | undefined): number | undefined` and `getSoonestRemaining(item: Item, today?: string): number | undefined` from `../state/selectors` (both produced in Task 1).
- Consumes: `updateItem(id: string, patch: Partial<Item>): void` from `useLocker()` (`../state/LockerContext`) — already exists, no changes needed.

- [ ] **Step 1: Update NotificationsPage to use the merged remaining-days signal and add the reset button**

In `src/pages/NotificationsPage.tsx`, replace the full file contents:

```tsx
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications, getSoonestRemaining, formatDday, parseRestockCycleDays } from '../state/selectors'
import { useSeenNotifications } from '../hooks/useSeenNotifications'
import { Icon } from '../data/materialIcons'

export default function NotificationsPage() {
  const { items, updateItem } = useLocker()
  const navigate = useNavigate()
  const upcoming = useMemo(() => getUpcomingNotifications(items, 7), [items])
  const { markSeen } = useSeenNotifications()

  useEffect(() => {
    if (upcoming.length > 0) {
      markSeen(upcoming.map((item) => item.id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcoming])

  return (
    <div className="space-y-space-md p-margin">
      <div className="flex items-center justify-between gap-space-sm">
        <h1 className="flex items-center gap-1.5 font-heading text-headline-lg text-on-surface">
          <Icon name="notifications" className="text-[24px] text-primary" />
          알림
        </h1>
        {upcoming.length > 0 && (
          <span className="rounded-full bg-error-container px-2 py-0.5 text-label-sm text-on-error-container">
            소진 임박 {upcoming.length}건
          </span>
        )}
      </div>

      {upcoming.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface-container-lowest p-space-xl text-center shadow-[0_3px_0px_#eae0de]">
          <Icon name="notifications_off" className="text-[32px] text-on-surface-variant" />
          <p className="text-body-sm text-on-surface-variant">임박한 소모품이 없습니다.</p>
        </div>
      ) : (
        <ul className="space-y-space-sm">
          {upcoming.map((item) => {
            const remaining = getSoonestRemaining(item)
            const urgent = remaining !== undefined && remaining <= 7
            const canRestock = parseRestockCycleDays(item.restockCycle) !== undefined
            return (
              <li
                key={item.id}
                className="rounded-xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]"
              >
                <div className="flex items-center gap-space-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
                    <Icon name="inventory_2" className="text-[22px]" />
                  </div>
                  <p className="min-w-0 flex-1 truncate text-label-lg text-on-surface">{item.name}</p>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-label-sm ${
                      urgent
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {remaining !== undefined ? formatDday(remaining) : null}
                  </span>
                </div>
                <div className="mt-space-sm flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/item/${item.id}`)}
                    className="rounded-lg bg-surface-container-high px-3 py-1.5 text-label-md text-on-surface"
                  >
                    상세보기
                  </button>
                  {canRestock && (
                    <button
                      type="button"
                      onClick={() =>
                        updateItem(item.id, { restockedAt: new Date().toISOString().slice(0, 10) })
                      }
                      className="rounded-lg bg-surface-container-high px-3 py-1.5 text-label-md text-on-surface"
                    >
                      재구매함
                    </button>
                  )}
                  {item.affiliateUrl ? (
                    <a
                      href={item.affiliateUrl}
                      className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-label-md text-on-primary shadow-[0_2px_0px_#8b1901] active:translate-y-0.5"
                    >
                      구매하기
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="ml-auto rounded-lg bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant opacity-60"
                    >
                      구매 링크 없음
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add the reset button to ItemDetailPage's restock-cycle row**

In `src/pages/ItemDetailPage.tsx`, update the import line (currently line 7):

```tsx
import { getRemainingDays, formatDday, parseRestockCycleDays } from '../state/selectors'
```

Then destructure `updateItem` from `useLocker()` (currently line 12 already includes `updateItem` — verify; if not present, add it):

```tsx
  const { items, locations, categories, updateItem } = useLocker()
```

Then replace the restock-cycle `<dl>` row (currently lines 121-126, immediately after the `item.place` row inside the same `<dl>` block):

```tsx
          {item.restockCycle && (
            <div className="flex justify-between gap-2">
              <dt className="text-on-surface-variant">재구매 주기</dt>
              <dd className="text-on-surface">{item.restockCycle}</dd>
            </div>
          )}
```

Replace with:

```tsx
          {item.restockCycle && (
            <div className="flex items-center justify-between gap-2">
              <dt className="text-on-surface-variant">재구매 주기</dt>
              <dd className="flex items-center gap-2 text-on-surface">
                {item.restockCycle}
                {parseRestockCycleDays(item.restockCycle) !== undefined && (
                  <button
                    type="button"
                    onClick={() =>
                      updateItem(item.id, { restockedAt: new Date().toISOString().slice(0, 10) })
                    }
                    className="rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm text-on-surface"
                  >
                    재구매함
                  </button>
                )}
              </dd>
            </div>
          )}
```

- [ ] **Step 3: Run TypeScript compiler and existing test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors, all tests pass (no new automated tests for this task — it's two small JSX/button additions with no branching logic beyond what Task 1 already covers via `parseRestockCycleDays`).

- [ ] **Step 4: Manual verification**

Start the dev server (`npm run dev`), then in the browser:
1. Create an item with the "약 45일마다" preset cycle.
2. Confirm it does NOT appear on `/notifications` yet (cycle not due).
3. Temporarily set the item's `createdAt` far enough in the past (via devtools localStorage edit, or by editing `NewItemPage`'s `CYCLE_PRESETS` test value if easier) to make it due, reload, and confirm it appears on `/notifications` with a correct D-day badge and a "재구매함" button.
4. Click "재구매함" — confirm the item disappears from the notification list (or its D-day resets) and `restockedAt` is now today's date in `localStorage`.
5. Open the item's detail page and confirm the same "재구매함" button appears next to "재구매 주기" and behaves the same way.
6. Confirm an item with a custom/free-text restock cycle (not a preset) shows NO "재구매함" button anywhere.

- [ ] **Step 5: Commit**

```bash
git add src/pages/NotificationsPage.tsx src/pages/ItemDetailPage.tsx
git commit -m "feat: add 재구매함 reset button to notifications and item detail

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
