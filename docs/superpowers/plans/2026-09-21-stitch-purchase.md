# Stitch Purchase Page Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Stitch purchase mockup (`remembuy_5`) onto `PurchasePage` — visual only, static dummy data, one shared "준비 중" snackbar for every action button.

**Architecture:** Extend `purchaseDummy.ts` (new data + a tested `percentOff` helper), add three presentational components (`ButlerHero`, `DealCard`, `GroupBuyCard`), and rewrite `PurchasePage` to hold two pieces of state (deal filter, snackbar) and pick a real hero item when one is about to run out.

**Tech Stack:** React + TypeScript + Tailwind; `Icon` helper; Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-21-stitch-purchase-design.md`.
- Tailwind: font-size scale classes are `text-display-lg|display-sm|headline-lg|headline-md|body-lg|body-md|body-sm|label-lg|label-md|label-sm|stat-counter`. There is NO `font-<scale>` class — only `font-heading` and `font-body`. `scrollbar-none` does not exist. `line-clamp-2` exists (Tailwind 3.4).
- Spacing tokens: `space-xs|sm|md|lg|xl`, `gutter`, `margin` (e.g. `p-space-md`, `gap-space-sm`, `p-margin`).
- Icons only via `<Icon name="..." className="..." />`.
- Every action button calls the shared `onAction` callback (no navigation, no `alert()`); buttons stay enabled and visually normal.
- `DUMMY_PROFILE.name` in `homeDummy.ts` is already `'지음님'` (it includes 님) — do not append another 님.
- Copy Korean text and typographic characters exactly as written in the plan's code blocks.
- `npx tsc --noEmit` clean and vitest green after every task (55 tests before this plan; Task 1 adds 3).

## File Structure

```
src/data/purchaseDummy.ts        # Modify: add new data + percentOff (Task 1); remove the 3 old lists (Task 5)
src/data/purchaseDummy.test.ts   # Create: percentOff tests
src/components/ButlerHero.tsx    # Create
src/components/DealCard.tsx      # Create
src/components/GroupBuyCard.tsx  # Create
src/pages/PurchasePage.tsx       # Modify: whole file (Task 5)
```

---

### Task 1: Dummy data + `percentOff` (TDD)

**Files:**
- Create: `src/data/purchaseDummy.test.ts`
- Modify: `src/data/purchaseDummy.ts` (APPEND the new code below the existing exports; the three old lists stay until Task 5 removes them, so `tsc` stays clean)

**Interfaces:**
- Produces: `percentOff(original: number, price: number): number`; `DUMMY_BUTLER`; `DealKind = 'owned' | 'unowned'`; `DummyDeal`; `DUMMY_DEALS: DummyDeal[]`; `DummyParty`; `DUMMY_PARTIES: { featured: DummyParty; compact: DummyParty[] }`.

- [ ] **Step 1: Write the failing test**

Create `src/data/purchaseDummy.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { percentOff, DUMMY_DEALS } from './purchaseDummy'

describe('percentOff', () => {
  it('rounds the discount percentage', () => {
    expect(percentOff(58000, 42000)).toBe(28)
    expect(percentOff(12900, 8900)).toBe(31)
    expect(percentOff(30000, 19800)).toBe(34)
  })

  it('returns 0 when there is no valid original price', () => {
    expect(percentOff(0, 5000)).toBe(0)
  })

  it('every dummy deal is actually discounted', () => {
    for (const deal of DUMMY_DEALS) {
      expect(percentOff(deal.originalPrice, deal.price)).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/data/purchaseDummy.test.ts`
Expected: FAIL (`percentOff` / `DUMMY_DEALS` not exported).

- [ ] **Step 3: Append the following to the END of `src/data/purchaseDummy.ts` (leave every existing line untouched)**

```ts
export function percentOff(original: number, price: number): number {
  if (original <= 0) return 0
  return Math.round((1 - price / original) * 100)
}

export const DUMMY_BUTLER = {
  fallback: { name: '아로마티카 티트리 샴푸 400ml', locationName: '욕실', daysUntilEmpty: 5 },
  rankTag: 'RARE #01',
  slotLabel: '도감 슬롯',
  cycleDays: 90,
  remainPercent: 18,
  remainText: '약 72ml 남음',
  price: 18900,
  originalPrice: 24000,
  lowestNote: '역대 최저가 근접',
  next: {
    name: '루치펠로 루이스랜드 치약',
    dday: 'D-14',
    note: '소진 예상일: 다음 주 목요일 · 사전 세일 모니터링',
  },
}

export type DealKind = 'owned' | 'unowned'

export type DummyDeal = {
  id: string
  kind: DealKind
  badge: string
  tag: string
  name: string
  subtitle: string
  price: number
  originalPrice: number
  footnote: string
  cta: string
  aside?: string
}

export const DUMMY_DEALS: DummyDeal[] = [
  {
    id: 'deal-1',
    kind: 'owned',
    badge: 'EPIC #02',
    tag: '내 도감 등록템',
    name: '이솝 제라늄 리프 바디클렌저 500ml',
    subtitle: '욕실 도감 완성 보너스 적용 가능',
    price: 42000,
    originalPrice: 58000,
    footnote: '3,000원 리뷰 쿠폰 즉시 적용',
    cta: '쿠폰 적용 구매',
    aside: '잔여 12:44:10',
  },
  {
    id: 'deal-2',
    kind: 'unowned',
    badge: '주방 도감 미등록',
    tag: '+30P 즉시적립',
    name: '프로쉬 친환경 알로에베라 주방세제',
    subtitle: '독일 직수입 500ml · 9,420원 소창 총',
    price: 8900,
    originalPrice: 12900,
    footnote: '구매 시 주방 도감 #04 잠금 해제',
    cta: '도감 등록 & 특가구매',
    aside: '주방 랭킹 1위',
  },
  {
    id: 'deal-3',
    kind: 'unowned',
    badge: '세탁 도감 슬롯 공석',
    tag: '슈퍼위크 단독할인',
    name: '퍼실 딥클린 플러스 파워캡슐 세제 54입',
    subtitle: '정기 라틴 추천 70일분',
    price: 19800,
    originalPrice: 30000,
    footnote: '도감 등록 시 무료배송 쿠폰 발급',
    cta: '특가 확인하기',
  },
]

export type DummyParty = {
  id: string
  name: string
  price: number
  originalPrice?: number
  joined: number
  target: number
  urgency?: string
  region?: string
  countdown?: string
  saving?: string
  note?: string
  cta: string
}

export const DUMMY_PARTIES: { featured: DummyParty; compact: DummyParty[] } = {
  featured: {
    id: 'party-1',
    name: '아로마티카 티트리 샴푸 400ml [5인 파티]',
    price: 15200,
    joined: 4,
    target: 5,
    urgency: '마감 임박! 1명 남음',
    region: '마포구 연남동 거점',
    countdown: '01:23:40',
    saving: '(-20% 추가 절약)',
    cta: '마지막 자리 탑승하기(15,200원)',
  },
  compact: [
    {
      id: 'party-2',
      name: '스카치브라이트 제로 스크래치 수세미 6입',
      price: 6400,
      originalPrice: 9800,
      joined: 2,
      target: 4,
      note: '개당 1,600원 꼴',
      cta: '참여하기',
    },
    {
      id: 'party-3',
      name: '브레프 토일렛 파워액티브 4입 번들',
      price: 8900,
      originalPrice: 14500,
      joined: 3,
      target: 4,
      note: '+50P 파티 보너스',
      cta: '참여하기',
    },
  ],
}
```

- [ ] **Step 4: Run the new tests**

Run: `npx vitest run src/data/purchaseDummy.test.ts` — expected PASS (3 tests). Then `npx tsc --noEmit` — clean.

- [ ] **Step 5: Commit**

```bash
git add src/data/purchaseDummy.ts src/data/purchaseDummy.test.ts
git commit -m "feat: extend purchase dummy data and add percentOff helper"
```


---

### Task 2: `ButlerHero`

**Files:**
- Create: `src/components/ButlerHero.tsx`

**Interfaces:**
- Consumes: `DUMMY_BUTLER`, `percentOff` (Task 1), `Icon`.
- Produces: `ButlerHero({ greetingName, itemName, locationName, daysUntilEmpty, onAction }: { greetingName: string; itemName: string; locationName: string; daysUntilEmpty: number; onAction: () => void })`.

- [ ] **Step 1: Create the file**

```tsx
import { Icon } from '../data/materialIcons'
import { DUMMY_BUTLER, percentOff } from '../data/purchaseDummy'

export function ButlerHero({
  greetingName,
  itemName,
  locationName,
  daysUntilEmpty,
  onAction,
}: {
  greetingName: string
  itemName: string
  locationName: string
  daysUntilEmpty: number
  onAction: () => void
}) {
  const B = DUMMY_BUTLER
  const off = percentOff(B.originalPrice, B.price)

  return (
    <section className="space-y-space-sm">
      <div className="flex items-start gap-space-sm rounded-2xl bg-secondary-container/40 p-space-md">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-on-secondary shadow-[0_2px_0px_#304c46]">
          <Icon name="smart_toy" className="text-[22px]" />
        </div>
        <div className="min-w-0">
          <span className="flex flex-wrap items-center gap-1 text-label-sm text-secondary">
            AI 리멤버 비서
            <span className="rounded bg-secondary-container px-1.5 py-0.5 text-on-secondary-container">
              스마트 리더 ON
            </span>
          </span>
          <p className="mt-1 text-body-md text-on-surface">
            {greetingName}, {locationName} 도감의 {itemName} —{' '}
            <strong className="text-primary">{daysUntilEmpty}일 뒤</strong> 바닥나요! 지금 역대 최저가
            근접이라 미리 채워두는 걸 추천해요.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-surface-container-lowest p-space-md shadow-[0_4px_0px_#e1bfb8]">
        <div className="flex items-center justify-between gap-space-sm">
          <div className="flex min-w-0 items-center gap-1.5 text-label-sm">
            <span className="rounded bg-tertiary-fixed px-1.5 py-0.5 text-on-tertiary-fixed">
              {B.rankTag}
            </span>
            <span className="truncate text-on-surface-variant">
              {locationName} {B.slotLabel}
            </span>
          </div>
          <span className="flex shrink-0 items-center gap-0.5 rounded bg-error-container px-1.5 py-0.5 text-label-sm text-on-error-container">
            <Icon name="alarm" className="text-[12px]" />D-{daysUntilEmpty} 소진임박
          </span>
        </div>

        <div className="mt-space-sm flex gap-space-md">
          <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
            <Icon name="inventory_2" className="text-[28px]" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="line-clamp-2 font-heading text-headline-md text-on-surface">{itemName}</h3>
            <p className="text-body-sm text-on-surface-variant">
              평균 소모 주기 {B.cycleDays}일 기준 · 잔여 {B.remainPercent}% ({B.remainText})
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
              <div className="h-full rounded-full bg-primary" style={{ width: `${B.remainPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-space-sm flex flex-wrap items-baseline gap-2 rounded-lg bg-surface-container-low p-space-sm">
          <span className="font-heading text-headline-lg text-primary">{B.price.toLocaleString()}원</span>
          <span className="rounded bg-error-container px-1.5 py-0.5 text-label-sm text-on-error-container">
            {off}% 할인
          </span>
          <span className="text-body-sm text-on-surface-variant line-through">
            {B.originalPrice.toLocaleString()}원
          </span>
          <span className="ml-auto flex items-center gap-0.5 text-label-sm text-secondary">
            <Icon name="verified" className="text-[14px]" />
            {B.lowestNote}
          </span>
        </div>

        <div className="mt-space-sm flex items-stretch gap-space-sm">
          <button
            type="button"
            onClick={onAction}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary p-3 text-label-lg text-on-primary shadow-[0_4px_0px_#8b1901] active:translate-y-0.5 active:shadow-[0_1px_0px_#8b1901]"
          >
            <Icon name="shopping_cart" className="text-[18px]" />
            최저가 즉시 재구매
          </button>
          <button
            type="button"
            onClick={onAction}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface-container-high p-3 text-label-lg text-on-surface shadow-[0_3px_0px_#e1bfb8] active:translate-y-0.5"
          >
            <Icon name="update" className="text-[18px]" />
            주기 미루기
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
            <Icon name="inventory_2" className="text-[20px]" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="flex items-center gap-1.5 text-label-lg text-on-surface">
              <span className="truncate">{B.next.name}</span>
              <span className="shrink-0 rounded bg-secondary-container px-1.5 py-0.5 text-label-sm text-on-secondary-container">
                {B.next.dday}
              </span>
            </span>
            <span className="truncate text-body-sm text-on-surface-variant">{B.next.note}</span>
          </div>
        </div>
        <button
          type="button"
          aria-label="상세보기"
          onClick={onAction}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant"
        >
          <Icon name="chevron_right" className="text-[20px]" />
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` is clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/ButlerHero.tsx
git commit -m "feat: add ButlerHero component"
```

---

### Task 3: `DealCard`

**Files:**
- Create: `src/components/DealCard.tsx`

**Interfaces:**
- Consumes: `DummyDeal`, `percentOff` (Task 1), `Icon`.
- Produces: `DealCard({ deal, onAction }: { deal: DummyDeal; onAction: () => void })`.

- [ ] **Step 1: Create the file**

```tsx
import { Icon } from '../data/materialIcons'
import { percentOff, type DummyDeal } from '../data/purchaseDummy'

export function DealCard({ deal, onAction }: { deal: DummyDeal; onAction: () => void }) {
  const off = percentOff(deal.originalPrice, deal.price)

  return (
    <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]">
      <div className="mb-space-sm flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded bg-tertiary-fixed px-1.5 py-0.5 text-label-sm text-on-tertiary-fixed">
            {deal.badge}
          </span>
          <span className="rounded bg-secondary-container px-1.5 py-0.5 text-label-sm text-on-secondary-container">
            {deal.tag}
          </span>
        </div>
        {deal.aside && <span className="text-label-sm text-primary">{deal.aside}</span>}
      </div>
      <div className="flex gap-space-md">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
          <Icon name="inventory_2" className="text-[26px]" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h4 className="line-clamp-2 font-heading text-label-lg text-on-surface">{deal.name}</h4>
          <p className="text-body-sm text-on-surface-variant">{deal.subtitle}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
            <span className="font-heading text-headline-md text-primary">{deal.price.toLocaleString()}원</span>
            <span className="text-label-sm text-primary">{off}% OFF</span>
            <span className="text-body-sm text-on-surface-variant line-through">
              {deal.originalPrice.toLocaleString()}원
            </span>
          </div>
        </div>
      </div>
      <div className="mt-space-sm flex items-center justify-between gap-space-sm border-t border-surface-container-high pt-space-sm">
        <span className="flex min-w-0 items-center gap-1 text-label-sm text-on-surface-variant">
          <Icon name="confirmation_number" className="text-[14px]" />
          <span className="truncate">{deal.footnote}</span>
        </span>
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-label-sm text-on-primary shadow-[0_2px_0px_#8b1901] active:translate-y-0.5"
        >
          {deal.cta}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` is clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/DealCard.tsx
git commit -m "feat: add DealCard component"
```

---

### Task 4: `GroupBuyCard`

**Files:**
- Create: `src/components/GroupBuyCard.tsx`

**Interfaces:**
- Consumes: `DummyParty` (Task 1), `Icon`.
- Produces: `GroupBuyCard({ party, variant, onAction }: { party: DummyParty; variant: 'featured' | 'compact'; onAction: () => void })`.

- [ ] **Step 1: Create the file**

```tsx
import { Icon } from '../data/materialIcons'
import type { DummyParty } from '../data/purchaseDummy'

export function GroupBuyCard({
  party,
  variant,
  onAction,
}: {
  party: DummyParty
  variant: 'featured' | 'compact'
  onAction: () => void
}) {
  const percent = Math.round((party.joined / party.target) * 100)

  if (variant === 'compact') {
    return (
      <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]">
        <div className="flex items-start justify-between gap-space-sm">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-label-sm text-secondary">
              {party.joined}/{party.target}명 모집중
            </span>
            <h4 className="line-clamp-2 font-heading text-label-lg text-on-surface">{party.name}</h4>
            <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
              <span className="font-heading text-headline-md text-on-surface">
                {party.price.toLocaleString()}원
              </span>
              {party.originalPrice !== undefined && (
                <span className="text-body-sm text-on-surface-variant line-through">
                  {party.originalPrice.toLocaleString()}원
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {party.note && <span className="text-label-sm text-on-surface-variant">{party.note}</span>}
            <button
              type="button"
              onClick={onAction}
              className="rounded-lg bg-surface-container-high px-3 py-1.5 text-label-sm text-on-surface shadow-[0_2px_0px_#e1bfb8] active:translate-y-0.5"
            >
              {party.cta}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-[0_4px_12px_rgba(170,48,21,0.08),0_3px_0px_rgba(43,38,37,0.1)]">
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {party.urgency && (
            <span className="rounded bg-primary px-1.5 py-0.5 text-label-sm text-on-primary">
              {party.urgency}
            </span>
          )}
          {party.region && <span className="text-label-sm text-on-surface-variant">{party.region}</span>}
        </div>
        {party.countdown && (
          <span className="flex shrink-0 items-center gap-0.5 text-label-sm text-primary">
            <Icon name="hourglass_top" className="text-[14px]" />
            {party.countdown}
          </span>
        )}
      </div>
      <div className="flex gap-space-md">
        <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
          <Icon name="inventory_2" className="text-[28px]" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h4 className="line-clamp-2 font-heading text-headline-md text-on-surface">{party.name}</h4>
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="font-heading text-headline-lg text-primary">
              {party.price.toLocaleString()}원
            </span>
            {party.saving && <span className="text-label-sm text-secondary">{party.saving}</span>}
          </div>
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex -space-x-1.5">
            {Array.from({ length: party.target }, (_, i) => {
              const filled = i < party.joined
              return (
                <span
                  key={i}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface-container-lowest text-[9px] font-bold ${
                    filled
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-surface-container-high text-outline'
                  }`}
                >
                  {filled ? (i === 0 ? '방장' : `${i + 1}번`) : '?'}
                </span>
              )
            })}
          </div>
          <span className="text-label-sm text-on-surface-variant">
            {party.joined} / {party.target}명 달성 ({percent}%)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary p-3 text-label-lg text-on-primary shadow-[0_4px_0px_#8b1901] active:translate-y-0.5 active:shadow-[0_1px_0px_#8b1901]"
      >
        <Icon name="group_add" className="text-[18px]" />
        {party.cta}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` is clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/GroupBuyCard.tsx
git commit -m "feat: add GroupBuyCard component"
```

---

### Task 5: `PurchasePage` rewrite

**Files:**
- Modify: `src/pages/PurchasePage.tsx` (whole file)

**Interfaces:**
- Consumes: `ButlerHero`, `DealCard`, `GroupBuyCard`, `DUMMY_BUTLER`, `DUMMY_DEALS`, `DUMMY_PARTIES`, `percentOff`, `DealKind`, `useLocker`, `getUpcomingNotifications`, `DUMMY_PROFILE`, `Icon`.

- [ ] **Step 1: Replace the whole file with**

```tsx
import { useEffect, useState } from 'react'
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications } from '../state/selectors'
import { ButlerHero } from '../components/ButlerHero'
import { DealCard } from '../components/DealCard'
import { GroupBuyCard } from '../components/GroupBuyCard'
import { Icon } from '../data/materialIcons'
import { DUMMY_PROFILE } from '../data/homeDummy'
import { DUMMY_BUTLER, DUMMY_DEALS, DUMMY_PARTIES, percentOff, type DealKind } from '../data/purchaseDummy'

type Filter = 'all' | DealKind

export default function PurchasePage() {
  const { items, locations } = useLocker()
  const [filter, setFilter] = useState<Filter>('all')
  const [notice, setNotice] = useState<{ id: number } | null>(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 2500)
    return () => clearTimeout(timer)
  }, [notice])

  const showNotice = () => setNotice({ id: Date.now() })

  const urgent = getUpcomingNotifications(items, 30)[0]
  const fallback = DUMMY_BUTLER.fallback
  const heroName = urgent?.name ?? fallback.name
  const heroLocation =
    (urgent && locations.find((l) => l.id === urgent.locationId)?.name) || fallback.locationName
  const heroDays = Math.max(0, urgent?.daysUntilEmpty ?? fallback.daysUntilEmpty)

  const chips: Array<{ key: Filter; label: string; count: number }> = [
    { key: 'all', label: '전체 특가', count: DUMMY_DEALS.length },
    { key: 'owned', label: '내 도감 등록템', count: DUMMY_DEALS.filter((d) => d.kind === 'owned').length },
    { key: 'unowned', label: '미등록 아이템', count: DUMMY_DEALS.filter((d) => d.kind === 'unowned').length },
  ]
  const visibleDeals = DUMMY_DEALS.filter((d) => filter === 'all' || d.kind === filter)
  const maxOff = Math.max(...DUMMY_DEALS.map((d) => percentOff(d.originalPrice, d.price)))

  return (
    <div className="space-y-space-lg p-margin">
      <ButlerHero
        greetingName={DUMMY_PROFILE.name}
        itemName={heroName}
        locationName={heroLocation}
        daysUntilEmpty={heroDays}
        onAction={showNotice}
      />

      <section className="space-y-space-sm">
        <div className="flex items-center justify-between gap-space-sm">
          <h2 className="flex items-center gap-1.5 font-heading text-headline-md text-on-surface">
            <Icon name="local_fire_department" className="text-[22px] text-primary" />
            도감 위시 &amp; 특가 레이더
          </h2>
          <span className="shrink-0 rounded-full bg-error-container px-2 py-0.5 text-label-sm text-on-error-container">
            최대 {maxOff}% OFF
          </span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-space-xs">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-label-md ${
                filter === chip.key
                  ? 'bg-primary text-on-primary shadow-[0_2px_0px_#8b1901]'
                  : 'bg-surface-container text-on-surface-variant shadow-[0_2px_0px_#e1bfb8]'
              }`}
            >
              {chip.label} ({chip.count})
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-space-sm">
          {visibleDeals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onAction={showNotice} />
          ))}
          {visibleDeals.length === 0 && (
            <p className="text-body-sm text-on-surface-variant">해당하는 특가가 없어요.</p>
          )}
        </div>
      </section>

      <section className="space-y-space-sm">
        <div className="flex items-center justify-between gap-space-sm">
          <h2 className="flex items-center gap-1.5 font-heading text-headline-md text-on-surface">
            <Icon name="groups_2" className="text-[22px] text-secondary" />
            이웃 수집가 실시간 공구 파티
          </h2>
          <span className="shrink-0 rounded-full bg-secondary-container px-2 py-0.5 text-label-sm text-on-secondary-container">
            동네 거점 매칭
          </span>
        </div>
        <p className="text-body-sm text-on-surface-variant">
          혼자 사면 비싼 대용량 생필품, 최대 30% 추가 절약 + 퀘스트 배지 획득!
        </p>
        <GroupBuyCard party={DUMMY_PARTIES.featured} variant="featured" onAction={showNotice} />
        {DUMMY_PARTIES.compact.map((party) => (
          <GroupBuyCard key={party.id} party={party} variant="compact" onAction={showNotice} />
        ))}
      </section>

      <section className="flex items-center justify-between gap-space-sm rounded-2xl bg-gradient-to-r from-tertiary to-primary p-space-md text-on-primary shadow-[0_4px_0px_#8b1901]">
        <div className="flex min-w-0 flex-col">
          <span className="text-label-sm">원하는 물품이 없나요?</span>
          <span className="font-heading text-headline-md">내가 직접 공구 파티 열기</span>
          <span className="text-body-sm opacity-90">방장 개설 시 즉시 +100P &amp; 무료 배송</span>
        </div>
        <button
          type="button"
          onClick={showNotice}
          className="flex shrink-0 items-center gap-1 rounded-xl bg-surface-container-lowest px-3 py-2 text-label-lg text-primary shadow-[0_2px_0px_rgba(0,0,0,0.15)] active:translate-y-0.5"
        >
          <Icon name="add_circle" className="text-[18px]" />
          파티 개설
        </button>
      </section>

      {notice && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit max-w-[90%] rounded-full bg-inverse-surface px-4 py-2 text-label-md text-inverse-on-surface shadow-[0_4px_12px_rgba(0,0,0,0.2)] md:bottom-8"
        >
          아직 준비 중인 기능이에요
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Remove the now-unused old dummy exports**

Run `grep -rnE "DUMMY_RECOMMENDATIONS|DUMMY_DISCOUNTS|DUMMY_GROUP_BUYS|DummyRecommendation|DummyDiscount|DummyGroupBuy" src | grep -v "^src/data/purchaseDummy.ts"` — expected: no output (if anything prints, STOP and report). Then delete from `src/data/purchaseDummy.ts` the old blocks: `DummyRecommendation` + `DUMMY_RECOMMENDATIONS`, `DummyDiscount` + `DUMMY_DISCOUNTS`, and `DummyGroupBuy` + `DUMMY_GROUP_BUYS` (the three type/const pairs that sit at the top of the file, before `percentOff`).

- [ ] **Step 3: Verify**

Run `npx tsc --noEmit` (clean) and `npx vitest run` (58 tests: 55 + 3).

- [ ] **Step 4: Commit**

```bash
git add src/pages/PurchasePage.tsx src/data/purchaseDummy.ts
git commit -m "feat: port PurchasePage to Stitch design with shared coming-soon notice"
```

---

### Task 6: Verification

**Files:** none (verification only)

- [ ] **Step 1: Automated suite**

Run `npx tsc --noEmit`, `npx vitest run`, `npm run test:server`, `npm run build`. Expected: all pass (58 frontend, 8 server).

- [ ] **Step 2: Tailwind class existence check**

Create `_check-classes.mjs` in the repo root with a FILE-WRITING tool (not a shell heredoc — shells mangle the backslash handling), run it, then delete it (do not commit):

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
  'src/components/ButlerHero.tsx',
  'src/components/DealCard.tsx',
  'src/components/GroupBuyCard.tsx',
  'src/pages/PurchasePage.tsx',
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

Expected: only non-class false positives (e.g. `react-router-dom`-style import paths; here possibly `../state/LockerContext` is skipped by the `..` rule). Any MISSING that is a real class is a defect. Also run `grep -rnE "font-(display|headline|body|label|stat)-|scrollbar-none" src` — expected no output.

- [ ] **Step 3: Manual walkthrough (`npm run dev`)**

Compare against the `remembuy_5` screenshot at mobile and tablet widths. Confirm: chips filter and their counts match the visible cards; every action button (hero x3, deal CTAs, party buttons, banner) shows the snackbar, it disappears after ~2.5s, and repeated clicks restart the timer; with a real item that has `daysUntilEmpty` <= 30 the hero shows that item's name, location and D-day (otherwise the fallback shampoo); the snackbar clears the mobile bottom nav.

- [ ] **Step 4: Commit fixes only if needed.**
