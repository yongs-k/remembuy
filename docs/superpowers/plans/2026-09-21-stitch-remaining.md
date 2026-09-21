# Stitch Remaining Pages & Legacy Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the last pages/components off the legacy styling, then delete the legacy tokens/classes that grep proves unused.

**Architecture:** Markup-only ports (shared components first, then Notifications, Family, ItemDetail, HomePage leftovers), then a guarded cleanup task, then a whole-`src` class-existence scan that proves nothing references a removed class.

**Tech Stack:** React + TypeScript + Tailwind; `Icon` helper; Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-21-stitch-remaining-design.md`.
- Tailwind: font-size scale classes are `text-display-lg|display-sm|headline-lg|headline-md|body-lg|body-md|body-sm|label-lg|label-md|label-sm|stat-counter`. There is NO `font-<scale>` class — only `font-heading` and `font-body`. `scrollbar-none` does not exist.
- Spacing tokens: `space-xs|sm|md|lg|xl`, `gutter`, `margin` (e.g. `p-space-md`, `p-margin`).
- Icons only via `<Icon name="..." className="..." />`.
- Keep every existing behavior and Korean text exactly (texts inside the new code blocks are authoritative).
- D-day pill rule everywhere: `bg-error-container text-on-error-container` when D <= 7, otherwise `bg-surface-container-high text-on-surface-variant`.
- The `ink` color token STAYS (used by `border-ink` in `AppLayout`/`HomePage`).
- `npx tsc --noEmit` clean and vitest green after every task (63 tests before this plan; Task 6 removes the 3 ProgressRing tests -> 60).

## File Structure

```
src/components/Badge.tsx, RecommendationBadge.tsx, RecommendationToggle.tsx, ItemCard.tsx  # Task 1: whole files
src/pages/NotificationsPage.tsx   # Task 2: whole file
src/pages/FamilyPage.tsx          # Task 3: whole file
src/pages/ItemDetailPage.tsx      # Task 4: whole file
src/pages/HomePage.tsx            # Task 5: 7 targeted edits
src/index.css, tailwind.config.ts # Task 6: cleanup
src/components/ProgressRing.tsx + .test.tsx  # Task 6: delete
```

---

### Task 1: Shared components

**Files:**
- Modify (whole file): `src/components/Badge.tsx`, `src/components/RecommendationBadge.tsx`, `src/components/RecommendationToggle.tsx`, `src/components/ItemCard.tsx`

- [ ] **Step 1: Replace `src/components/Badge.tsx` with**

```tsx
import type { ReactNode } from 'react'

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-tertiary-fixed px-2 py-0.5 text-label-sm text-on-tertiary-fixed">
      {children}
    </span>
  )
}
```

- [ ] **Step 2: Replace `src/components/RecommendationBadge.tsx` with**

```tsx
import { Icon } from '../data/materialIcons'

export function RecommendationBadge({
  recommendation,
}: {
  recommendation: 'recommend' | 'notRecommend'
}) {
  if (recommendation === 'recommend') {
    return (
      <span className="inline-flex items-center gap-1 text-body-sm text-secondary">
        <Icon name="thumb_up" className="text-[14px]" />
        추천해요
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant">
      <Icon name="thumb_down" className="text-[14px]" />
      비추천해요
    </span>
  )
}
```

- [ ] **Step 3: Replace `src/components/RecommendationToggle.tsx` with**

```tsx
import { Icon } from '../data/materialIcons'

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
        aria-pressed={value === 'recommend'}
        onClick={() => onChange('recommend')}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-label-md ${
          value === 'recommend'
            ? 'bg-secondary text-on-secondary shadow-[0_2px_0px_#304c46]'
            : 'bg-surface-container-high text-on-surface'
        }`}
      >
        <Icon name="thumb_up" className="text-[18px]" />
        추천해요
      </button>
      <button
        type="button"
        aria-pressed={value === 'notRecommend'}
        onClick={() => onChange('notRecommend')}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-label-md ${
          value === 'notRecommend'
            ? 'bg-primary text-on-primary shadow-[0_2px_0px_#8b1901]'
            : 'bg-surface-container-high text-on-surface'
        }`}
      >
        <Icon name="thumb_down" className="text-[18px]" />
        비추천해요
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Replace `src/components/ItemCard.tsx` with**

```tsx
import type { Item } from '../types'
import { Icon } from '../data/materialIcons'
import { RecommendationBadge } from './RecommendationBadge'

export function ItemCard({ item, onClick }: { item: Item; onClick: () => void }) {
  const urgent = item.daysUntilEmpty !== undefined && item.daysUntilEmpty <= 7
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl bg-surface-container-lowest p-space-md text-left shadow-[0_3px_0px_#eae0de]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
        <Icon name="inventory_2" className="text-[24px]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-label-lg text-on-surface">{item.name}</p>
        {item.recommendation !== undefined ? (
          <RecommendationBadge recommendation={item.recommendation} />
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
      </div>
      <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
    </button>
  )
}
```

- [ ] **Step 5: Verify** — `npx tsc --noEmit` clean; `npx vitest run` (63 pass).

- [ ] **Step 6: Commit**

```bash
git add src/components/Badge.tsx src/components/RecommendationBadge.tsx src/components/RecommendationToggle.tsx src/components/ItemCard.tsx
git commit -m "feat: port shared item components to Stitch tokens"
```

---

### Task 2: `NotificationsPage`

**Files:**
- Modify (whole file): `src/pages/NotificationsPage.tsx`

- [ ] **Step 1: Replace the file with** (hooks, effect and navigation are the original code, unchanged)

```tsx
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications } from '../state/selectors'
import { useSeenNotifications } from '../hooks/useSeenNotifications'
import { Icon } from '../data/materialIcons'

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
            const urgent = item.daysUntilEmpty !== undefined && item.daysUntilEmpty <= 7
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
                    D-{item.daysUntilEmpty}
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

- [ ] **Step 2: Verify** — `npx tsc --noEmit` clean; `npx vitest run` (63 pass).

- [ ] **Step 3: Commit**

```bash
git add src/pages/NotificationsPage.tsx
git commit -m "feat: port NotificationsPage to Stitch tokens"
```

---

### Task 3: `FamilyPage`

**Files:**
- Modify (whole file): `src/pages/FamilyPage.tsx`

- [ ] **Step 1: Replace the file with**

```tsx
import { useState } from 'react'
import { FAMILY_MEMBERS } from '../data/familyData'
import { Icon } from '../data/materialIcons'

export default function FamilyPage() {
  const [invited, setInvited] = useState(false)

  return (
    <div className="space-y-space-md p-margin">
      <h1 className="flex items-center gap-1.5 font-heading text-headline-lg text-on-surface">
        <Icon name="groups_2" className="text-[24px] text-secondary" />
        가족 케어
      </h1>

      <ul className="space-y-space-sm">
        {FAMILY_MEMBERS.map((member) => (
          <li
            key={member.id}
            className="rounded-xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]"
          >
            <div className="flex items-center gap-space-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary shadow-[0_2px_0px_#304c46]">
                {member.name.slice(0, 1)}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="font-heading text-headline-md text-on-surface">{member.name}</span>
                <span className="text-label-sm text-on-surface-variant">{member.relation}</span>
              </div>
            </div>
            <ul className="mt-space-sm space-y-1.5">
              {member.items.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low px-space-sm py-2"
                >
                  <span className="min-w-0 truncate text-body-sm text-on-surface">{item.itemName}</span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-label-sm ${
                      item.daysUntilEmpty <= 7
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    D-{item.daysUntilEmpty}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setInvited(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary p-3 text-label-lg text-on-primary shadow-[0_4px_0px_#8b1901] active:translate-y-0.5 active:shadow-[0_1px_0px_#8b1901]"
      >
        <Icon name="person_add" className="text-[18px]" />
        가족 초대하기
      </button>
      <p role="status" aria-live="polite" className="text-center text-body-sm text-secondary">
        {invited ? '초대 링크는 아직 준비 중이에요. (MVP에서는 실제 초대가 불가합니다)' : ''}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` clean; `npx vitest run` (63 pass).

- [ ] **Step 3: Commit**

```bash
git add src/pages/FamilyPage.tsx
git commit -m "feat: port FamilyPage to Stitch tokens"
```

---

### Task 4: `ItemDetailPage`

**Files:**
- Modify (whole file): `src/pages/ItemDetailPage.tsx`

- [ ] **Step 1: Replace the file with** (hooks, `updateItem` call, edit navigation, affiliate link, related items and not-found texts are the original behavior)

```tsx
import { useNavigate, useParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { RecommendationToggle } from '../components/RecommendationToggle'
import { ItemCard } from '../components/ItemCard'
import { Icon } from '../data/materialIcons'

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { items, locations, categories, updateItem } = useLocker()
  const item = items.find((i) => i.id === id)

  if (!item) {
    return (
      <div className="space-y-space-sm p-margin">
        <p className="text-body-md text-on-surface">상품을 찾을 수 없습니다.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-label-md text-primary underline"
        >
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
  const urgent = item.daysUntilEmpty !== undefined && item.daysUntilEmpty <= 7

  return (
    <div className="space-y-space-md p-margin">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 self-start rounded-full bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant"
      >
        <Icon name="arrow_back" className="text-[16px]" />
        뒤로
      </button>

      <div className="rounded-2xl bg-surface-container-lowest p-space-md shadow-[0_4px_0px_#e1bfb8]">
        <div className="flex gap-space-md">
          <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
            <Icon name="inventory_2" className="text-[36px]" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5 text-label-sm">
              {location && (
                <span className="rounded bg-secondary-container px-1.5 py-0.5 text-on-secondary-container">
                  {location.name}
                </span>
              )}
              {category && (
                <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-on-surface-variant">
                  {category.name}
                </span>
              )}
            </div>
            <h1 className="font-heading text-headline-lg text-on-surface">{item.name}</h1>
            {item.price !== undefined && (
              <span className="font-heading text-headline-md text-primary">
                {item.price.toLocaleString()}원
              </span>
            )}
            {item.daysUntilEmpty !== undefined && (
              <span
                className={`self-start rounded px-1.5 py-0.5 text-label-sm ${
                  urgent
                    ? 'bg-error-container text-on-error-container'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                D-{item.daysUntilEmpty}
              </span>
            )}
          </div>
        </div>
      </div>

      {item.daysUntilEmpty === undefined && (
        <RecommendationToggle
          value={item.recommendation}
          onChange={(value) => updateItem(item.id, { recommendation: value })}
        />
      )}

      {item.note && (
        <p className="rounded-xl bg-surface-container-lowest p-space-md text-body-sm text-on-surface shadow-[0_3px_0px_#eae0de]">
          {item.note}
        </p>
      )}

      {(item.place || item.restockCycle) && (
        <dl className="space-y-1.5 rounded-xl bg-surface-container-low p-space-md text-body-sm">
          {item.place && (
            <div className="flex justify-between gap-2">
              <dt className="text-on-surface-variant">구매처</dt>
              <dd className="text-on-surface">{item.place}</dd>
            </div>
          )}
          {item.restockCycle && (
            <div className="flex justify-between gap-2">
              <dt className="text-on-surface-variant">재구매 주기</dt>
              <dd className="text-on-surface">{item.restockCycle}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="flex items-stretch gap-2">
        {item.affiliateUrl ? (
          <a
            href={item.affiliateUrl}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary p-3 text-label-lg text-on-primary shadow-[0_4px_0px_#8b1901] active:translate-y-0.5"
          >
            <Icon name="shopping_cart" className="text-[18px]" />
            구매하기
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="flex flex-1 items-center justify-center rounded-xl bg-surface-container p-3 text-label-lg text-on-surface-variant opacity-60"
          >
            구매 링크 없음
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate(`/new?editId=${item.id}`)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface-container-lowest p-3 text-label-lg text-on-surface shadow-[0_3px_0px_#e1bfb8] active:translate-y-0.5"
        >
          <Icon name="edit_note" className="text-[18px]" />
          메모 수정하기
        </button>
      </div>

      {relatedItems.length > 0 && (
        <section className="space-y-space-sm">
          <h2 className="text-label-lg text-on-surface-variant">이런 상품은 어때요?</h2>
          <div className="space-y-space-sm">
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

- [ ] **Step 2: Verify** — `npx tsc --noEmit` clean; `npx vitest run` (63 pass).

- [ ] **Step 3: Commit**

```bash
git add src/pages/ItemDetailPage.tsx
git commit -m "feat: port ItemDetailPage to Stitch tokens"
```

---

### Task 5: `HomePage` leftover legacy styling

**Files:**
- Modify: `src/pages/HomePage.tsx` (7 targeted edits; touch nothing else)

- [ ] **Step 1: Search-results empty text**

Find: `            <p className="text-sm text-ink/50">검색 결과가 없습니다.</p>`
Replace: `            <p className="text-body-sm text-on-surface-variant">검색 결과가 없습니다.</p>`

- [ ] **Step 2: "전체보기 →"**

Find: `            <span className="text-sm text-ink/40">전체보기 →</span>`
Replace: `            <span className="text-label-md text-on-surface-variant">전체보기 →</span>`

- [ ] **Step 3: Back button**

Find:

```tsx
        <button type="button" onClick={handleBack} className="text-sm text-ink/60">
          ← 뒤로
        </button>
```

Replace with:

```tsx
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1 self-start rounded-full bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant"
        >
          <Icon name="arrow_back" className="text-[16px]" />
          뒤로
        </button>
```

- [ ] **Step 4: Category buttons**

Find:

```tsx
                className="chunky-btn rounded-2xl bg-card p-3 text-left"
              >
                <p className="font-medium">{category.name}</p>
                <p className="text-xs text-ink/50">{count}개 보유</p>
```

Replace with:

```tsx
                className="rounded-xl bg-surface-container-lowest p-space-md text-left shadow-[0_3px_0px_#eae0de]"
              >
                <p className="text-label-lg text-on-surface">{category.name}</p>
                <p className="text-body-sm text-on-surface-variant">{count}개 보유</p>
```

- [ ] **Step 5: Filter pills**

Find the whole block:

```tsx
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-full border-2 border-ink px-3 py-1 text-sm ${
                filter === 'all' ? 'bg-stamp text-white' : 'bg-card text-ink'
              }`}
            >
              전체
            </button>
            <button
              type="button"
              onClick={() => setFilter('urgent')}
              className={`rounded-full border-2 border-ink px-3 py-1 text-sm ${
                filter === 'urgent' ? 'bg-stamp text-white' : 'bg-card text-ink'
              }`}
            >
              임박만
            </button>
            <button
              type="button"
              onClick={() => setFilter('recommended')}
              className={`rounded-full border-2 border-ink px-3 py-1 text-sm ${
                filter === 'recommended' ? 'bg-stamp text-white' : 'bg-card text-ink'
              }`}
            >
              추천한 상품만
            </button>
          </div>
```

Replace with:

```tsx
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['all', '전체'],
                ['urgent', '임박만'],
                ['recommended', '추천한 상품만'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1.5 text-label-md ${
                  filter === key
                    ? 'bg-primary text-on-primary shadow-[0_2px_0px_#8b1901]'
                    : 'bg-surface-container text-on-surface-variant shadow-[0_2px_0px_#e1bfb8]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
```

- [ ] **Step 6: Category-empty text**

Find: `              <p className="text-sm text-ink/50">조건에 맞는 상품이 없습니다.</p>`
Replace: `              <p className="text-body-sm text-on-surface-variant">조건에 맞는 상품이 없습니다.</p>`

- [ ] **Step 7: Link sub-sheet**

Find the block starting at `<p className="pb-1 text-center text-sm text-ink/50">상품 링크를 붙여넣어주세요</p>` through the "뒤로" button (the whole fragment inside the `showLinkInput` branch):

```tsx
                <p className="pb-1 text-center text-sm text-ink/50">상품 링크를 붙여넣어주세요</p>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="chunky-input w-full bg-paper p-2 text-sm"
                  disabled={isAnalyzing}
                />
                {analyzeError && <p className="text-sm text-stamp">{analyzeError}</p>}
                <button
                  type="button"
                  onClick={handleAnalyzeLink}
                  disabled={isAnalyzing || !linkUrl.trim()}
                  className="chunky-btn w-full rounded-xl bg-stamp py-2 text-sm text-white disabled:opacity-40 disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-chunky"
                >
                  {isAnalyzing ? '분석 중...' : '분석하기'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="w-full pt-1 text-center text-sm text-accent underline"
                >
                  직접 입력하기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkInput(false)
                    setAnalyzeError(null)
                  }}
                  className="w-full pt-1 text-center text-sm text-ink/50"
                >
                  뒤로
                </button>
```

Replace with:

```tsx
                <p className="pb-1 text-center text-body-sm text-on-surface-variant">
                  상품 링크를 붙여넣어주세요
                </p>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border-2 border-transparent bg-surface-container-low p-2.5 text-body-md text-on-surface focus:border-primary focus:outline-none"
                  disabled={isAnalyzing}
                />
                {analyzeError && (
                  <p role="alert" className="text-body-sm text-primary">
                    {analyzeError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleAnalyzeLink}
                  disabled={isAnalyzing || !linkUrl.trim()}
                  className="w-full rounded-xl bg-primary py-2.5 text-label-lg text-on-primary shadow-[0_3px_0px_#8b1901] active:translate-y-0.5 active:shadow-[0_1px_0px_#8b1901] disabled:opacity-40 disabled:active:translate-y-0 disabled:active:shadow-[0_3px_0px_#8b1901]"
                >
                  {isAnalyzing ? '분석 중...' : '분석하기'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="w-full pt-1 text-center text-label-md text-primary underline"
                >
                  직접 입력하기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkInput(false)
                    setAnalyzeError(null)
                  }}
                  className="w-full pt-1 text-center text-label-md text-on-surface-variant"
                >
                  뒤로
                </button>
```

- [ ] **Step 8: Verify**

Run `git diff HEAD --stat` (only `src/pages/HomePage.tsx` changed), `npx tsc --noEmit` (clean), `npx vitest run` (63 pass), and `grep -nE "chunky|bg-card|bg-paper|bg-stamp|text-stamp|text-accent|text-ink" src/pages/HomePage.tsx` — expected: no output.

- [ ] **Step 9: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: replace remaining legacy styling in HomePage"
```

---

### Task 6: Legacy cleanup (guarded)

**Files:**
- Modify: `src/index.css`, `tailwind.config.ts`
- Delete: `src/components/ProgressRing.tsx`, `src/components/ProgressRing.test.tsx`

- [ ] **Step 1: Prove the legacy classes are unused**

Run:

```bash
grep -rnE "chunky|\b(bg|text|border|ring|from|to|via|fill|stroke|divide|placeholder)-(paper|card|stamp|accent|warn)\b|-loc-" src --include=*.tsx --include=*.ts
```

Expected: NO output. If anything prints, STOP and report BLOCKED with the output (do not delete anything).

Then run `grep -rn "ProgressRing" src --include=*.tsx --include=*.ts | grep -v "^src/components/ProgressRing"` — expected: no output (its only importer is its own test).

- [ ] **Step 2: Replace `src/index.css` with**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-surface text-on-surface font-body;
}

h1, h2, h3 {
  @apply font-heading;
}
```

- [ ] **Step 3: Edit `tailwind.config.ts`**

Find:

```ts
        paper: '#E9DFC3',
        card: '#F8F2E2',
        ink: '#2A2420',
        stamp: '#B0472E',
        accent: '#3F6459',
        warn: '#B9822C',
        loc: {
          bathroom: '#6E8F87',
          kitchen: '#C98F2B',
          laundry: '#7D93A6',
          closet: '#B0472E',
          vanity: '#A9789A',
          bedroom: '#8A8F6E',
          livingroom: '#9C8B5E',
          entrance: '#6F7D5C',
          medicine: '#B0763F',
          car: '#5C7A8B',
        },
        // Material-3-style tokens from the Stitch design export
        // (docs/superpowers/specs/2026-09-18-stitch-foundation-design.md).
        // Additive only — used by later per-screen migration sub-projects.
```

Replace with:

```ts
        ink: '#2A2420',
        // Material-3-style tokens from the Stitch design export
        // (docs/superpowers/specs/2026-09-18-stitch-foundation-design.md).
```

Find:

```ts
        chunky: '4px 4px 0 0 #2A2420',
```

Replace with nothing (delete that line; keep the `elevation-*` entries).

- [ ] **Step 4: Delete the dead component**

Run the tests first to record the count: `npx vitest run 2>&1 | grep -E "Tests "` (expect 63). Then:

```bash
git rm src/components/ProgressRing.tsx src/components/ProgressRing.test.tsx
```

- [ ] **Step 5: Verify**

Run `npx tsc --noEmit` (clean), `npx vitest run` (expect exactly 60 pass — 3 fewer), `npm run build` (succeeds), and re-run the Step 1 grep — expected: still no output.

- [ ] **Step 6: Commit**

```bash
git add src/index.css tailwind.config.ts
git commit -m "chore: remove legacy chunky classes/tokens and dead ProgressRing"
```

---

### Task 7: Verification

**Files:** none (verification only)

- [ ] **Step 1: Automated suite**

Run `npx tsc --noEmit`, `npx vitest run`, `npm run test:server`, `npm run build`. Expected: all pass (60 frontend, 8 server).

- [ ] **Step 2: Whole-`src` class-existence scan (proves the removed tokens are truly unreferenced)**

Create `_check-classes.mjs` in the repo root with a FILE-WRITING tool (not a shell heredoc), run it, then delete it (do not commit):

```js
import { readFileSync, readdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BS = String.fromCharCode(92)
const out = join(tmpdir(), 'check-out.css')
execSync(`npx tailwindcss -c tailwind.config.ts -i src/index.css -o "${out}"`, { stdio: 'ignore' })
const css = readFileSync(out, 'utf8')
const files = readdirSync('src', { recursive: true })
  .map((f) => join('src', String(f)))
  .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'))
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
console.log(`checked ${checked} tokens in ${files.length} files;`, missing === 0 ? 'ALL CLASSES OK' : `${missing} missing`)
```

Expected: every MISSING is a non-class string (import paths such as `react-router-dom`, `https://...`, route strings, icon names containing `-`/`:` if any). ANY missing that looks like a Tailwind class (for example `text-ink` variants are fine because `ink` stays; `bg-card`, `chunky-*`, `text-accent` would NOT be) is a defect: report it, do not hide it.

Also run `grep -rnE "font-(display|headline|body|label|stat)-|scrollbar-none" src` — expected no output.

- [ ] **Step 3: Manual walkthrough (`npm run dev`)**

Confirm at mobile and tablet widths: the page background is the warm off-white everywhere (including outside the 820px column on wide screens); Notifications (with and without urgent items, with and without purchase links); Family (invite button shows the message and it is announced); Item Detail (with/without price, note, place, cycle, D-day vs recommendation toggle, related items, edit navigation, not-found via a bad id); Home drill-down (category buttons, filter pills toggling, back button, link sub-sheet incl. the error message and disabled button); New-item page still looks right (recommendation toggle restyled).

- [ ] **Step 4: Commit fixes only if needed.**
