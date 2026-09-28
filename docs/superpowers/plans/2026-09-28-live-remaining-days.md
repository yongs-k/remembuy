# Live Remaining-Days Calculation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every "D-N days until empty" display and filter computed live from `Item.createdAt` instead of showing the stale number the user typed once at creation — the smallest possible slice of the product roadmap's Phase 3 "rule-based nudge" idea.

**Architecture:** Two new pure functions (`getRemainingDays`, `formatDday`) in `src/state/selectors.ts`, TDD'd against the existing `src/state/selectors.test.ts`. `getUpcomingNotifications` (same file) switches to computing live values internally. Seven UI call sites across components/pages then swap their direct `item.daysUntilEmpty` reads for `getRemainingDays(item)` + `formatDday(...)` — purely mechanical, no new UI logic, no new test files (none of the seven have one today).

**Correction (found during Task 1's review, before Task 2 was dispatched):** the design spec's read-site list missed `src/pages/NotificationsPage.tsx`, which has the identical `urgent`/`D-{item.daysUntilEmpty}` pattern as the other six sites. It's added to Task 2 below as a 7th site. `src/components/AppLayout.tsx` also calls `getUpcomingNotifications` but only for a count/badge — no direct `daysUntilEmpty` read there, so it needs no change.

**Tech Stack:** TypeScript, Vitest. No new dependency.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-28-live-remaining-days-design.md`.
- `Item.createdAt` is always `YYYY-MM-DD` (no time-of-day component) — date-only arithmetic is exact, no timezone handling needed.
- `Item.daysUntilEmpty` keeps its current meaning ("estimate given at creation time") and storage — only how it's *read* changes. No `Item`/`src/types.ts` change.
- Negative remaining days are shown accurately as `D+N` (N days overdue), never clamped to zero.
- No change to `NewItemPage.tsx`'s input side, `restockCycle`, or `FamilyMember`/`src/data/familyData.ts`.
- `npx tsc --noEmit` clean and `npx vitest run` green after every task (116 tests before this plan).
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## File Structure

```
src/state/selectors.ts        # Modify: add getRemainingDays, formatDday; update getUpcomingNotifications
src/state/selectors.test.ts   # Modify: new tests + fix getUpcomingNotifications's existing test
src/components/ItemCard.tsx           # Modify
src/components/CategoryChecklist.tsx  # Modify
src/components/PodiumItemCard.tsx     # Modify
src/components/ButlerHero.tsx         # Modify
src/pages/HomePage.tsx                # Modify
src/pages/PurchasePage.tsx            # Modify
src/pages/NotificationsPage.tsx       # Modify
```

---

### Task 1: `getRemainingDays` + `formatDday`, and live-ify `getUpcomingNotifications`

**Files:**
- Modify: `src/state/selectors.ts`, `src/state/selectors.test.ts`

**Interfaces:**
- Produces: `getRemainingDays(item: Item, today?: string) => number | undefined`;
  `formatDday(days: number) => string`. `getUpcomingNotifications`'s
  signature gains an optional third parameter:
  `getUpcomingNotifications(items: Item[], thresholdDays?: number, today?: string) => Item[]`
  (return type and the first two parameters are unchanged — later tasks
  that call it with just `(items, thresholdDays)` need no change).

- [ ] **Step 1: Write the failing tests**

Find this test in `src/state/selectors.test.ts` (around line 126):

```ts
describe('getUpcomingNotifications', () => {
  it('returns only items within the threshold, sorted ascending', () => {
    const items = [
      makeItem({ id: 'i1', daysUntilEmpty: 10 }),
      makeItem({ id: 'i2', daysUntilEmpty: 2 }),
      makeItem({ id: 'i3', daysUntilEmpty: 5 }),
      makeItem({ id: 'i4', recommendation: 'recommend' }),
    ]
    const result = getUpcomingNotifications(items, 7)
    expect(result.map((i) => i.id)).toEqual(['i2', 'i3'])
  })
})
```

Replace it with (the added `'2026-09-01'` — matching `makeItem`'s default
`createdAt` — keeps this test's elapsed-days at exactly 0, so it still
tests the same "filter by stored value" behavior unchanged, plus a new
case proving the *live* value drives inclusion, not the stored one):

```ts
describe('getUpcomingNotifications', () => {
  it('returns only items within the threshold, sorted ascending', () => {
    const items = [
      makeItem({ id: 'i1', daysUntilEmpty: 10 }),
      makeItem({ id: 'i2', daysUntilEmpty: 2 }),
      makeItem({ id: 'i3', daysUntilEmpty: 5 }),
      makeItem({ id: 'i4', recommendation: 'recommend' }),
    ]
    const result = getUpcomingNotifications(items, 7, '2026-09-01')
    expect(result.map((i) => i.id)).toEqual(['i2', 'i3'])
  })

  it('includes an item whose stored value is above the threshold but whose live value has dropped into it', () => {
    const items = [makeItem({ id: 'i1', daysUntilEmpty: 10, createdAt: '2026-09-01' })]
    // 5 days have passed since createdAt, so the live remaining value is
    // 10 - 5 = 5, which is within a threshold of 7 even though the
    // stored 10 is not.
    const result = getUpcomingNotifications(items, 7, '2026-09-06')
    expect(result.map((i) => i.id)).toEqual(['i1'])
  })
})
```

Add this new `describe` block anywhere after the imports (e.g. right
before `describe('getUpcomingNotifications', ...)`):

```ts
describe('getRemainingDays', () => {
  it('returns undefined when the item has no daysUntilEmpty', () => {
    const item = makeItem({ id: 'i1' })
    expect(getRemainingDays(item, '2026-09-05')).toBeUndefined()
  })

  it('returns the stored value unchanged when today equals createdAt', () => {
    const item = makeItem({ id: 'i1', daysUntilEmpty: 7, createdAt: '2026-09-01' })
    expect(getRemainingDays(item, '2026-09-01')).toBe(7)
  })

  it('subtracts elapsed days from the stored value', () => {
    const item = makeItem({ id: 'i1', daysUntilEmpty: 7, createdAt: '2026-09-01' })
    expect(getRemainingDays(item, '2026-09-04')).toBe(4)
  })

  it('returns a negative number once the estimate has passed', () => {
    const item = makeItem({ id: 'i1', daysUntilEmpty: 7, createdAt: '2026-09-01' })
    expect(getRemainingDays(item, '2026-09-11')).toBe(-3)
  })
})

describe('formatDday', () => {
  it('formats zero and positive numbers as D-N', () => {
    expect(formatDday(0)).toBe('D-0')
    expect(formatDday(7)).toBe('D-7')
  })

  it('formats negative numbers as D+N (absolute value)', () => {
    expect(formatDday(-3)).toBe('D+3')
  })
})
```

Find the existing import block (around line 1):

```ts
import { describe, it, expect } from 'vitest'
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
} from './selectors'
```

Replace with:

```ts
import { describe, it, expect } from 'vitest'
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
} from './selectors'
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/state/selectors.test.ts`
Expected: FAIL — `getRemainingDays`/`formatDday` don't exist yet, and
the two `getUpcomingNotifications` tests fail because that function
doesn't yet accept a `today` parameter (it currently reads the stored
value directly, so passing `today` has no effect and the new "live value
drops into threshold" case returns nothing).

- [ ] **Step 3: Implement in `src/state/selectors.ts`**

Find:

```ts
export function getUpcomingNotifications(items: Item[], thresholdDays = 7): Item[] {
  return items
    .filter((i) => i.daysUntilEmpty !== undefined && i.daysUntilEmpty <= thresholdDays)
    .slice()
    .sort((a, b) => (a.daysUntilEmpty as number) - (b.daysUntilEmpty as number))
}
```

Replace with:

```ts
export function getRemainingDays(item: Item, today: string = new Date().toISOString().slice(0, 10)): number | undefined {
  if (item.daysUntilEmpty === undefined) return undefined
  const elapsedDays = Math.round(
    (new Date(today).getTime() - new Date(item.createdAt).getTime()) / 86_400_000
  )
  return item.daysUntilEmpty - elapsedDays
}

export function formatDday(days: number): string {
  return days >= 0 ? `D-${days}` : `D+${Math.abs(days)}`
}

export function getUpcomingNotifications(items: Item[], thresholdDays = 7, today?: string): Item[] {
  return items
    .map((item) => ({ item, remaining: getRemainingDays(item, today) }))
    .filter((entry): entry is { item: Item; remaining: number } => entry.remaining !== undefined)
    .filter((entry) => entry.remaining <= thresholdDays)
    .sort((a, b) => a.remaining - b.remaining)
    .map((entry) => entry.item)
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/state/selectors.test.ts` — expected PASS (all
tests in this file, including the 8 new/modified ones).

- [ ] **Step 5: Commit**

```bash
git add src/state/selectors.ts src/state/selectors.test.ts
git commit -m "feat: compute remaining-days live from createdAt instead of a stale stored number"
```

---

### Task 2: Wire the seven UI read-sites to the live value

**Files:**
- Modify: `src/components/ItemCard.tsx`, `src/components/CategoryChecklist.tsx`, `src/components/PodiumItemCard.tsx`, `src/components/ButlerHero.tsx`, `src/pages/HomePage.tsx`, `src/pages/PurchasePage.tsx`, `src/pages/NotificationsPage.tsx`

**Interfaces:**
- Consumes: `getRemainingDays(item, today?)`, `formatDday(days)` (Task 1).

None of these seven files have an existing test file (confirmed absent
from `src/components/*.test.tsx` and `src/pages/*.test.tsx` for all
seven) — this task is verified by `tsc` + the full `vitest` suite staying
green, not by new failing tests.

- [ ] **Step 1: `src/components/ItemCard.tsx`**

Find:

```tsx
import type { Item } from '../types'
import { Icon } from '../data/materialIcons'
import { RecommendationBadge } from './RecommendationBadge'

export function ItemCard({ item, onClick }: { item: Item; onClick: () => void }) {
  const urgent = item.daysUntilEmpty !== undefined && item.daysUntilEmpty <= 7
```

Replace with:

```tsx
import type { Item } from '../types'
import { Icon } from '../data/materialIcons'
import { RecommendationBadge } from './RecommendationBadge'
import { getRemainingDays, formatDday } from '../state/selectors'

export function ItemCard({ item, onClick }: { item: Item; onClick: () => void }) {
  const remaining = getRemainingDays(item)
  const urgent = remaining !== undefined && remaining <= 7
```

Find:

```tsx
        ) : item.daysUntilEmpty !== undefined ? (
          <span
            className={`self-start rounded px-1.5 py-0.5 text-label-sm ${
              urgent
                ? 'bg-error-container text-on-error-container'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            D-{item.daysUntilEmpty}
          </span>
        ) : null}
```

Replace with:

```tsx
        ) : remaining !== undefined ? (
          <span
            className={`self-start rounded px-1.5 py-0.5 text-label-sm ${
              urgent
                ? 'bg-error-container text-on-error-container'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {formatDday(remaining)}
          </span>
        ) : null}
```

- [ ] **Step 2: `src/components/CategoryChecklist.tsx`**

Find:

```tsx
import type { Category, Item } from '../types'
import { getCategoryCompletion, getMissingMasterItems } from '../state/selectors'
import { Icon } from '../data/materialIcons'
```

Replace with:

```tsx
import type { Category, Item } from '../types'
import { getCategoryCompletion, getMissingMasterItems, getRemainingDays, formatDday } from '../state/selectors'
import { Icon } from '../data/materialIcons'
```

Find:

```tsx
          const urgent = item?.daysUntilEmpty !== undefined && item.daysUntilEmpty <= 7
```

Replace with:

```tsx
          const remaining = item ? getRemainingDays(item) : undefined
          const urgent = remaining !== undefined && remaining <= 7
```

Find:

```tsx
                  {item?.daysUntilEmpty !== undefined && (
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-label-sm ${
                        urgent
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      D-{item.daysUntilEmpty}
                    </span>
                  )}
```

Replace with:

```tsx
                  {remaining !== undefined && (
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-label-sm ${
                        urgent
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {formatDday(remaining)}
                    </span>
                  )}
```

- [ ] **Step 3: `src/components/PodiumItemCard.tsx`**

Find:

```tsx
import type { Item } from '../types'
import { Icon } from '../data/materialIcons'
import { RecommendationBadge } from './RecommendationBadge'
import { Badge } from './Badge'
```

Replace with:

```tsx
import type { Item } from '../types'
import { Icon } from '../data/materialIcons'
import { RecommendationBadge } from './RecommendationBadge'
import { Badge } from './Badge'
import { getRemainingDays, formatDday } from '../state/selectors'
```

Find:

```tsx
  const isFirst = index === 0
  const compact = index >= 3
  const urgent = item.daysUntilEmpty !== undefined && item.daysUntilEmpty <= 7
  const chip = RANK_CHIP[index] ?? 'bg-surface-container-high text-outline'
```

Replace with:

```tsx
  const isFirst = index === 0
  const compact = index >= 3
  const remaining = getRemainingDays(item)
  const urgent = remaining !== undefined && remaining <= 7
  const chip = RANK_CHIP[index] ?? 'bg-surface-container-high text-outline'
```

Find:

```tsx
            {item.daysUntilEmpty !== undefined && (
              <span
                className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-label-sm ${
                  urgent
                    ? 'bg-error-container text-on-error-container'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <Icon name="alarm" className="text-[12px]" />
                D-{item.daysUntilEmpty}
                {urgent ? ' 소진임박' : ''}
              </span>
            )}
```

Replace with:

```tsx
            {remaining !== undefined && (
              <span
                className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-label-sm ${
                  urgent
                    ? 'bg-error-container text-on-error-container'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <Icon name="alarm" className="text-[12px]" />
                {formatDday(remaining)}
                {urgent ? ' 소진임박' : ''}
              </span>
            )}
```

- [ ] **Step 4: `src/components/ButlerHero.tsx`**

Find:

```tsx
import { Icon } from '../data/materialIcons'
import { DUMMY_BUTLER, percentOff } from '../data/purchaseDummy'
```

Replace with:

```tsx
import { Icon } from '../data/materialIcons'
import { DUMMY_BUTLER, percentOff } from '../data/purchaseDummy'
import { formatDday } from '../state/selectors'
```

Find:

```tsx
            {greetingName}, {locationName} 도감의 {itemName} —{' '}
            <strong className="text-primary">{daysUntilEmpty}일 뒤</strong> 바닥나요! 지금 역대 최저가
            근접이라 미리 채워두는 걸 추천해요.
```

Replace with:

```tsx
            {greetingName}, {locationName} 도감의 {itemName} —{' '}
            <strong className="text-primary">{formatDday(daysUntilEmpty)}</strong> 바닥나요! 지금 역대 최저가
            근접이라 미리 채워두는 걸 추천해요.
```

Find:

```tsx
            <Icon name="alarm" className="text-[12px]" />D-{daysUntilEmpty} 소진임박
```

Replace with:

```tsx
            <Icon name="alarm" className="text-[12px]" />{formatDday(daysUntilEmpty)} 소진임박
```

(`ButlerHero`'s `daysUntilEmpty` prop keeps its name and `number` type —
it's a presentational component that receives an already-computed
number from its caller, not a raw `Item`; the first text spot's copy
changes from "{N}일 뒤" to the `formatDday` badge text, which reads
naturally in context — "D-7 바닥나요" — and correctly also degrades to
"D+3 바닥나요" for the overdue case instead of the nonsensical
"-3일 뒤 바닥나요" the old template would have produced once
`PurchasePage` stops clamping in Step 6 below.)

- [ ] **Step 5: `src/pages/HomePage.tsx`**

Find:

```tsx
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getLocationCompletion } from '../state/selectors'
```

Replace with:

```tsx
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getLocationCompletion, getRemainingDays } from '../state/selectors'
```

Find:

```tsx
      if (filter === 'urgent' && !(item.daysUntilEmpty !== undefined && item.daysUntilEmpty <= 7))
        return false
```

Replace with:

```tsx
      if (filter === 'urgent') {
        const remaining = getRemainingDays(item)
        if (!(remaining !== undefined && remaining <= 7)) return false
      }
```

- [ ] **Step 6: `src/pages/PurchasePage.tsx`**

Find:

```tsx
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications } from '../state/selectors'
```

Replace with:

```tsx
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications, getRemainingDays } from '../state/selectors'
```

Find:

```tsx
  const heroDays = Math.max(0, urgent?.daysUntilEmpty ?? fallback.daysUntilEmpty)
```

Replace with:

```tsx
  const heroDays = urgent ? (getRemainingDays(urgent) ?? fallback.daysUntilEmpty) : fallback.daysUntilEmpty
```

(Drops the `Math.max(0, ...)` clamp per this plan's negative-display
decision — an overdue real item now shows the "AI 비서" hero as
overdue instead of floored at "D-0". `getRemainingDays(urgent)` can only
be `undefined` if `urgent.daysUntilEmpty` itself is `undefined`, which
can't happen here since `urgent` came from `getUpcomingNotifications`,
whose filter already requires a defined `daysUntilEmpty` — the `?? 
fallback.daysUntilEmpty` is defensive, not reachable in practice, same
as the original code's own implicit assumption.)

- [ ] **Step 7: `src/pages/NotificationsPage.tsx`**

Find:

```tsx
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications } from '../state/selectors'
import { useSeenNotifications } from '../hooks/useSeenNotifications'
import { Icon } from '../data/materialIcons'
```

Replace with:

```tsx
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications, getRemainingDays, formatDday } from '../state/selectors'
import { useSeenNotifications } from '../hooks/useSeenNotifications'
import { Icon } from '../data/materialIcons'
```

Find:

```tsx
          {upcoming.map((item) => {
            const urgent = item.daysUntilEmpty !== undefined && item.daysUntilEmpty <= 7
            return (
```

Replace with:

```tsx
          {upcoming.map((item) => {
            const remaining = getRemainingDays(item)
            const urgent = remaining !== undefined && remaining <= 7
            return (
```

Find:

```tsx
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-label-sm ${
                      urgent
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    D-{item.daysUntilEmpty}
                  </span>
```

Replace with:

```tsx
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-label-sm ${
                      urgent
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {remaining !== undefined ? formatDday(remaining) : null}
                  </span>
```

(`remaining` is guaranteed defined here in practice — `upcoming` comes
from `getUpcomingNotifications`, whose filter already excludes items
with no `daysUntilEmpty` — the ternary only guards TypeScript's
`number | undefined` type, matching the same defensive pattern used for
`heroDays` in Step 6.)

- [ ] **Step 8: Run full verification**

Run: `npx tsc --noEmit` — expected clean.
Run: `npx vitest run` — expected PASS, 123/123 (116 baseline + Task 1's
7 net-new tests; this task adds no new test files).

- [ ] **Step 9: Commit**

```bash
git add src/components/ItemCard.tsx src/components/CategoryChecklist.tsx src/components/PodiumItemCard.tsx src/components/ButlerHero.tsx src/pages/HomePage.tsx src/pages/PurchasePage.tsx src/pages/NotificationsPage.tsx
git commit -m "feat: wire item cards, home/purchase/notifications, and the AI butler hero to live remaining-days"
```

---

Related: `docs/superpowers/specs/2026-09-28-live-remaining-days-design.md`,
`docs/product-roadmap.md`.
