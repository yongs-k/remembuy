# Stitch Collection Page Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Stitch collection mockups (`remembuy_3` overview, `_4` detail) onto `CollectionPage`, and delete the dead `LocationIcon`/`locationEmoji` code.

**Architecture:** `CollectionPage` keeps its store hooks and rename/delete handlers and gains one `openLocationId` state that switches between two new presentational views (`CollectionOverview`, `CollectionDetail`) built from two smaller components (`LocationDexCard`, `CategoryChecklist`). One new selector, `getMasterItemCounts`, is added with a unit test.

**Tech Stack:** React + TypeScript + Tailwind; `Icon`/`LOCATION_MATERIAL_ICON` from `src/data/materialIcons.tsx`; Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-21-stitch-collection-design.md`.
- Tailwind: font-size scale classes are `text-display-lg|display-sm|headline-lg|headline-md|body-lg|body-md|body-sm|label-lg|label-md|label-sm|stat-counter`. There is NO `font-<scale>` class — only `font-heading` and `font-body`. `scrollbar-none` does NOT exist (no plugin) — never use it.
- Spacing tokens: `space-xs|sm|md|lg|xl`, `gutter`, `margin` (e.g. `p-space-md`, `gap-space-sm`, `p-margin`).
- Icons only via `<Icon name="..." className="..." />` (already `aria-hidden`).
- Handlers keep their exact behavior and Korean texts: `window.prompt('장소 이름 수정' | '카테고리 이름 수정')`, the "last location/category cannot be deleted" `window.alert`, and the delete `window.confirm` texts.
- Barcode buttons are inert: render `disabled`, NO `onClick`, NO `aria-label` (the visible text is the accessible name).
- Two-button docks use `items-stretch`. Long names use `truncate` only with `min-w-0` ancestors, or `line-clamp-2`.
- `npx tsc --noEmit` clean and vitest green after every task (50 tests before this plan; Task 1 adds 3).

## File Structure

```
src/state/selectors.ts               # Modify: add getMasterItemCounts
src/state/selectors.test.ts          # Modify: add tests
src/data/collectionDummy.ts          # Create: static dummy data
src/components/LocationDexCard.tsx   # Create
src/components/CategoryChecklist.tsx # Create
src/components/CollectionOverview.tsx# Create
src/components/CollectionDetail.tsx  # Create
src/pages/CollectionPage.tsx         # Modify: state + handlers + view switch
src/components/LocationIcon.tsx      # Delete
src/data/locationEmoji.ts            # Delete
```

---

### Task 1: `getMasterItemCounts` selector (TDD)

**Files:**
- Modify: `src/state/selectors.ts`, `src/state/selectors.test.ts`

**Interfaces:**
- Produces: `getMasterItemCounts(items: Item[], categories: Category[], locationId?: string): { owned: number; total: number }` — sums `masterItems.length` (total) and how many of them are covered by an item with matching `masterItemId` in that category (owned), over all categories or only those of `locationId`.

- [ ] **Step 1: Write the failing tests**

In `src/state/selectors.test.ts` replace

```ts
  getCompletedPodium,
} from './selectors'
```

with

```ts
  getCompletedPodium,
  getMasterItemCounts,
} from './selectors'
```

and append at the end of the file:

```ts
describe('getMasterItemCounts', () => {
  const catA: Category = {
    id: 'a',
    locationId: 'L1',
    name: 'A',
    masterItems: [
      { id: 'a1', name: 'a1' },
      { id: 'a2', name: 'a2' },
    ],
  }
  const catB: Category = {
    id: 'b',
    locationId: 'L2',
    name: 'B',
    masterItems: [{ id: 'b1', name: 'b1' }],
  }
  const mk = (id: string, categoryId: string, masterItemId?: string): Item => ({
    id,
    name: id,
    locationId: 'x',
    categoryId,
    masterItemId,
    createdAt: '2026-01-01',
  })

  it('counts owned and total across all categories', () => {
    const items = [mk('i1', 'a', 'a1'), mk('i2', 'b', 'b1')]
    expect(getMasterItemCounts(items, [catA, catB])).toEqual({ owned: 2, total: 3 })
  })

  it('scopes to one location', () => {
    expect(getMasterItemCounts([mk('i1', 'a', 'a1')], [catA, catB], 'L1')).toEqual({
      owned: 1,
      total: 2,
    })
  })

  it('ignores items without a masterItemId', () => {
    expect(getMasterItemCounts([mk('i1', 'a')], [catA], 'L1')).toEqual({ owned: 0, total: 2 })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/state/selectors.test.ts`
Expected: FAIL (`getMasterItemCounts` is not exported / not a function).

- [ ] **Step 3: Implement**

Append to `src/state/selectors.ts`:

```ts
export function getMasterItemCounts(
  items: Item[],
  categories: Category[],
  locationId?: string
): { owned: number; total: number } {
  const scoped = locationId ? categories.filter((c) => c.locationId === locationId) : categories
  let owned = 0
  let total = 0
  for (const category of scoped) {
    total += category.masterItems.length
    owned += category.masterItems.length - getMissingMasterItems(items, category).length
  }
  return { owned, total }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/state/selectors.test.ts` — expected PASS. Then `npx tsc --noEmit` — clean.

- [ ] **Step 5: Commit**

```bash
git add src/state/selectors.ts src/state/selectors.test.ts
git commit -m "feat: add getMasterItemCounts selector"
```

---

### Task 2: Dummy data + `LocationDexCard`

**Files:**
- Create: `src/data/collectionDummy.ts`, `src/components/LocationDexCard.tsx`

**Interfaces:**
- Produces from `collectionDummy.ts`: `DUMMY_COLLECTION_PROFILE`, `DummyBadge` type, `DUMMY_BADGES: DummyBadge[]`, `DUMMY_MONTHLY_QUEST`, `DUMMY_DETAIL_GOAL: string`.
- Produces: `LocationDexCard({ rank, location, percent, owned, total, onOpen }: { rank: number; location: Location; percent: number; owned: number; total: number; onOpen: () => void })`.

- [ ] **Step 1: Create `src/data/collectionDummy.ts`**

```ts
export const DUMMY_COLLECTION_PROFILE = {
  title: '살림 탐험가 민우',
  levelLabel: 'Lv.4',
  nextLevel: 'Lv.5 도감 마스터',
  exp: { current: 180, total: 250 },
  badges: { owned: 4, total: 12, unlockable: 1 },
  savedLabel: '4.8만',
}

export type DummyBadge = {
  id: string
  name: string
  icon: string
  state: 'done' | 'locked'
  tag?: string
  progress?: number
  hint?: string
}

export const DUMMY_BADGES: DummyBadge[] = [
  { id: 'bath-explorer', name: '욕실 탐험가', icon: 'bubble_chart', state: 'done', tag: '달성' },
  { id: 'group-buyer', name: '현명한 공구족', icon: 'diversity_3', state: 'done', tag: '3회 공구' },
  { id: 'saving-king', name: '생필품 절약왕', icon: 'savings', state: 'done', tag: '3만원 절약' },
  { id: 'kitchen-lord', name: '주방의 지배자', icon: 'skillet', state: 'locked', progress: 45 },
  { id: 'eco-refiller', name: '친환경 리필러', icon: 'recycling', state: 'locked', hint: '리필팩 5개 등록' },
]

export const DUMMY_MONTHLY_QUEST = {
  icon: 'local_florist',
  title: '봄맞이 주방 소모품 3종 채우기',
  reward: '한정판 ‘봄날의 주방 요정’ 배지와 150P 지급!',
  progress: { current: 2, total: 3 },
}

export const DUMMY_DETAIL_GOAL = '목표: 5개 달성 시 ‘반짝이는 세면대’ 칭호 획득! +50P 예정'
```

- [ ] **Step 2: Create `src/components/LocationDexCard.tsx`**

```tsx
import type { Location } from '../types'
import { LOCATION_COLOR_HEX } from '../data/locationColors'
import { Icon, LOCATION_MATERIAL_ICON } from '../data/materialIcons'

export function LocationDexCard({
  rank,
  location,
  percent,
  owned,
  total,
  onOpen,
}: {
  rank: number
  location: Location
  percent: number
  owned: number
  total: number
  onOpen: () => void
}) {
  const color = LOCATION_COLOR_HEX[location.colorToken] ?? '#3F6459'
  const icon = LOCATION_MATERIAL_ICON[location.colorToken] ?? 'inventory_2'
  const tag =
    percent >= 100
      ? { text: '완성', cls: 'bg-secondary-container text-on-secondary-container' }
      : percent >= 70
        ? { text: '완성 임박!', cls: 'bg-primary-fixed text-primary' }
        : null

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl bg-surface-container-lowest p-space-md text-left shadow-[0_3px_0px_#e1bfb8] transition-colors hover:bg-surface-bright"
    >
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex min-w-0 items-center gap-space-sm">
          <div
            className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}33`, color }}
          >
            <Icon name={icon} className="text-[28px]" />
            <span className="absolute left-1 top-1 rounded bg-inverse-surface/80 px-1 text-[9px] font-bold text-inverse-on-surface">
              #{String(rank).padStart(2, '0')}
            </span>
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-1.5">
              <h4 className="truncate font-heading text-headline-md text-on-surface">{location.name}</h4>
              {tag && (
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-label-sm ${tag.cls}`}>
                  {tag.text}
                </span>
              )}
            </div>
            <span className="mt-0.5 text-body-sm text-on-surface-variant">
              {owned} / {total}종 수집 완료 ({percent}%)
            </span>
          </div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-label-sm text-on-surface">
          {percent}%
        </div>
      </div>
      <div className="mt-space-sm h-2 w-full overflow-hidden rounded-full bg-surface-container">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
      <div className="mt-space-sm flex items-center justify-end text-on-surface-variant">
        <Icon name="chevron_right" className="text-[18px]" />
      </div>
    </button>
  )
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` clean.

- [ ] **Step 4: Commit**

```bash
git add src/data/collectionDummy.ts src/components/LocationDexCard.tsx
git commit -m "feat: add collection dummy data and LocationDexCard"
```

---

### Task 3: `CategoryChecklist`

**Files:**
- Create: `src/components/CategoryChecklist.tsx`

**Interfaces:**
- Consumes: `getCategoryCompletion`, `getMissingMasterItems` (`../state/selectors`), `Icon`.
- Produces: `CategoryChecklist({ category, items, onRename, onRemove, onRecord, onOpenItem }: { category: Category; items: Item[]; onRename: () => void; onRemove: () => void; onRecord: () => void; onOpenItem: (itemId: string) => void })`.

- [ ] **Step 1: Create the file**

```tsx
import type { Category, Item } from '../types'
import { getCategoryCompletion, getMissingMasterItems } from '../state/selectors'
import { Icon } from '../data/materialIcons'

export function CategoryChecklist({
  category,
  items,
  onRename,
  onRemove,
  onRecord,
  onOpenItem,
}: {
  category: Category
  items: Item[]
  onRename: () => void
  onRemove: () => void
  onRecord: () => void
  onOpenItem: (itemId: string) => void
}) {
  const percent = getCategoryCompletion(items, category)
  const missingIds = new Set(getMissingMasterItems(items, category).map((m) => m.id))
  const ownedCount = category.masterItems.length - missingIds.size

  return (
    <section className="rounded-2xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]">
      <div className="flex items-center justify-between gap-space-sm">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-secondary">
            <Icon name="category" className="text-[18px]" />
          </div>
          <h3 className="truncate font-heading text-headline-md text-on-surface">{category.name}</h3>
          <span className="shrink-0 rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
            {ownedCount}/{category.masterItems.length} 완료 ({percent}%)
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-on-surface-variant">
          <button type="button" aria-label="카테고리 이름 수정" onClick={onRename} className="p-1">
            <Icon name="edit" className="text-[18px]" />
          </button>
          <button type="button" aria-label="카테고리 삭제" onClick={onRemove} className="p-1">
            <Icon name="delete" className="text-[18px]" />
          </button>
        </div>
      </div>
      <div className="mt-space-sm h-2 w-full overflow-hidden rounded-full bg-surface-container">
        <div className="h-full rounded-full bg-secondary" style={{ width: `${percent}%` }} />
      </div>
      <ul className="mt-space-sm space-y-1.5">
        {category.masterItems.map((m) => {
          const owned = !missingIds.has(m.id)
          const item = owned
            ? items.find((i) => i.categoryId === category.id && i.masterItemId === m.id)
            : undefined
          const urgent = item?.daysUntilEmpty !== undefined && item.daysUntilEmpty <= 7
          return (
            <li
              key={m.id}
              className="flex items-center gap-2.5 rounded-lg bg-surface-container-low px-2 py-2"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${
                  owned ? 'bg-secondary text-on-secondary' : 'border-2 border-outline-variant'
                }`}
              >
                {owned && <Icon name="check" className="text-[14px]" />}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5 text-label-lg text-on-surface">
                  <span className="truncate">{m.name}</span>
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
                </span>
                <span className="truncate text-body-sm text-on-surface-variant">
                  {owned ? (item?.name ?? '') : '미등록 슬롯'}
                </span>
              </div>
              {owned && item ? (
                <button
                  type="button"
                  onClick={() => onOpenItem(item.id)}
                  className="shrink-0 rounded-lg bg-surface-container-high px-2.5 py-1 text-label-sm text-on-surface"
                >
                  관리
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onRecord}
                  className="shrink-0 rounded-lg bg-surface-container-high px-2.5 py-1 text-label-sm text-primary"
                >
                  기록하기
                </button>
              )}
            </li>
          )
        })}
        {category.masterItems.length === 0 && (
          <li className="text-body-sm text-on-surface-variant">
            표준 품목이 아직 없는 카테고리입니다.
          </li>
        )}
      </ul>
    </section>
  )
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/CategoryChecklist.tsx
git commit -m "feat: add CategoryChecklist component"
```

---

### Task 4: `CollectionOverview`

**Files:**
- Create: `src/components/CollectionOverview.tsx`

**Interfaces:**
- Consumes: `getLocationCompletion`, `getMasterItemCounts` (`../state/selectors`), `LocationDexCard`, `Icon`, `DUMMY_*` (`../data/collectionDummy`).
- Produces: `CollectionOverview({ items, locations, categories, onOpen }: { items: Item[]; locations: Location[]; categories: Category[]; onOpen: (locationId: string) => void })` — holds its own filter state.

- [ ] **Step 1: Create the file**

```tsx
import { useState } from 'react'
import type { Category, Item, Location } from '../types'
import { getLocationCompletion, getMasterItemCounts } from '../state/selectors'
import { LocationDexCard } from './LocationDexCard'
import { Icon } from '../data/materialIcons'
import {
  DUMMY_BADGES,
  DUMMY_COLLECTION_PROFILE,
  DUMMY_MONTHLY_QUEST,
} from '../data/collectionDummy'

type Filter = 'all' | 'progress' | 'almost' | 'none'

const BADGE_TONES = [
  'bg-secondary-fixed text-secondary',
  'bg-primary-fixed text-primary',
  'bg-tertiary-fixed text-tertiary',
]

export function CollectionOverview({
  items,
  locations,
  categories,
  onOpen,
}: {
  items: Item[]
  locations: Location[]
  categories: Category[]
  onOpen: (locationId: string) => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const P = DUMMY_COLLECTION_PROFILE
  const Q = DUMMY_MONTHLY_QUEST

  const overall = getMasterItemCounts(items, categories)
  const overallPercent = overall.total === 0 ? 0 : Math.round((overall.owned / overall.total) * 100)
  const expPercent = Math.round((P.exp.current / P.exp.total) * 100)
  const questPercent = Math.round((Q.progress.current / Q.progress.total) * 100)

  const rows = locations.map((location, index) => ({
    location,
    rank: index + 1,
    percent: getLocationCompletion(items, location.id, categories),
    ...getMasterItemCounts(items, categories, location.id),
  }))
  const matches: Record<Filter, (p: number) => boolean> = {
    all: () => true,
    progress: (p) => p > 0 && p < 100,
    almost: (p) => p >= 70 && p < 100,
    none: (p) => p === 0,
  }
  const chips: Array<{ key: Filter; label: string }> = [
    { key: 'all', label: '전체' },
    { key: 'progress', label: '수집 진행 중' },
    { key: 'almost', label: '완성 임박' },
    { key: 'none', label: '미시작' },
  ]
  const visible = rows.filter((r) => matches[filter](r.percent))

  return (
    <div className="space-y-space-lg p-margin">
      <section className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-space-md shadow-[0_4px_0px_#e1bfb8]">
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-primary-fixed-dim/20 blur-2xl" />
        <div className="relative mb-space-md flex items-center gap-space-sm">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container shadow-[0_2px_0px_#aecdc4]">
              <Icon name="auto_stories" className="text-[26px]" />
            </div>
            <span className="absolute -bottom-1 -right-1 rounded-full bg-tertiary-container px-1 text-[9px] font-bold text-on-tertiary-container shadow-sm">
              {P.levelLabel}
            </span>
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-heading text-headline-md text-on-surface">{P.title}</span>
            <span className="text-body-sm text-on-surface-variant">
              다음 등급 <span className="font-bold text-primary">{P.nextLevel}</span>까지{' '}
              {P.exp.total - P.exp.current} EXP
            </span>
          </div>
        </div>
        <div className="relative mb-space-md">
          <div className="mb-1 flex items-center justify-between text-label-sm">
            <span className="text-on-surface-variant">도감 경험치 게이지</span>
            <span className="text-primary">
              {P.exp.current} / {P.exp.total} EXP{' '}
              <span className="font-normal text-on-surface-variant">({expPercent}%)</span>
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-container-high p-0.5">
            <div className="h-full rounded-full bg-primary-container" style={{ width: `${expPercent}%` }} />
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-space-xs">
          <div className="flex flex-col items-center rounded-lg bg-surface-container-low p-2.5 text-center shadow-[0_2px_0px_#f0e6e4]">
            <span className="mb-0.5 text-label-sm text-on-surface-variant">전체 수집률</span>
            <span className="font-heading text-stat-counter text-primary">
              {overallPercent}
              <span className="text-label-sm">%</span>
            </span>
            <span className="text-[11px] text-on-surface-variant">
              {overall.owned} / {overall.total}개
            </span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-surface-container-low p-2.5 text-center shadow-[0_2px_0px_#f0e6e4]">
            <span className="mb-0.5 text-label-sm text-on-surface-variant">보유 배지</span>
            <span className="font-heading text-stat-counter text-tertiary">
              {P.badges.owned}
              <span className="text-label-sm text-on-surface-variant"> / {P.badges.total}</span>
            </span>
            <span className="text-[11px] font-bold text-tertiary">+{P.badges.unlockable} 해금 가능</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-surface-container-low p-2.5 text-center shadow-[0_2px_0px_#f0e6e4]">
            <span className="mb-0.5 text-label-sm text-on-surface-variant">누적 절약액</span>
            <span className="font-heading text-headline-md text-secondary">
              {P.savedLabel}
              <span className="text-label-sm">원</span>
            </span>
            <span className="text-[11px] text-secondary">알뜰 소비중</span>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-space-sm flex items-center gap-1.5">
          <Icon name="military_tech" className="text-[20px] text-tertiary" />
          <h2 className="font-heading text-headline-md text-on-surface">수집 업적 배지함</h2>
        </div>
        <div className="flex snap-x gap-space-sm overflow-x-auto pb-space-xs">
          {DUMMY_BADGES.map((badge, index) =>
            badge.state === 'done' ? (
              <div
                key={badge.id}
                className="flex w-28 shrink-0 snap-start flex-col items-center rounded-xl bg-surface-container-lowest p-2.5 text-center shadow-[0_3px_0px_#e1bfb8]"
              >
                <div
                  className={`mb-1.5 flex h-12 w-12 items-center justify-center rounded-full ${BADGE_TONES[index % BADGE_TONES.length]}`}
                >
                  <Icon name={badge.icon} className="text-[24px]" />
                </div>
                <span className="w-full truncate text-label-sm text-on-surface">{badge.name}</span>
                <span className="mt-1 flex items-center gap-0.5 rounded bg-secondary-container px-1.5 py-0.5 text-[10px] font-bold text-on-secondary-container">
                  <Icon name="check" className="text-[11px]" />
                  {badge.tag}
                </span>
              </div>
            ) : (
              <div
                key={badge.id}
                className="flex w-28 shrink-0 snap-start flex-col items-center rounded-xl bg-surface-container-low p-2.5 text-center shadow-[0_3px_0px_#eae0de]"
              >
                <div className="relative mb-1.5 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
                  <Icon name={badge.icon} className="text-[24px] opacity-40" />
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-inverse-surface/40">
                    <Icon name="lock" className="text-[16px] text-white" />
                  </div>
                </div>
                <span className="w-full truncate text-label-sm text-on-surface-variant">{badge.name}</span>
                {badge.progress !== undefined ? (
                  <div className="mt-1 flex w-full flex-col items-center">
                    <span className="text-[10px] font-bold text-on-surface-variant">{badge.progress}% 진행</span>
                    <div className="mt-0.5 h-1 w-14 overflow-hidden rounded-full bg-surface-variant">
                      <div className="h-full rounded-full bg-tertiary" style={{ width: `${badge.progress}%` }} />
                    </div>
                  </div>
                ) : (
                  <span className="mt-1 text-[10px] text-on-surface-variant">{badge.hint}</span>
                )}
              </div>
            )
          )}
        </div>
      </section>

      <section className="rounded-xl bg-surface-container-high p-space-md shadow-[0_4px_0px_#e1bfb8]">
        <div className="flex items-start justify-between gap-space-sm">
          <div className="flex flex-col">
            <span className="flex items-center gap-1 text-label-sm uppercase tracking-wider text-primary">
              <Icon name="event_upcoming" className="text-[16px]" />
              이달의 챌린지 퀘스트
            </span>
            <h3 className="mt-0.5 font-heading text-headline-md text-on-surface">{Q.title}</h3>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">{Q.reward}</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-tertiary-fixed text-tertiary shadow-[0_2px_0px_#ffb95f]">
            <Icon name={Q.icon} className="text-[28px]" />
          </div>
        </div>
        <div className="mt-space-sm">
          <div className="mb-1 flex justify-between text-label-sm">
            <span className="text-on-surface-variant">진행 상태</span>
            <span className="text-primary">
              {Q.progress.current} / {Q.progress.total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-container">
            <div className="h-full rounded-full bg-primary" style={{ width: `${questPercent}%` }} />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-space-sm flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon name="shelves" className="text-[20px] text-primary" />
            <h2 className="font-heading text-headline-md text-on-surface">공간별 도감 컬렉션</h2>
          </div>
          <span className="text-label-sm text-on-surface-variant">총 {locations.length}개 공간</span>
        </div>
        <div className="mb-space-sm flex gap-1.5 overflow-x-auto pb-space-sm">
          {chips.map((chip) => {
            const count = rows.filter((r) => matches[chip.key](r.percent)).length
            const active = filter === chip.key
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-label-md ${
                  active
                    ? 'bg-primary text-on-primary shadow-[0_2px_0px_#8b1901]'
                    : 'bg-surface-container text-on-surface-variant shadow-[0_2px_0px_#e1bfb8]'
                }`}
              >
                {chip.label} ({count})
              </button>
            )
          })}
        </div>
        <div className="flex flex-col gap-space-sm">
          {visible.map((row) => (
            <LocationDexCard
              key={row.location.id}
              rank={row.rank}
              location={row.location}
              percent={row.percent}
              owned={row.owned}
              total={row.total}
              onOpen={() => onOpen(row.location.id)}
            />
          ))}
          {visible.length === 0 && (
            <p className="text-body-sm text-on-surface-variant">해당하는 공간이 없어요.</p>
          )}
        </div>
      </section>

      <button
        type="button"
        disabled
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary p-3 text-label-lg text-on-primary shadow-[0_4px_0px_#8b1901] disabled:opacity-60"
      >
        <Icon name="barcode_scanner" className="text-[20px]" />
        바코드 찍고 새 아이템 도감 등록하기
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/CollectionOverview.tsx
git commit -m "feat: add CollectionOverview (profile, badges, quest, filtered dex cards)"
```

---

### Task 5: `CollectionDetail`

**Files:**
- Create: `src/components/CollectionDetail.tsx`

**Interfaces:**
- Consumes: `CategoryChecklist` (Task 3), `getLocationCompletion`, `getMasterItemCounts`, `Icon`, `LOCATION_MATERIAL_ICON`, `DUMMY_DETAIL_GOAL`.
- Produces: `CollectionDetail(props)` with props:
  `items: Item[]; locations: Location[]; categories: Category[]; location: Location; onBack: () => void; onSelectLocation: (id: string) => void; onRenameLocation: () => void; onRemoveLocation: () => void; onRenameCategory: (id: string, name: string) => void; onRemoveCategory: (id: string, name: string) => void; onRecord: () => void; onOpenItem: (itemId: string) => void`.

- [ ] **Step 1: Create the file**

```tsx
import type { Category, Item, Location } from '../types'
import { getLocationCompletion, getMasterItemCounts } from '../state/selectors'
import { CategoryChecklist } from './CategoryChecklist'
import { Icon, LOCATION_MATERIAL_ICON } from '../data/materialIcons'
import { DUMMY_DETAIL_GOAL } from '../data/collectionDummy'

export function CollectionDetail({
  items,
  locations,
  categories,
  location,
  onBack,
  onSelectLocation,
  onRenameLocation,
  onRemoveLocation,
  onRenameCategory,
  onRemoveCategory,
  onRecord,
  onOpenItem,
}: {
  items: Item[]
  locations: Location[]
  categories: Category[]
  location: Location
  onBack: () => void
  onSelectLocation: (id: string) => void
  onRenameLocation: () => void
  onRemoveLocation: () => void
  onRenameCategory: (id: string, name: string) => void
  onRemoveCategory: (id: string, name: string) => void
  onRecord: () => void
  onOpenItem: (itemId: string) => void
}) {
  const locationCategories = categories.filter((c) => c.locationId === location.id)
  const percent = getLocationCompletion(items, location.id, categories)
  const counts = getMasterItemCounts(items, categories, location.id)
  const icon = LOCATION_MATERIAL_ICON[location.colorToken] ?? 'inventory_2'

  return (
    <div className="flex flex-col gap-space-md p-margin">
      <div className="flex items-center justify-between gap-space-sm">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex shrink-0 items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant"
          >
            <Icon name="arrow_back" className="text-[16px]" />
            도감 목록
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-on-surface-variant">
          <button type="button" aria-label="장소 이름 수정" onClick={onRenameLocation} className="p-1">
            <Icon name="edit" className="text-[20px]" />
          </button>
          <button type="button" aria-label="장소 삭제" onClick={onRemoveLocation} className="p-1">
            <Icon name="delete" className="text-[20px]" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Icon name={icon} className="text-[28px] text-primary" />
        <h1 className="truncate font-heading text-headline-lg text-on-surface">{location.name} 도감</h1>
        <span className="shrink-0 rounded-full bg-secondary-container px-2 py-0.5 text-label-sm text-on-secondary-container">
          {percent >= 100 ? '완성' : '진행중'}
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-space-xs">
        {locations.map((l) => {
          const c = getMasterItemCounts(items, categories, l.id)
          const active = l.id === location.id
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onSelectLocation(l.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-label-md ${
                active
                  ? 'bg-primary text-on-primary shadow-[0_2px_0px_#8b1901]'
                  : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {l.name} ({c.owned}/{c.total})
            </button>
          )
        })}
      </div>

      <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]">
        <div className="flex items-center justify-between gap-space-sm">
          <div className="flex min-w-0 flex-col">
            <span className="font-heading text-headline-md text-on-surface">도감 마스터리</span>
            <span className="text-body-sm text-on-surface-variant">
              표준 소모품 {counts.total}종 중 <span className="text-primary">{counts.owned}개</span> 채움
            </span>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-md text-primary">
            {percent}%
          </div>
        </div>
        <div className="mt-space-sm h-2 w-full overflow-hidden rounded-full bg-surface-container">
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-label-sm text-on-surface-variant">{DUMMY_DETAIL_GOAL}</p>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-surface-container-low p-space-sm text-body-sm text-on-surface-variant">
        <Icon name="map" className="text-[20px] text-tertiary" />
        표준 소모품 {locationCategories.length}개 카테고리 분류 기준
      </div>

      {locationCategories.map((category) => (
        <CategoryChecklist
          key={category.id}
          category={category}
          items={items}
          onRename={() => onRenameCategory(category.id, category.name)}
          onRemove={() => onRemoveCategory(category.id, category.name)}
          onRecord={onRecord}
          onOpenItem={onOpenItem}
        />
      ))}

      <div className="sticky bottom-20 z-40 flex items-stretch gap-space-sm md:bottom-4">
        <button
          type="button"
          onClick={onRecord}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface-container-lowest p-3 text-label-lg text-on-surface shadow-[0_4px_12px_rgba(0,0,0,0.08),0_3px_0px_rgba(43,38,37,0.12)] active:translate-y-0.5"
        >
          <Icon name="add_box" className="text-[20px] text-primary" />
          아이템 직접등록
        </button>
        <button
          type="button"
          disabled
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary p-3 text-label-lg text-on-primary shadow-[0_4px_12px_rgba(170,48,21,0.25),0_4px_0px_#8b1901] disabled:opacity-60"
        >
          <Icon name="barcode_scanner" className="text-[20px]" />
          바코드 찍고 채우기
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/CollectionDetail.tsx
git commit -m "feat: add CollectionDetail (mastery card, checklists, dock)"
```

---

### Task 6: `CollectionPage` rewrite + dead-code removal

**Files:**
- Modify: `src/pages/CollectionPage.tsx` (whole file)
- Delete: `src/components/LocationIcon.tsx`, `src/data/locationEmoji.ts`

**Interfaces:**
- Consumes: `CollectionOverview`, `CollectionDetail` (Tasks 4-5).

- [ ] **Step 1: Replace `src/pages/CollectionPage.tsx` entirely with**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { CollectionOverview } from '../components/CollectionOverview'
import { CollectionDetail } from '../components/CollectionDetail'

export default function CollectionPage() {
  const { items, locations, categories, renameLocation, removeLocation, renameCategory, removeCategory } =
    useLocker()
  const navigate = useNavigate()
  const [openLocationId, setOpenLocationId] = useState<string | null>(null)
  const openLocation = locations.find((l) => l.id === openLocationId) ?? null

  function handleRenameLocation(id: string, currentName: string) {
    const next = window.prompt('장소 이름 수정', currentName)
    if (next && next.trim()) renameLocation(id, next.trim())
  }

  function handleRemoveLocation(id: string, name: string) {
    if (locations.length <= 1) {
      window.alert('마지막 남은 장소는 삭제할 수 없습니다.')
      return
    }
    if (window.confirm(`"${name}" 장소를 삭제하면 그 안의 카테고리와 상품도 함께 삭제됩니다. 계속할까요?`)) {
      removeLocation(id)
      if (openLocationId === id) setOpenLocationId(null)
    }
  }

  function handleRenameCategory(id: string, currentName: string) {
    const next = window.prompt('카테고리 이름 수정', currentName)
    if (next && next.trim()) renameCategory(id, next.trim())
  }

  function handleRemoveCategory(id: string, name: string) {
    if (categories.length <= 1) {
      window.alert('마지막 남은 카테고리는 삭제할 수 없습니다.')
      return
    }
    if (window.confirm(`"${name}" 카테고리를 삭제하면 그 안의 상품도 함께 삭제됩니다. 계속할까요?`)) {
      removeCategory(id)
    }
  }

  if (!openLocation) {
    return (
      <CollectionOverview
        items={items}
        locations={locations}
        categories={categories}
        onOpen={setOpenLocationId}
      />
    )
  }

  return (
    <CollectionDetail
      items={items}
      locations={locations}
      categories={categories}
      location={openLocation}
      onBack={() => setOpenLocationId(null)}
      onSelectLocation={setOpenLocationId}
      onRenameLocation={() => handleRenameLocation(openLocation.id, openLocation.name)}
      onRemoveLocation={() => handleRemoveLocation(openLocation.id, openLocation.name)}
      onRenameCategory={handleRenameCategory}
      onRemoveCategory={handleRemoveCategory}
      onRecord={() => navigate('/new')}
      onOpenItem={(itemId) => navigate(`/item/${itemId}`)}
    />
  )
}
```

- [ ] **Step 2: Confirm the dead code has no importers, then delete it**

Run: `grep -rnE "LocationIcon|locationEmoji|LOCATION_EMOJI" src | grep -v "^src/components/LocationIcon.tsx" | grep -v "^src/data/locationEmoji.ts"`
Expected: no output. If anything prints, STOP and report instead of deleting.

Then:

```bash
git rm src/components/LocationIcon.tsx src/data/locationEmoji.ts
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` (clean) and `npx vitest run` (53 tests pass: 50 existing + 3 new).

- [ ] **Step 4: Commit**

```bash
git add src/pages/CollectionPage.tsx
git commit -m "feat: port CollectionPage to Stitch design; remove dead LocationIcon/locationEmoji"
```

---

### Task 7: Verification

**Files:** none (verification only)

- [ ] **Step 1: Automated suite**

Run `npx tsc --noEmit`, `npx vitest run`, `npm run test:server`, `npm run build`. Expected: all pass (53 frontend, 8 server).

- [ ] **Step 2: Tailwind class existence check**

Create `_check-classes.mjs` in the repo root (delete it afterwards, do not commit) with:

```js
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BS = String.fromCharCode(92)
const out = join(tmpdir(), 'check-out.css')
execSync(`npx tailwindcss -c tailwind.config.ts -i src/index.css -o "${out}"`, { stdio: 'ignore' })
const css = readFileSync(out, 'utf8')
const files = [
  'src/components/LocationDexCard.tsx',
  'src/components/CategoryChecklist.tsx',
  'src/components/CollectionOverview.tsx',
  'src/components/CollectionDetail.tsx',
  'src/pages/CollectionPage.tsx',
]
const esc = (tok) => tok.replace(/[^a-zA-Z0-9_-]/g, (c) => (c === ',' ? BS + '2c ' : BS + c))
let missing = 0
let checked = 0
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  for (const m of src.matchAll(/(["'`])((?:(?!\1)[^\n])*)\1/g)) {
    for (const tok of m[2].split(/\s+/).filter(Boolean)) {
      if (!/^[a-z!-][a-z0-9:\/\[\]\(\)\.,#%_-]*$/.test(tok) || !/[-:\[]/.test(tok)) continue
      if (/^(\.\.|\/|@|node:)/.test(tok) || tok.includes('.tsx') || tok.includes('/api')) continue
      checked++
      if (!css.includes('.' + esc(tok))) {
        console.log(`MISSING in ${f}: ${tok}`)
        missing++
      }
    }
  }
}
console.log(`checked ${checked} tokens;`, missing === 0 ? 'ALL CLASSES OK' : `${missing} missing`)
```

Run `node ./_check-classes.mjs`, then `rm -f ./_check-classes.mjs`. Expected: only false positives that are NOT class names (e.g. `react-router-dom`, Korean/other prose tokens that happen to match the pattern, icon names like `event_upcoming`/`auto_stories` which contain `_`... those have no `-`/`:`/`[` so are skipped). Any MISSING that is a real class is a defect. Also run `grep -rnE "font-(display|headline|body|label|stat)-" src` — expected no output.

- [ ] **Step 3: Manual walkthrough (`npm run dev`)**

Compare against `remembuy_3` and `_4` screenshots at mobile and tablet widths. Confirm: overview shows profile/badges/quest/filter chips/location cards; chips filter and counts match; clicking a card opens the detail; back returns; space chips switch location; rename/delete location and category work with the same prompts/alerts (deleting the open location returns to the overview); owned rows show item name and D-day, "관리" opens `/item/:id`; missing rows' "기록하기" and "아이템 직접등록" go to `/new`; barcode buttons are disabled; dock does not hide behind the mobile bottom nav.

- [ ] **Step 4: Commit fixes only if needed.**
