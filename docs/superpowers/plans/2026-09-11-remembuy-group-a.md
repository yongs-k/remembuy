# REMEMBUY Phase 2 Group A (UI/UX 개선) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the star-rating system with a recommend/not-recommend toggle, add price + a real "구매하기" purchase link, restructure Home and Ranking into location→category→product drill-downs, move Notifications off the bottom tab bar into an unread-badged bell icon, and give each location its own emoji — all on top of the already-merged REMEMBUY MVP, with zero backend/AI dependencies.

**Architecture:** This is a set of modifications to the existing Vite+React+TypeScript SPA (no new subsystems). The `Item.rating` field and its `RatingStars` display component are replaced by `Item.recommendation` and two new components (`RecommendationBadge` for display, `RecommendationToggle` for interactive editing). A new `price` field and a new localStorage-backed `useSeenNotifications` hook are added. `HomePage` and `RankingPage` are rewritten as internal drill-down state machines (no new routes — same 8 routes as the MVP). `AppLayout` gains a header with a notification bell and loses the bottom "알림" tab.

**Tech Stack:** Same as the MVP — Vite, React 18, TypeScript, Tailwind CSS, react-router-dom, Vitest + @testing-library/react.

## Global Constraints

- `Item.recommendation?: 'recommend' | 'notRecommend'` replaces `Item.rating?: number` entirely. It remains mutually exclusive with `Item.daysUntilEmpty` (never set both).
- `Item.price?: number` is new — user-entered only, no AI/external lookup in this plan.
- The "다시 담기" concept is removed everywhere. The single remaining action is **"구매하기"**, linked to `Item.affiliateUrl` (disabled/no-link state if absent).
- Ranking sort order (used by `getRankingForCategory` and the Ranking screen): `recommend` items first, then `notRecommend`, then unrated — never by a numeric score.
- Ranking screen (`/ranking`) is a 3-level drill-down: locations (sorted by saved-item count, descending) → categories within that location (sorted by registered-item count, descending) → product ranking for that category. The old flat "category chip" selector UI is removed entirely.
- Home screen (`/`) is a 3-level drill-down: locations (grid, no "전체" tile) → categories within that location (tile grid) → product list with filter tabs (전체 / 임박만 / 추천한 상품만). Search overrides all drill-down levels and searches every item by name.
- Each location gets a distinct emoji (via `LOCATION_EMOJI`), replacing the generic 📦 used inside `LocationIcon`. `CollectionPage`'s own icon usage is explicitly out of scope for this plan (design decision: collection screen unchanged).
- Bottom tab bar drops from 6 to 5 tabs (홈/랭킹/공유/가족/컬렉션) — 알림 is removed. `AppLayout` gains a header row with a bell icon linking to `/notifications`, showing a small red dot when there is at least one unread (unseen) urgent item.
- "Read" tracking is a separate, item-agnostic localStorage list (`remembuy:seenNotificationIds`) populated when `/notifications` is viewed — it is not part of `LockerContext`'s `Item`/`Location`/`Category` state.
- `/feed`, `/family`, `/collection` pages are unchanged by this plan.
- No backend, no AI/photo/link-based input, no multi-user data — confirmed explicitly out of scope (deferred to Group B/C).

---

## File Structure

```
src/
  types.ts                              # Modify: Item.rating -> recommendation, add price
  data/
    seedItems.ts                        # Modify: rating -> recommendation migration
    seedItems.test.ts                   # Modify: rating -> recommendation assertions
    locationEmoji.ts                    # Create: per-location emoji map
  state/
    selectors.ts                        # Modify: recommendation-based ranking sort + 2 new selectors
    selectors.test.ts                   # Modify + extend
  hooks/
    useSeenNotifications.ts             # Create
    useSeenNotifications.test.ts        # Create
  components/
    RecommendationBadge.tsx             # Create (display-only)
    RecommendationToggle.tsx            # Create (interactive)
    RatingStars.tsx                     # Delete (Task 10, last consumer removed)
    ItemCard.tsx                        # Modify: use RecommendationBadge
    LocationIcon.tsx                    # Modify: use LOCATION_EMOJI
    AppLayout.tsx                       # Modify: header+bell, 5-tab bar
  pages/
    NotificationsPage.tsx               # Modify: read-tracking, "구매하기" label
    ItemDetailPage.tsx                  # Modify: toggle, price, buy button, related items
    NewItemPage.tsx                     # Modify: toggle, price input, affiliateUrl input
    RankingPage.tsx                     # Modify: full drill-down rewrite
    HomePage.tsx                        # Modify: full drill-down rewrite
```

---

### Task 1: Data model migration — `recommendation` replaces `rating`

**Files:**
- Modify: `src/types.ts`
- Modify: `src/data/seedItems.ts`
- Modify: `src/data/seedItems.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Item.recommendation?: 'recommend' | 'notRecommend'` and `Item.price?: number`, consumed by every later task in this plan. `Item.rating` no longer exists anywhere in the codebase after this task.

- [ ] **Step 1: Update `src/types.ts`**

Replace the `Item` type:

```ts
export type Item = {
  id: string
  name: string
  locationId: string
  categoryId: string
  masterItemId?: string
  note?: string
  recommendation?: 'recommend' | 'notRecommend' // mutually exclusive with daysUntilEmpty
  daysUntilEmpty?: number
  price?: number
  place?: string
  restockCycle?: string | null
  affiliateUrl?: string | null
  createdAt: string
}
```

(Only the `rating` line is removed and replaced by the `recommendation` line plus the new `price` line; `Location`, `MasterItem`, `Category`, `FeedPost`, `FamilyMember` are unchanged.)

- [ ] **Step 2: Update `src/data/seedItems.test.ts`**

Replace the `'never sets both rating and daysUntilEmpty'` test and add two new tests:

```ts
import { describe, it, expect } from 'vitest'
import { LOCATIONS, CATEGORIES } from './locations'
import { SEED_ITEMS } from './seedItems'

describe('seed items', () => {
  it('every seed item references a real location and category', () => {
    const locationIds = new Set(LOCATIONS.map((l) => l.id))
    const categoryIds = new Set(CATEGORIES.map((c) => c.id))
    for (const item of SEED_ITEMS) {
      expect(locationIds.has(item.locationId)).toBe(true)
      expect(categoryIds.has(item.categoryId)).toBe(true)
    }
  })

  it('never sets both recommendation and daysUntilEmpty', () => {
    for (const item of SEED_ITEMS) {
      const hasBoth = item.recommendation !== undefined && item.daysUntilEmpty !== undefined
      expect(hasBoth).toBe(false)
    }
  })

  it('recommendation is only ever "recommend" or "notRecommend" when set', () => {
    for (const item of SEED_ITEMS) {
      if (item.recommendation !== undefined) {
        expect(['recommend', 'notRecommend']).toContain(item.recommendation)
      }
    }
  })

  it('includes at least one notRecommend item for testing variety', () => {
    expect(SEED_ITEMS.some((i) => i.recommendation === 'notRecommend')).toBe(true)
  })

  it('every referenced masterItemId exists in its category', () => {
    const categoryById = new Map(CATEGORIES.map((c) => [c.id, c]))
    for (const item of SEED_ITEMS) {
      if (!item.masterItemId) continue
      const category = categoryById.get(item.categoryId)!
      const found = category.masterItems.some((m) => m.id === item.masterItemId)
      expect(found).toBe(true)
    }
  })

  it('covers every location with at least one item', () => {
    const coveredLocations = new Set(SEED_ITEMS.map((i) => i.locationId))
    for (const location of LOCATIONS) {
      expect(coveredLocations.has(location.id)).toBe(true)
    }
  })

  it('has unique item ids', () => {
    const ids = SEED_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/data/seedItems.test.ts`
Expected: FAIL — seed items still use `rating`, so `recommendation` is always `undefined` and the "includes at least one notRecommend item" assertion fails (`some(...)` is `false`).

- [ ] **Step 4: Update `src/data/seedItems.ts`**

Replace every `rating: N,` line with `recommendation: 'recommend',` or `recommendation: 'notRecommend',` per this exact mapping (rating >= 4 → recommend, rating <= 3 → notRecommend; items already using `daysUntilEmpty` are untouched):

| id | old `rating` | new field |
|---|---|---|
| seed-1 | 5 | `recommendation: 'recommend'` |
| seed-2 | (daysUntilEmpty: 5) | unchanged |
| seed-3 | 4 | `recommendation: 'recommend'` |
| seed-4 | 5 | `recommendation: 'recommend'` |
| seed-5 | (daysUntilEmpty: 3) | unchanged |
| seed-6 | 4 | `recommendation: 'recommend'` |
| seed-7 | 5 | `recommendation: 'recommend'` |
| seed-8 | 3 | `recommendation: 'notRecommend'` |
| seed-9 | 5 | `recommendation: 'recommend'` |
| seed-10 | (daysUntilEmpty: 10) | unchanged |
| seed-11 | 5 | `recommendation: 'recommend'` |
| seed-12 | 5 | `recommendation: 'recommend'` |
| seed-13 | 4 | `recommendation: 'recommend'` |
| seed-14 | (daysUntilEmpty: 20) | unchanged |
| seed-15 | 3 | `recommendation: 'notRecommend'` |
| seed-16 | 4 | `recommendation: 'recommend'` |
| seed-17 | 4 | `recommendation: 'recommend'` |
| seed-18 | 5 | `recommendation: 'recommend'` |
| seed-19 | (daysUntilEmpty: 15) | unchanged |
| seed-20 | 4 | `recommendation: 'recommend'` |

For example, `seed-1` changes from:
```ts
    note: '올해 세 번째 재구매',
    rating: 5,
    place: '올리브영',
```
to:
```ts
    note: '올해 세 번째 재구매',
    recommendation: 'recommend',
    place: '올리브영',
```
Apply the same field-name/value substitution (keeping the line's position) to every item in the table above. Do not change `id`, `name`, `locationId`, `categoryId`, `masterItemId`, `place`, `restockCycle`, `affiliateUrl`, or `createdAt` on any item.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/seedItems.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 6: Verify the whole project still compiles**

Run: `npx tsc --noEmit`
Expected: FAILS at this point — `src/components/ItemCard.tsx`, `src/pages/ItemDetailPage.tsx`, `src/pages/RankingPage.tsx`, and `src/pages/NewItemPage.tsx` all reference `item.rating` (or `existing?.rating`), which no longer exists on `Item`. (`src/components/RatingStars.tsx` itself does NOT error — it only takes a plain `{ rating: number }` prop and never references the `Item` type.) This is expected and will be fixed by later tasks in this plan — do not fix those files in this task.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/data/seedItems.ts src/data/seedItems.test.ts
git commit -m "feat: replace Item.rating with Item.recommendation, add Item.price"
```

---

### Task 2: Selectors — recommendation-based ranking + item-count rankings

**Files:**
- Modify: `src/state/selectors.ts`
- Modify: `src/state/selectors.test.ts`

**Interfaces:**
- Consumes: `Item`, `Location`, `Category` from `src/types.ts` (Task 1 for `Item`).
- Produces: `getRankingForCategory` re-sorted by recommendation; new `getLocationsRankedByItemCount(items, locations): Array<{ location: Location; itemCount: number }>` and `getCategoriesRankedByItemCount(items, categories, locationId): Array<{ category: Category; itemCount: number }>`, consumed by `RankingPage` (Task 10).

- [ ] **Step 1: Update `src/state/selectors.test.ts`**

Replace the `getRankingForCategory` describe block and add two new describe blocks at the end of the file:

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
} from './selectors'
import type { Category, Item, Location } from '../types'

const category: Category = {
  id: 'cat-1',
  locationId: 'loc-1',
  name: '테스트 카테고리',
  masterItems: [
    { id: 'm1', name: '샴푸' },
    { id: 'm2', name: '린스' },
    { id: 'm3', name: '트리트먼트' },
    { id: 'm4', name: '에센스' },
  ],
}

const category2: Category = {
  id: 'cat-2',
  locationId: 'loc-1',
  name: '카테고리2',
  masterItems: [
    { id: 'm5', name: 'A' },
    { id: 'm6', name: 'B' },
  ],
}

function makeItem(overrides: Partial<Item>): Item {
  return {
    id: overrides.id ?? 'i1',
    name: overrides.name ?? '상품',
    locationId: overrides.locationId ?? 'loc-1',
    categoryId: overrides.categoryId ?? 'cat-1',
    createdAt: '2026-09-01',
    ...overrides,
  }
}

describe('getCategoryCompletion', () => {
  it('returns 0 when no items match', () => {
    expect(getCategoryCompletion([], category)).toBe(0)
  })

  it('returns percentage of unique master items covered', () => {
    const items = [
      makeItem({ id: 'i1', masterItemId: 'm1' }),
      makeItem({ id: 'i2', masterItemId: 'm2' }),
    ]
    expect(getCategoryCompletion(items, category)).toBe(50)
  })

  it('does not double-count duplicate master item matches', () => {
    const items = [
      makeItem({ id: 'i1', masterItemId: 'm1' }),
      makeItem({ id: 'i2', masterItemId: 'm1' }),
    ]
    expect(getCategoryCompletion(items, category)).toBe(25)
  })

  it('ignores items without a masterItemId', () => {
    const items = [makeItem({ id: 'i1', masterItemId: undefined })]
    expect(getCategoryCompletion(items, category)).toBe(0)
  })
})

describe('getLocationCompletion', () => {
  it('averages completion across the location categories', () => {
    const items = [
      makeItem({ id: 'i1', categoryId: 'cat-1', masterItemId: 'm1' }),
      makeItem({ id: 'i2', categoryId: 'cat-2', masterItemId: 'm5' }),
    ]
    const completion = getLocationCompletion(items, 'loc-1', [category, category2])
    expect(completion).toBe(38)
  })
})

describe('getMissingMasterItems', () => {
  it('returns master items with no owned match', () => {
    const items = [makeItem({ id: 'i1', masterItemId: 'm1' })]
    const missing = getMissingMasterItems(items, category)
    expect(missing.map((m) => m.id)).toEqual(['m2', 'm3', 'm4'])
  })
})

describe('getRankingForCategory', () => {
  it('sorts recommend first, then notRecommend, then unrated', () => {
    const items = [
      makeItem({ id: 'i1', categoryId: 'cat-1', recommendation: 'notRecommend' }),
      makeItem({ id: 'i2', categoryId: 'cat-1', recommendation: 'recommend' }),
      makeItem({ id: 'i3', categoryId: 'cat-1' }),
      makeItem({ id: 'i4', categoryId: 'other-cat', recommendation: 'recommend' }),
    ]
    const ranked = getRankingForCategory(items, 'cat-1')
    expect(ranked.map((i) => i.id)).toEqual(['i2', 'i1', 'i3'])
  })
})

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

describe('getLocationsRankedByItemCount', () => {
  it('sorts locations by item count descending', () => {
    const locA: Location = { id: 'loc-a', name: 'A', colorToken: 'a' }
    const locB: Location = { id: 'loc-b', name: 'B', colorToken: 'b' }
    const items = [
      makeItem({ id: 'i1', locationId: 'loc-a' }),
      makeItem({ id: 'i2', locationId: 'loc-b' }),
      makeItem({ id: 'i3', locationId: 'loc-b' }),
    ]
    const ranked = getLocationsRankedByItemCount(items, [locA, locB])
    expect(ranked.map((r) => r.location.id)).toEqual(['loc-b', 'loc-a'])
    expect(ranked.map((r) => r.itemCount)).toEqual([2, 1])
  })

  it('includes locations with zero items at the end', () => {
    const locA: Location = { id: 'loc-a', name: 'A', colorToken: 'a' }
    const locB: Location = { id: 'loc-b', name: 'B', colorToken: 'b' }
    const items = [makeItem({ id: 'i1', locationId: 'loc-a' })]
    const ranked = getLocationsRankedByItemCount(items, [locA, locB])
    expect(ranked.map((r) => r.location.id)).toEqual(['loc-a', 'loc-b'])
    expect(ranked.map((r) => r.itemCount)).toEqual([1, 0])
  })
})

describe('getCategoriesRankedByItemCount', () => {
  it('sorts a location categories by item count descending', () => {
    const items = [
      makeItem({ id: 'i1', categoryId: 'cat-1' }),
      makeItem({ id: 'i2', categoryId: 'cat-2' }),
      makeItem({ id: 'i3', categoryId: 'cat-2' }),
    ]
    const ranked = getCategoriesRankedByItemCount(items, [category, category2], 'loc-1')
    expect(ranked.map((r) => r.category.id)).toEqual(['cat-2', 'cat-1'])
    expect(ranked.map((r) => r.itemCount)).toEqual([2, 1])
  })

  it('excludes categories belonging to a different location', () => {
    const otherCategory: Category = {
      id: 'cat-3',
      locationId: 'loc-2',
      name: '다른 장소 카테고리',
      masterItems: [],
    }
    const items = [makeItem({ id: 'i1', categoryId: 'cat-3' })]
    const ranked = getCategoriesRankedByItemCount(
      items,
      [category, category2, otherCategory],
      'loc-1'
    )
    expect(ranked.map((r) => r.category.id)).toEqual(['cat-1', 'cat-2'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/selectors.test.ts`
Expected: FAIL — `getLocationsRankedByItemCount`/`getCategoriesRankedByItemCount` are not exported yet, and the recommendation-based ranking test fails against the current rating-based sort.

- [ ] **Step 3: Update `src/state/selectors.ts`**

```ts
import type { Category, Item, Location, MasterItem } from '../types'

export function getCategoryCompletion(items: Item[], category: Category): number {
  if (category.masterItems.length === 0) return 0
  const owned = new Set(
    items
      .filter((i) => i.categoryId === category.id && i.masterItemId)
      .map((i) => i.masterItemId as string)
  )
  const coveredCount = category.masterItems.filter((m) => owned.has(m.id)).length
  return Math.round((coveredCount / category.masterItems.length) * 100)
}

export function getLocationCompletion(
  items: Item[],
  locationId: string,
  categories: Category[]
): number {
  const locationCategories = categories.filter((c) => c.locationId === locationId)
  if (locationCategories.length === 0) return 0
  const total = locationCategories.reduce(
    (sum, category) => sum + getCategoryCompletion(items, category),
    0
  )
  return Math.round(total / locationCategories.length)
}

export function getMissingMasterItems(items: Item[], category: Category): MasterItem[] {
  const owned = new Set(
    items
      .filter((i) => i.categoryId === category.id && i.masterItemId)
      .map((i) => i.masterItemId as string)
  )
  return category.masterItems.filter((m) => !owned.has(m.id))
}

function recommendationRank(item: Item): number {
  if (item.recommendation === 'recommend') return 0
  if (item.recommendation === 'notRecommend') return 1
  return 2
}

export function getRankingForCategory(items: Item[], categoryId: string): Item[] {
  return items
    .filter((i) => i.categoryId === categoryId)
    .slice()
    .sort((a, b) => recommendationRank(a) - recommendationRank(b))
}

export function getUpcomingNotifications(items: Item[], thresholdDays = 7): Item[] {
  return items
    .filter((i) => i.daysUntilEmpty !== undefined && i.daysUntilEmpty <= thresholdDays)
    .slice()
    .sort((a, b) => (a.daysUntilEmpty as number) - (b.daysUntilEmpty as number))
}

export function getLocationsRankedByItemCount(
  items: Item[],
  locations: Location[]
): Array<{ location: Location; itemCount: number }> {
  return locations
    .map((location) => ({
      location,
      itemCount: items.filter((i) => i.locationId === location.id).length,
    }))
    .sort((a, b) => b.itemCount - a.itemCount)
}

export function getCategoriesRankedByItemCount(
  items: Item[],
  categories: Category[],
  locationId: string
): Array<{ category: Category; itemCount: number }> {
  return categories
    .filter((c) => c.locationId === locationId)
    .map((category) => ({
      category,
      itemCount: items.filter((i) => i.categoryId === category.id).length,
    }))
    .sort((a, b) => b.itemCount - a.itemCount)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/selectors.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/state/selectors.ts src/state/selectors.test.ts
git commit -m "feat: sort ranking by recommendation, add item-count location/category selectors"
```

---

### Task 3: New display/interactive components + per-location emoji

**Files:**
- Create: `src/data/locationEmoji.ts`
- Create: `src/components/RecommendationBadge.tsx`
- Create: `src/components/RecommendationToggle.tsx`
- Modify: `src/components/LocationIcon.tsx`

**Interfaces:**
- Consumes: nothing domain-specific beyond `Location['colorToken']` (Task 1, unchanged).
- Produces: `LOCATION_EMOJI: Record<string, string>`; `<RecommendationBadge recommendation={'recommend'|'notRecommend'} />` (display); `<RecommendationToggle value={...} onChange={(v) => void} />` (interactive). Consumed by `ItemCard` (Task 4), `ItemDetailPage`/`NewItemPage` (Tasks 8-9), `RankingPage` (Task 10).

- [ ] **Step 1: Create `src/data/locationEmoji.ts`**

```ts
export const LOCATION_EMOJI: Record<string, string> = {
  bathroom: '🛁',
  kitchen: '🍳',
  laundry: '🧺',
  closet: '👕',
  vanity: '💄',
  bedroom: '🛏️',
  livingroom: '🛋️',
  entrance: '👞',
  medicine: '💊',
  car: '🚗',
}
```

- [ ] **Step 2: Create `src/components/RecommendationBadge.tsx`**

```tsx
export function RecommendationBadge({
  recommendation,
}: {
  recommendation: 'recommend' | 'notRecommend'
}) {
  if (recommendation === 'recommend') {
    return <span className="text-sm text-accent">👍 추천해요</span>
  }
  return <span className="text-sm text-ink/40">👎 비추천해요</span>
}
```

- [ ] **Step 3: Create `src/components/RecommendationToggle.tsx`**

```tsx
export function RecommendationToggle({
  value,
  onChange,
}: {
  value?: 'recommend' | 'notRecommend'
  onChange: (value: 'recommend' | 'notRecommend') => void
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange('recommend')}
        className={`flex-1 rounded-lg py-2 text-sm ${
          value === 'recommend' ? 'bg-accent text-white' : 'bg-card text-ink'
        }`}
      >
        👍 추천해요
      </button>
      <button
        type="button"
        onClick={() => onChange('notRecommend')}
        className={`flex-1 rounded-lg py-2 text-sm ${
          value === 'notRecommend' ? 'bg-stamp text-white' : 'bg-card text-ink'
        }`}
      >
        👎 비추천해요
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Modify `src/components/LocationIcon.tsx`**

```tsx
import { ProgressRing } from './ProgressRing'
import type { Location } from '../types'
import { LOCATION_COLOR_HEX } from '../data/locationColors'
import { LOCATION_EMOJI } from '../data/locationEmoji'

export function LocationIcon({
  location,
  percent,
  selected = false,
  onClick,
}: {
  location: Location
  percent: number
  selected?: boolean
  onClick?: () => void
}) {
  const color = LOCATION_COLOR_HEX[location.colorToken] ?? '#3F6459'
  const emoji = LOCATION_EMOJI[location.colorToken] ?? '📦'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 ${selected ? 'opacity-100' : 'opacity-80'}`}
    >
      <ProgressRing percent={percent} color={color} size={56} strokeWidth={4}>
        <span className="text-lg">{emoji}</span>
      </ProgressRing>
      <span className="text-xs">{location.name}</span>
    </button>
  )
}
```

(Only the emoji source changes — `📦` becomes `{emoji}`, everything else in the file is unchanged.)

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: still FAILS with the same pre-existing errors from Task 1 (`ItemCard.tsx`, `ItemDetailPage.tsx`, `RankingPage.tsx`, `NewItemPage.tsx` reference `item.rating`) — no new errors should appear from this task's files.

- [ ] **Step 6: Commit**

```bash
git add src/data/locationEmoji.ts src/components/RecommendationBadge.tsx src/components/RecommendationToggle.tsx src/components/LocationIcon.tsx
git commit -m "feat: add recommendation display/toggle components and per-location emoji"
```

---

### Task 4: `ItemCard` — use `RecommendationBadge`

**Files:**
- Modify: `src/components/ItemCard.tsx`

**Interfaces:**
- Consumes: `RecommendationBadge` (Task 3), `Item.recommendation` (Task 1).

- [ ] **Step 1: Rewrite `src/components/ItemCard.tsx`**

```tsx
import type { Item } from '../types'
import { RecommendationBadge } from './RecommendationBadge'

export function ItemCard({ item, onClick }: { item: Item; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-ink/10 bg-card p-3 text-left shadow-sm"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded bg-paper text-xl">
        🧴
      </div>
      <div className="flex-1">
        <p className="font-medium">{item.name}</p>
        {item.recommendation !== undefined ? (
          <RecommendationBadge recommendation={item.recommendation} />
        ) : item.daysUntilEmpty !== undefined ? (
          <span className="text-sm text-warn">D-{item.daysUntilEmpty}</span>
        ) : null}
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: `ItemCard.tsx` no longer appears in the error list. Remaining pre-existing errors: `ItemDetailPage.tsx`, `RankingPage.tsx`, `NewItemPage.tsx` (fixed in later tasks).

- [ ] **Step 3: Commit**

```bash
git add src/components/ItemCard.tsx
git commit -m "feat: show recommendation badge instead of star rating on ItemCard"
```

---

### Task 5: `useSeenNotifications` hook

**Files:**
- Create: `src/hooks/useSeenNotifications.ts`
- Test: `src/hooks/useSeenNotifications.test.ts`

**Interfaces:**
- Consumes: `useLocalStorage` from `src/hooks/useLocalStorage.ts` (existing, from the MVP).
- Produces: `useSeenNotifications(): { seenIds: string[]; markSeen: (ids: string[]) => void }`, consumed by `NotificationsPage` (Task 6) and `AppLayout` (Task 7).

- [ ] **Step 1: Write the failing test `src/hooks/useSeenNotifications.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSeenNotifications } from './useSeenNotifications'

describe('useSeenNotifications', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts with an empty seen list', () => {
    const { result } = renderHook(() => useSeenNotifications())
    expect(result.current.seenIds).toEqual([])
  })

  it('markSeen adds new ids without duplicating', () => {
    const { result } = renderHook(() => useSeenNotifications())
    act(() => {
      result.current.markSeen(['a', 'b'])
    })
    expect(result.current.seenIds.slice().sort()).toEqual(['a', 'b'])
    act(() => {
      result.current.markSeen(['b', 'c'])
    })
    expect(result.current.seenIds.slice().sort()).toEqual(['a', 'b', 'c'])
  })

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useSeenNotifications())
    act(() => {
      result.current.markSeen(['x'])
    })
    expect(JSON.parse(window.localStorage.getItem('remembuy:seenNotificationIds')!)).toEqual([
      'x',
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useSeenNotifications.test.ts`
Expected: FAIL — `./useSeenNotifications` module does not exist.

- [ ] **Step 3: Write `src/hooks/useSeenNotifications.ts`**

```ts
import { useLocalStorage } from './useLocalStorage'

export function useSeenNotifications() {
  const [seenIds, setSeenIds] = useLocalStorage<string[]>('remembuy:seenNotificationIds', [])

  function markSeen(ids: string[]) {
    setSeenIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      return Array.from(next)
    })
  }

  return { seenIds, markSeen }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useSeenNotifications.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSeenNotifications.ts src/hooks/useSeenNotifications.test.ts
git commit -m "feat: add useSeenNotifications hook for unread-badge tracking"
```

---

### Task 6: `NotificationsPage` — read-tracking + "구매하기" label

**Files:**
- Modify: `src/pages/NotificationsPage.tsx`

**Interfaces:**
- Consumes: `useSeenNotifications` (Task 5), `getUpcomingNotifications` (existing, unchanged signature).

- [ ] **Step 1: Rewrite `src/pages/NotificationsPage.tsx`**

```tsx
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications } from '../state/selectors'
import { useSeenNotifications } from '../hooks/useSeenNotifications'

export default function NotificationsPage() {
  const { items } = useLocker()
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
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">알림</h1>

      {upcoming.length === 0 ? (
        <p className="text-sm text-ink/50">임박한 소모품이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {upcoming.map((item) => (
            <li key={item.id} className="rounded-lg border border-ink/10 bg-card p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{item.name}</p>
                <span className="text-warn">D-{item.daysUntilEmpty}</span>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="text-sm text-accent underline"
                >
                  상세보기
                </button>
                <a
                  href={item.affiliateUrl ?? '#'}
                  className="ml-auto rounded-full bg-stamp px-3 py-1 text-sm text-white"
                >
                  구매하기
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: `NotificationsPage.tsx` no longer in the error list.

- [ ] **Step 3: Commit**

```bash
git add src/pages/NotificationsPage.tsx
git commit -m "feat: mark notifications seen on view, rename action to 구매하기"
```

---

### Task 7: `AppLayout` — header with bell icon, 5-tab bottom bar

**Files:**
- Modify: `src/components/AppLayout.tsx`

**Interfaces:**
- Consumes: `useLocker()` (existing), `getUpcomingNotifications` (existing), `useSeenNotifications` (Task 5).

- [ ] **Step 1: Rewrite `src/components/AppLayout.tsx`**

```tsx
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications } from '../state/selectors'
import { useSeenNotifications } from '../hooks/useSeenNotifications'

const TABS = [
  { to: '/', label: '홈', icon: '🏠' },
  { to: '/ranking', label: '랭킹', icon: '🏆' },
  { to: '/feed', label: '공유', icon: '👥' },
  { to: '/family', label: '가족', icon: '👪' },
  { to: '/collection', label: '컬렉션', icon: '📔' },
]

export function AppLayout() {
  const navigate = useNavigate()
  const { items } = useLocker()
  const { seenIds } = useSeenNotifications()
  const unreadCount = getUpcomingNotifications(items, 7).filter(
    (item) => !seenIds.includes(item.id)
  ).length

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-paper">
      <header className="flex items-center justify-between border-b border-ink/10 bg-card px-4 py-3">
        <span className="font-heading text-lg">REMEMBUY</span>
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="relative text-xl"
          aria-label="알림"
        >
          🔔
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-stamp" />
          )}
        </button>
      </header>
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-1/2 grid w-full max-w-md -translate-x-1/2 grid-cols-5 border-t border-ink/10 bg-card">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-xs ${
                isActive ? 'text-stamp' : 'text-ink/60'
              }`
            }
          >
            <span>{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: `AppLayout.tsx` compiles cleanly (it's inside `LockerProvider` via `App.tsx`'s route tree, so `useLocker()` resolves fine).

- [ ] **Step 3: Manual verification trace**

Trace: with the seed data, `getUpcomingNotifications(items, 7)` returns `seed-2` (D-5) and `seed-5` (D-3). On first load (before `/notifications` has ever been visited), `seenIds` is `[]`, so `unreadCount` is 2 and the red dot renders. After visiting `/notifications` (Task 6 marks both ids as seen), returning to any other tab should make `unreadCount` 0 and hide the dot.

- [ ] **Step 4: Commit**

```bash
git add src/components/AppLayout.tsx
git commit -m "feat: move notifications to header bell icon, drop to 5-tab bottom bar"
```

---

### Task 8: `ItemDetailPage` — recommendation toggle, price, 구매하기, related items

**Files:**
- Modify: `src/pages/ItemDetailPage.tsx`

**Interfaces:**
- Consumes: `RecommendationToggle` (Task 3), `ItemCard` (Task 4), `useLocker().updateItem` (existing).

- [ ] **Step 1: Rewrite `src/pages/ItemDetailPage.tsx`**

```tsx
import { useNavigate, useParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { RecommendationToggle } from '../components/RecommendationToggle'
import { ItemCard } from '../components/ItemCard'

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { items, locations, categories, updateItem } = useLocker()
  const item = items.find((i) => i.id === id)

  if (!item) {
    return (
      <div className="p-4">
        <p>상품을 찾을 수 없습니다.</p>
        <button type="button" onClick={() => navigate('/')} className="mt-2 text-accent underline">
          홈으로 돌아가기
        </button>
      </div>
    )
  }

  const location = locations.find((l) => l.id === item.locationId)
  const category = categories.find((c) => c.id === item.categoryId)
  const relatedItems = items
    .filter((i) => i.categoryId === item.categoryId && i.id !== item.id)
    .slice(0, 4)

  return (
    <div className="space-y-4 p-4">
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-ink/60">
        ← 뒤로
      </button>

      <div className="flex h-40 items-center justify-center rounded-lg bg-card text-5xl">
        🧴
      </div>

      <div>
        <p className="text-xs text-ink/50">
          {location?.name} &gt; {category?.name}
        </p>
        <h1 className="text-xl font-bold">{item.name}</h1>
        {item.price !== undefined && (
          <p className="mt-1 text-lg font-semibold text-ink">{item.price.toLocaleString()}원</p>
        )}
      </div>

      {item.daysUntilEmpty !== undefined ? (
        <p className="text-warn">D-{item.daysUntilEmpty}</p>
      ) : (
        <RecommendationToggle
          value={item.recommendation}
          onChange={(value) => updateItem(item.id, { recommendation: value })}
        />
      )}

      {item.note && <p className="rounded-lg bg-card p-3 text-sm">{item.note}</p>}

      <dl className="space-y-1 text-sm">
        {item.place && (
          <div className="flex justify-between">
            <dt className="text-ink/50">구매처</dt>
            <dd>{item.place}</dd>
          </div>
        )}
        {item.restockCycle && (
          <div className="flex justify-between">
            <dt className="text-ink/50">재구매 주기</dt>
            <dd>{item.restockCycle}</dd>
          </div>
        )}
      </dl>

      <div className="flex gap-2">
        {item.affiliateUrl ? (
          <a
            href={item.affiliateUrl}
            className="flex-1 rounded-lg bg-stamp py-2 text-center text-white"
          >
            구매하기
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="flex-1 rounded-lg bg-ink/10 py-2 text-center text-ink/40"
          >
            구매 링크 없음
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate(`/new?editId=${item.id}`)}
          className="flex-1 rounded-lg border border-ink/20 py-2 text-center"
        >
          메모 수정하기
        </button>
      </div>

      {relatedItems.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-ink/70">이런 상품은 어때요?</h2>
          <div className="space-y-2">
            {relatedItems.map((related) => (
              <ItemCard
                key={related.id}
                item={related}
                onClick={() => navigate(`/item/${related.id}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: `ItemDetailPage.tsx` no longer in the error list.

- [ ] **Step 3: Manual verification trace**

Trace against seed data: `/item/seed-1` (톤업 선크림, `recommendation: 'recommend'`, no `price`, `affiliateUrl: null`) should show the recommend toggle with "추천해요" highlighted, no price line, a disabled "구매 링크 없음" button, and a related-items section listing other `bathroom-skincare` items if any exist (currently none — section should not render, confirming `relatedItems.length > 0` guards correctly). `/item/seed-2` (daysUntilEmpty: 5) should show "D-5" instead of the toggle.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ItemDetailPage.tsx
git commit -m "feat: item detail shows recommendation toggle, price, 구매하기, related items"
```

---

### Task 9: `NewItemPage` — recommendation toggle, price, affiliate link inputs

**Files:**
- Modify: `src/pages/NewItemPage.tsx`

**Interfaces:**
- Consumes: `RecommendationToggle` (Task 3), `Item` (Task 1).

- [ ] **Step 1: Rewrite `src/pages/NewItemPage.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { RecommendationToggle } from '../components/RecommendationToggle'
import type { Item } from '../types'

type ProgressMode = 'recommendation' | 'daysUntilEmpty'

export default function NewItemPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('editId')
  const { items, locations, categories, addItem, updateItem, addLocation, addCategory } =
    useLocker()
  const existing = editId ? items.find((i) => i.id === editId) : undefined

  const [name, setName] = useState(existing?.name ?? '')
  const [locationId, setLocationId] = useState(existing?.locationId ?? locations[0].id)
  const categoriesForLocation = useMemo(
    () => categories.filter((c) => c.locationId === locationId),
    [categories, locationId]
  )
  const [categoryId, setCategoryId] = useState(
    existing?.categoryId ?? categoriesForLocation[0]?.id ?? ''
  )
  const [masterItemId, setMasterItemId] = useState(existing?.masterItemId ?? '')
  const [place, setPlace] = useState(existing?.place ?? '')
  const [restockCycle, setRestockCycle] = useState(existing?.restockCycle ?? '')
  const [progressMode, setProgressMode] = useState<ProgressMode>(
    existing?.daysUntilEmpty !== undefined ? 'daysUntilEmpty' : 'recommendation'
  )
  const [recommendation, setRecommendation] = useState<'recommend' | 'notRecommend'>(
    existing?.recommendation ?? 'recommend'
  )
  const [daysUntilEmpty, setDaysUntilEmpty] = useState(existing?.daysUntilEmpty ?? 30)
  const [price, setPrice] = useState<number | ''>(existing?.price ?? '')
  const [affiliateUrl, setAffiliateUrl] = useState(existing?.affiliateUrl ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [newLocationName, setNewLocationName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')

  const selectedCategory = categoriesForLocation.find((c) => c.id === categoryId)

  function handleLocationChange(nextLocationId: string) {
    setLocationId(nextLocationId)
    const nextCategories = categories.filter((c) => c.locationId === nextLocationId)
    setCategoryId(nextCategories[0]?.id ?? '')
    setMasterItemId('')
  }

  function handleAddLocation() {
    if (!newLocationName.trim()) return
    const created = addLocation(newLocationName.trim())
    setNewLocationName('')
    setLocationId(created.id)
    setCategoryId('')
  }

  function handleAddCategory() {
    if (!newCategoryName.trim() || !locationId) return
    const created = addCategory(locationId, newCategoryName.trim())
    setNewCategoryName('')
    setCategoryId(created.id)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const item: Item = {
      id: existing?.id ?? `item-${Date.now()}`,
      name,
      locationId,
      categoryId,
      masterItemId: masterItemId || undefined,
      place: place || undefined,
      restockCycle: restockCycle || null,
      note: note || undefined,
      recommendation: progressMode === 'recommendation' ? recommendation : undefined,
      daysUntilEmpty: progressMode === 'daysUntilEmpty' ? daysUntilEmpty : undefined,
      price: price === '' ? undefined : Number(price),
      affiliateUrl: affiliateUrl || null,
      createdAt: existing?.createdAt ?? new Date().toISOString().slice(0, 10),
    }
    if (existing) {
      updateItem(existing.id, item)
    } else {
      addItem(item)
    }
    navigate('/')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <h1 className="text-xl font-bold">{existing ? '메모 수정하기' : '새로 기록하기'}</h1>

      <label className="block text-sm">
        이름
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
        />
      </label>

      <label className="block text-sm">
        장소
        <select
          value={locationId}
          onChange={(e) => handleLocationChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <input
          value={newLocationName}
          onChange={(e) => setNewLocationName(e.target.value)}
          placeholder="새 장소 이름 (예: 베란다)"
          className="flex-1 rounded-lg border border-ink/20 bg-card p-2 text-sm"
        />
        <button
          type="button"
          onClick={handleAddLocation}
          className="rounded-lg border border-ink/20 px-3 text-sm"
        >
          장소 추가
        </button>
      </div>

      <label className="block text-sm">
        카테고리
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value)
            setMasterItemId('')
          }}
          className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
        >
          {categoriesForLocation.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="새 카테고리 이름"
          className="flex-1 rounded-lg border border-ink/20 bg-card p-2 text-sm"
        />
        <button
          type="button"
          onClick={handleAddCategory}
          className="rounded-lg border border-ink/20 px-3 text-sm"
        >
          카테고리 추가
        </button>
      </div>

      {selectedCategory && (
        <label className="block text-sm">
          표준 품목과 연결 (선택)
          <select
            value={masterItemId}
            onChange={(e) => setMasterItemId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
          >
            <option value="">직접 입력 (커스텀 상품)</option>
            {selectedCategory.masterItems.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm">
        구매처
        <input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
        />
      </label>

      <label className="block text-sm">
        가격 (원)
        <input
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
        />
      </label>

      <label className="block text-sm">
        구매 링크
        <input
          value={affiliateUrl ?? ''}
          onChange={(e) => setAffiliateUrl(e.target.value)}
          placeholder="https://..."
          className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
        />
      </label>

      <label className="block text-sm">
        재구매 주기
        <input
          value={restockCycle}
          onChange={(e) => setRestockCycle(e.target.value)}
          placeholder="예: 약 2개월마다"
          className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setProgressMode('recommendation')}
          className={`flex-1 rounded-lg py-2 text-sm ${
            progressMode === 'recommendation' ? 'bg-stamp text-white' : 'bg-card text-ink'
          }`}
        >
          추천/비추천
        </button>
        <button
          type="button"
          onClick={() => setProgressMode('daysUntilEmpty')}
          className={`flex-1 rounded-lg py-2 text-sm ${
            progressMode === 'daysUntilEmpty' ? 'bg-stamp text-white' : 'bg-card text-ink'
          }`}
        >
          소진까지 D-day
        </button>
      </div>

      {progressMode === 'recommendation' ? (
        <RecommendationToggle value={recommendation} onChange={setRecommendation} />
      ) : (
        <label className="block text-sm">
          소진까지 남은 일수
          <input
            type="number"
            min={0}
            value={daysUntilEmpty}
            onChange={(e) => setDaysUntilEmpty(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
          />
        </label>
      )}

      <label className="block text-sm">
        메모
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
          rows={3}
        />
      </label>

      <button type="submit" className="w-full rounded-lg bg-stamp py-2 text-white">
        저장하기
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: `NewItemPage.tsx` no longer in the error list.

- [ ] **Step 3: Manual verification trace**

Trace: visiting `/new?editId=seed-1` pre-fills `recommendation: 'recommend'` (toggle highlights "추천해요"), `price` empty (seed-1 has no price), `affiliateUrl` empty. Submitting without changing anything should call `updateItem('seed-1', {...})` with `price: undefined` (since `price` state is `''`) and `recommendation: 'recommend'` — verify `/item/seed-1` still shows no price line and "추천해요" highlighted afterward. Creating a brand-new item with a price of `12000` and toggling "비추천해요" should, after saving, show "12,000원" and the비추천 toggle highlighted on its detail page.

- [ ] **Step 4: Commit**

```bash
git add src/pages/NewItemPage.tsx
git commit -m "feat: new/edit item form uses recommendation toggle, adds price/구매링크 inputs"
```

---

### Task 10: `RankingPage` — location→category→product drill-down; remove `RatingStars`

**Files:**
- Modify: `src/pages/RankingPage.tsx`
- Delete: `src/components/RatingStars.tsx`

**Interfaces:**
- Consumes: `getLocationsRankedByItemCount`, `getCategoriesRankedByItemCount`, `getRankingForCategory` (Task 2), `RecommendationBadge` (Task 3), `Badge` (existing).

- [ ] **Step 1: Rewrite `src/pages/RankingPage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import {
  getLocationsRankedByItemCount,
  getCategoriesRankedByItemCount,
  getRankingForCategory,
} from '../state/selectors'
import { RecommendationBadge } from '../components/RecommendationBadge'
import { Badge } from '../components/Badge'

type DrillLevel =
  | { level: 'locations' }
  | { level: 'categories'; locationId: string }
  | { level: 'products'; locationId: string; categoryId: string }

export default function RankingPage() {
  const { items, locations, categories } = useLocker()
  const navigate = useNavigate()
  const [drill, setDrill] = useState<DrillLevel>({ level: 'locations' })

  if (drill.level === 'locations') {
    const ranked = getLocationsRankedByItemCount(items, locations)
    return (
      <div className="space-y-4 p-4">
        <h1 className="text-xl font-bold">랭킹</h1>
        <ul className="space-y-2">
          {ranked.map(({ location, itemCount }) => (
            <li
              key={location.id}
              onClick={() => setDrill({ level: 'categories', locationId: location.id })}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-ink/10 bg-card p-3"
            >
              <span className="font-medium">{location.name}</span>
              <span className="text-sm text-ink/50">{itemCount}개 저장됨</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (drill.level === 'categories') {
    const location = locations.find((l) => l.id === drill.locationId)
    const ranked = getCategoriesRankedByItemCount(items, categories, drill.locationId)
    return (
      <div className="space-y-4 p-4">
        <button
          type="button"
          onClick={() => setDrill({ level: 'locations' })}
          className="text-sm text-ink/60"
        >
          ← 장소 목록
        </button>
        <h1 className="text-xl font-bold">{location?.name}</h1>
        <ul className="space-y-2">
          {ranked.map(({ category, itemCount }) => (
            <li
              key={category.id}
              onClick={() =>
                setDrill({
                  level: 'products',
                  locationId: drill.locationId,
                  categoryId: category.id,
                })
              }
              className="flex cursor-pointer items-center justify-between rounded-lg border border-ink/10 bg-card p-3"
            >
              <span className="font-medium">{category.name}</span>
              <span className="text-sm text-ink/50">{itemCount}개 등록됨</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const category = categories.find((c) => c.id === drill.categoryId)
  const ranking = getRankingForCategory(items, drill.categoryId)

  return (
    <div className="space-y-4 p-4">
      <button
        type="button"
        onClick={() => setDrill({ level: 'categories', locationId: drill.locationId })}
        className="text-sm text-ink/60"
      >
        ← 카테고리 목록
      </button>
      <h1 className="text-xl font-bold">{category?.name}</h1>

      {ranking.length === 0 ? (
        <p className="text-sm text-ink/50">이 카테고리에는 기록된 상품이 없습니다.</p>
      ) : (
        <ol className="space-y-2">
          {ranking.map((item, index) => (
            <li
              key={item.id}
              onClick={() => navigate(`/item/${item.id}`)}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-ink/10 bg-card p-3"
            >
              <span className="w-6 text-center font-heading text-lg">{index + 1}</span>
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                {item.recommendation !== undefined && (
                  <RecommendationBadge recommendation={item.recommendation} />
                )}
              </div>
              {index === 0 && <Badge>다시 살래요</Badge>}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Delete `src/components/RatingStars.tsx`**

Run: `rm src/components/RatingStars.tsx` (or delete the file). This was the last remaining consumer of `RatingStars` — `ItemCard` (Task 4) and `ItemDetailPage` (Task 8) were already migrated to `RecommendationBadge`/`RecommendationToggle`.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors — this resolves the last of the pre-existing `item.rating` errors from Task 1, and confirms no file still imports the deleted `RatingStars`.

- [ ] **Step 4: Manual verification trace**

Trace against seed data: the locations list should show `bathroom` at the top (5 seed items: seed-1/2/3, plus any others in bathroom categories — recount: seed-1, seed-2, seed-3 = 3 items in `bathroom`) sorted above locations with fewer items. Drilling into `bathroom` should show `bathroom-skincare`, `bathroom-haircare`, `bathroom-oralcare` each with 1 item, and `bathroom-bodycare`/`bathroom-hygiene` with 0 items, sorted with the 1-item categories first (ties keep array order). Drilling into `bathroom-oralcare` should show `seed-3` (센소다인 치약, recommend) alone at rank 1 with the "다시 살래요" badge.

- [ ] **Step 5: Commit**

```bash
git add -A src/pages/RankingPage.tsx src/components/RatingStars.tsx
git commit -m "feat: rewrite ranking as location->category->product drill-down"
```

---

### Task 11: `HomePage` — location→category→product drill-down

**Files:**
- Modify: `src/pages/HomePage.tsx`

**Interfaces:**
- Consumes: `getLocationCompletion` (existing, unchanged), `LocationIcon` (Task 3), `ItemCard` (Task 4).

- [ ] **Step 1: Rewrite `src/pages/HomePage.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getLocationCompletion } from '../state/selectors'
import { LocationIcon } from '../components/LocationIcon'
import { ItemCard } from '../components/ItemCard'

type HomeFilter = 'all' | 'urgent' | 'recommended'

export default function HomePage() {
  const { items, locations, categories } = useLocker()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [filter, setFilter] = useState<HomeFilter>('all')

  const searchResults = useMemo(() => {
    if (!search) return null
    const term = search.toLowerCase()
    return items.filter((item) => item.name.toLowerCase().includes(term))
  }, [items, search])

  const categoriesForLocation = useMemo(
    () => categories.filter((c) => c.locationId === selectedLocationId),
    [categories, selectedLocationId]
  )

  const itemsForCategory = useMemo(() => {
    if (!selectedCategoryId) return []
    return items.filter((item) => {
      if (item.categoryId !== selectedCategoryId) return false
      if (filter === 'urgent' && !(item.daysUntilEmpty !== undefined && item.daysUntilEmpty <= 7))
        return false
      if (filter === 'recommended' && item.recommendation !== 'recommend') return false
      return true
    })
  }, [items, selectedCategoryId, filter])

  function handleBack() {
    if (selectedCategoryId) {
      setSelectedCategoryId(null)
      setFilter('all')
    } else if (selectedLocationId) {
      setSelectedLocationId(null)
    }
  }

  if (searchResults !== null) {
    return (
      <div className="space-y-4 p-4">
        <input
          type="search"
          placeholder="상품 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-ink/20 bg-card p-2"
        />
        <div className="space-y-2">
          {searchResults.length === 0 ? (
            <p className="text-sm text-ink/50">검색 결과가 없습니다.</p>
          ) : (
            searchResults.map((item) => (
              <ItemCard key={item.id} item={item} onClick={() => navigate(`/item/${item.id}`)} />
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <input
        type="search"
        placeholder="상품 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-ink/20 bg-card p-2"
      />

      {(selectedLocationId || selectedCategoryId) && (
        <button type="button" onClick={handleBack} className="text-sm text-ink/60">
          ← 뒤로
        </button>
      )}

      {!selectedLocationId && (
        <div className="grid grid-cols-3 gap-3">
          {locations.map((location) => (
            <LocationIcon
              key={location.id}
              location={location}
              percent={getLocationCompletion(items, location.id, categories)}
              onClick={() => setSelectedLocationId(location.id)}
            />
          ))}
        </div>
      )}

      {selectedLocationId && !selectedCategoryId && (
        <div className="grid grid-cols-2 gap-3">
          {categoriesForLocation.map((category) => {
            const count = items.filter((i) => i.categoryId === category.id).length
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategoryId(category.id)}
                className="rounded-lg border border-ink/10 bg-card p-3 text-left"
              >
                <p className="font-medium">{category.name}</p>
                <p className="text-xs text-ink/50">{count}개 보유</p>
              </button>
            )
          })}
        </div>
      )}

      {selectedCategoryId && (
        <>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-full px-3 py-1 text-sm ${
                filter === 'all' ? 'bg-stamp text-white' : 'bg-card text-ink'
              }`}
            >
              전체
            </button>
            <button
              type="button"
              onClick={() => setFilter('urgent')}
              className={`rounded-full px-3 py-1 text-sm ${
                filter === 'urgent' ? 'bg-stamp text-white' : 'bg-card text-ink'
              }`}
            >
              임박만
            </button>
            <button
              type="button"
              onClick={() => setFilter('recommended')}
              className={`rounded-full px-3 py-1 text-sm ${
                filter === 'recommended' ? 'bg-stamp text-white' : 'bg-card text-ink'
              }`}
            >
              추천한 상품만
            </button>
          </div>
          <div className="space-y-2">
            {itemsForCategory.length === 0 ? (
              <p className="text-sm text-ink/50">조건에 맞는 상품이 없습니다.</p>
            ) : (
              itemsForCategory.map((item) => (
                <ItemCard key={item.id} item={item} onClick={() => navigate(`/item/${item.id}`)} />
              ))
            )}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => navigate('/new')}
        className="fixed bottom-24 right-1/2 -mr-[calc(50%-2.5rem)] flex h-14 w-14 items-center justify-center rounded-full bg-stamp text-2xl text-white shadow-lg"
        aria-label="새로 기록하기"
      >
        +
      </button>
    </div>
  )
}
```

Note: the page-level `<h1>REMEMBUY</h1>` from the old Home screen is intentionally removed — `AppLayout`'s new header (Task 7) already shows the "REMEMBUY" brand name on every screen, so keeping it here would duplicate it.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors (should already be zero after Task 10; this confirms `HomePage.tsx`'s rewrite didn't introduce new ones).

- [ ] **Step 3: Manual verification trace**

Trace against seed data:
- Level 1 (no selection): 10 location tiles render, no "전체" tile, each with its `LOCATION_EMOJI` and completion gauge.
- Clicking `bathroom`: level 2 shows its 5 categories as tiles (`헤어케어`, `바디케어`, `구강케어`, `스킨케어`, `위생용품`), with `헤어케어`/`스킨케어`/`구강케어` showing "1개 보유" and `바디케어`/`위생용품` showing "0개 보유".
- Clicking `스킨케어`: level 3 shows `seed-1` (톤업 선크림) with the "전체" filter active. Clicking "추천한 상품만" keeps it visible (its `recommendation` is `'recommend'`). Clicking "임박만" hides it (no `daysUntilEmpty`), showing "조건에 맞는 상품이 없습니다."
- Typing "샴푸" into search from any drill level immediately shows a flat result list including `seed-2` (아윤채 샴푸), overriding the drill-down view entirely; clearing the search returns to wherever the drill-down state was left (level 1/2/3, since `selectedLocationId`/`selectedCategoryId` are untouched by search).
- The floating "+" button still navigates to `/new` from every level.

- [ ] **Step 4: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: rewrite home as location->category->product drill-down with search override"
```

---

### Task 12: Full verification pass

**Files:**
- None (verification only).

**Interfaces:**
- Consumes: the entirety of Tasks 1–11.

- [ ] **Step 1: Run the full automated test suite**

Run: `npm run test`
Expected: all test files pass — `src/data/locations.test.ts` (5), `src/data/seedItems.test.ts` (7), `src/hooks/useLocalStorage.test.ts` (4), `src/hooks/useSeenNotifications.test.ts` (3), `src/state/LockerContext.test.tsx` (9), `src/state/selectors.test.ts` (10), `src/components/ProgressRing.test.tsx` (3) — **41 tests total, 0 failures**.

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: `tsc -b` and `vite build` both complete with no errors, producing a `dist/` bundle.

- [ ] **Step 3: Confirm no leftover `rating` or `RatingStars` references**

Run: `grep -rn "\.rating\b\|RatingStars" src/`
Expected: no matches (confirms the Task 1 migration and Task 10 deletion are complete across the whole `src/` tree, not just the files this plan explicitly touched).

- [ ] **Step 4: Manual golden-path walkthrough**

Run: `npm run dev` (port 7777) and confirm each of the following end-to-end:
1. Home: drill into a location → category → product list; toggle all 3 filters; search overrides the view; "+" navigates to `/new`.
2. New item: create an item with a price and a 추천/비추천 choice; verify it appears correctly on its detail page.
3. Item detail: toggle recommendation and confirm it persists (reload the page, still shows the new value); confirm "구매하기" is disabled/absent when `affiliateUrl` is empty and works when present; confirm "이런 상품은 어때요?" shows same-category items.
4. Ranking: drill through all 3 levels; confirm sort orders (item count descending at levels 1-2, recommend-first at level 3).
5. Header bell: confirms red dot appears when unseen urgent items exist and disappears after visiting `/notifications`; bottom tab bar has exactly 5 tabs, no 알림 tab.
6. Collection, 공유 피드, 가족 케어 screens are visually and functionally unchanged from before this plan.

Expected: no console errors, all interactions behave as described.

- [ ] **Step 5: Commit final state (only if fixes were needed)**

```bash
git add -A
git commit -m "test: verify REMEMBUY Group A golden path"
```

If no fixes were needed, skip this commit — nothing to record.
