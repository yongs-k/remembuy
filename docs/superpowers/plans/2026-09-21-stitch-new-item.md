# Stitch New-Item Registration Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port `remembuy_6` onto `NewItemPage` (restyle + real-data preview/reward, all form logic preserved) and `ai` onto a link-analysis overlay in `HomePage` with a real cancel.

**Architecture:** A tested selector `getCompletionGain`, four presentational components (`AnalyzingOverlay`, `EntryTabs`, `EntryPreviewCard`, plus inline cards), a JSX-only rewrite of `NewItemPage` (logic verbatim + a notice state), and a small `AbortController` addition to `HomePage.handleAnalyzeLink`.

**Tech Stack:** React + TypeScript + Tailwind; `Icon` helper; Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-21-stitch-new-item-design.md`.
- Tailwind: font-size scale classes are `text-display-lg|display-sm|headline-lg|headline-md|body-lg|body-md|body-sm|label-lg|label-md|label-sm|stat-counter`. There is NO `font-<scale>` class — only `font-heading` and `font-body`. `scrollbar-none` does not exist. `line-clamp-2` exists.
- Spacing tokens: `space-xs|sm|md|lg|xl`, `gutter`, `margin` (e.g. `p-space-md`, `gap-space-sm`, `p-margin`).
- Icons only via `<Icon name="..." className="..." />`.
- `NewItemPage` logic must stay byte-identical: every `useState` initializer, `handleLocationChange`, `handleAddLocation`, `handleAddCategory`, `handleSubmit` (including `podiumRank` retention and `navigate('/')`), the prefill/edit derivations. Only additions listed in Task 5 are allowed.
- `RecommendationToggle.tsx` and `ItemDetailPage.tsx` are NOT modified.
- Notices use an always-mounted `role="status" aria-live="polite"` wrapper with `pointer-events-none`; the pill is rendered only while a notice exists.
- Copy Korean text and typographic characters exactly as written in the plan's code blocks.
- `npx tsc --noEmit` clean and vitest green after every task (58 tests before this plan; Task 1 adds 4).

## File Structure

```
src/state/selectors.ts               # Modify: add getCompletionGain
src/state/selectors.test.ts          # Modify: add tests
src/components/AnalyzingOverlay.tsx  # Create
src/pages/HomePage.tsx               # Modify: overlay + AbortController
src/components/EntryTabs.tsx         # Create
src/components/EntryPreviewCard.tsx  # Create
src/pages/NewItemPage.tsx            # Modify: whole file
```

---

### Task 1: `getCompletionGain` selector (TDD)

**Files:**
- Modify: `src/state/selectors.ts`, `src/state/selectors.test.ts`

**Interfaces:**
- Produces: `getCompletionGain(items: Item[], categories: Category[], locationId: string, categoryId: string, masterItemId: string, excludeItemId?: string): { before: number; after: number }`.

- [ ] **Step 1: Write the failing tests**

In `src/state/selectors.test.ts` replace

```ts
  getMasterItemCounts,
} from './selectors'
```

with

```ts
  getMasterItemCounts,
  getCompletionGain,
} from './selectors'
```

and append at the end of the file:

```ts
describe('getCompletionGain', () => {
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
    locationId: 'L1',
    name: 'B',
    masterItems: [
      { id: 'b1', name: 'b1' },
      { id: 'b2', name: 'b2' },
    ],
  }
  const owned: Item = {
    id: 'i1',
    name: 'i1',
    locationId: 'L1',
    categoryId: 'a',
    masterItemId: 'a1',
    createdAt: '2026-01-01',
  }

  it('raises completion when an unowned master item is linked', () => {
    expect(getCompletionGain([owned], [catA, catB], 'L1', 'a', 'a2')).toEqual({
      before: 25,
      after: 50,
    })
  })

  it('does not change completion without a linked master item', () => {
    expect(getCompletionGain([owned], [catA, catB], 'L1', 'a', '')).toEqual({
      before: 25,
      after: 25,
    })
  })

  it('does not change completion for an already owned master item', () => {
    expect(getCompletionGain([owned], [catA, catB], 'L1', 'a', 'a1')).toEqual({
      before: 25,
      after: 25,
    })
  })

  it('excludes the edited item from the baseline', () => {
    expect(getCompletionGain([owned], [catA, catB], 'L1', 'a', 'a1', 'i1')).toEqual({
      before: 0,
      after: 25,
    })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/state/selectors.test.ts`
Expected: FAIL (`getCompletionGain` is not exported / not a function).

- [ ] **Step 3: Implement**

Append to `src/state/selectors.ts`:

```ts
export function getCompletionGain(
  items: Item[],
  categories: Category[],
  locationId: string,
  categoryId: string,
  masterItemId: string,
  excludeItemId?: string
): { before: number; after: number } {
  const base = excludeItemId ? items.filter((i) => i.id !== excludeItemId) : items
  const preview: Item = {
    id: '__preview__',
    name: '',
    locationId,
    categoryId,
    masterItemId: masterItemId || undefined,
    createdAt: '',
  }
  return {
    before: getLocationCompletion(base, locationId, categories),
    after: getLocationCompletion([...base, preview], locationId, categories),
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/state/selectors.test.ts` — expected PASS. Then `npx tsc --noEmit` — clean.

- [ ] **Step 5: Commit**

```bash
git add src/state/selectors.ts src/state/selectors.test.ts
git commit -m "feat: add getCompletionGain selector"
```

---

### Task 2: `AnalyzingOverlay`

**Files:**
- Create: `src/components/AnalyzingOverlay.tsx`

**Interfaces:**
- Consumes: `Icon`.
- Produces: `AnalyzingOverlay({ url, entryNumber, onCancel }: { url: string; entryNumber: number; onCancel: () => void })`.

- [ ] **Step 1: Create the file**

```tsx
import { Icon } from '../data/materialIcons'

type StepState = 'done' | 'active' | 'waiting'

const STEPS: Array<{ title: string; desc: string; state: StepState }> = [
  { title: '이미지 OCR · 상품 텍스트 감정', desc: '상품명 · 용량 라벨 식별', state: 'done' },
  { title: '도감 슬롯 매칭', desc: '장소 · 카테고리 후보 확인', state: 'done' },
  { title: '가구원 기준 소모 주기 계산', desc: '재구매 주기를 산출 중이에요', state: 'active' },
  { title: '온라인 최저가 · 핫딜 알림 추적', desc: '쿠팡 와우 · 네이버플러스 최저 시세 대조', state: 'waiting' },
]

const ROW_STYLE: Record<StepState, string> = {
  done: 'bg-secondary-container/50',
  active: 'bg-error-container/50',
  waiting: 'bg-surface-container-low',
}

export function AnalyzingOverlay({
  url,
  entryNumber,
  onCancel,
}: {
  url: string
  entryNumber: number
  onCancel: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="링크 분석 중"
      className="fixed inset-0 z-[60] overflow-y-auto bg-surface"
    >
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-space-md p-margin">
        <div className="flex items-center pt-space-sm">
          <span className="flex items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-label-md text-primary">
            <Icon name="document_scanner" className="text-[16px]" />
            AI 도감 스캐너 V2.4
          </span>
        </div>

        <div className="text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2.5 py-1 text-label-sm text-on-secondary-container">
            <Icon name="auto_awesome" className="text-[14px]" />
            인벤토리 자동 등록 모드
          </span>
          <h2 className="mt-2 font-heading text-headline-lg text-on-surface">
            업로드한 정보를 분석하고 있어요
          </h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            영수증 · 링크 · 사진에서 규격과 소비 주기를 정밀 추출 중입니다
          </p>
        </div>

        <div className="rounded-2xl bg-surface-container p-space-md shadow-[0_4px_0px_#e1bfb8]">
          <div className="flex items-center justify-between gap-2 text-label-sm">
            <span className="flex items-center gap-1 rounded bg-inverse-surface px-2 py-1 text-inverse-on-surface">
              <Icon name="qr_code_scanner" className="text-[14px]" />
              INDEX #{String(entryNumber).padStart(3, '0')} 감지
            </span>
            <span className="flex items-center gap-1 text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              감정 중
            </span>
          </div>
          <div className="mt-space-sm flex items-center gap-2 rounded-xl bg-surface-container-lowest p-space-sm">
            <Icon name="link" className="text-[20px] text-primary" />
            <span className="min-w-0 truncate text-body-sm text-on-surface">{url}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 font-heading text-headline-md text-on-surface">
              <Icon name="checklist" className="text-[22px] text-primary" />
              도감 추출 공정
            </h3>
            <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
              <Icon name="hourglass_top" className="text-[14px]" />약 3초 남음
            </span>
          </div>
          <div className="mt-space-sm h-2 w-full overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-container to-tertiary"
              style={{ width: '70%' }}
            />
          </div>
          <ul className="mt-space-sm space-y-1.5">
            {STEPS.map((step) => (
              <li
                key={step.title}
                className={`flex items-center gap-2.5 rounded-xl p-space-sm ${ROW_STYLE[step.state]}`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    step.state === 'done'
                      ? 'bg-secondary text-on-secondary'
                      : step.state === 'active'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  <Icon
                    name={step.state === 'done' ? 'check' : step.state === 'active' ? 'calculate' : 'sell'}
                    className="text-[20px]"
                  />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-label-lg text-on-surface">{step.title}</span>
                  <span className="truncate text-body-sm text-on-surface-variant">{step.desc}</span>
                </div>
                <span className="shrink-0 text-label-sm text-on-surface-variant">
                  {step.state === 'done' ? '완료' : step.state === 'active' ? '분석중' : '대기'}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl bg-surface-container p-space-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary-fixed text-tertiary">
            <Icon name="lightbulb" className="text-[22px]" />
          </div>
          <div className="flex flex-col">
            <span className="flex items-center gap-1.5 text-label-md text-tertiary">
              REMEMBUY 도감 마스터 팁
              <span className="rounded bg-tertiary-fixed px-1.5 py-0.5 text-label-sm text-on-tertiary-fixed">
                +20P 획득
              </span>
            </span>
            <p className="mt-0.5 text-body-sm text-on-surface">
              결제 영수증이나 바코드를 추가하면 도감 완성도가 오르고 소모 주기 예측 정확도가 더 정밀해집니다.
            </p>
          </div>
        </div>

        <button
          type="button"
          autoFocus
          onClick={onCancel}
          className="mt-auto flex items-center justify-center gap-1.5 rounded-xl bg-surface-container-high p-3 text-label-lg text-on-surface shadow-[0_3px_0px_#e1bfb8] active:translate-y-0.5"
        >
          <Icon name="close" className="text-[18px]" />
          분석 중단 및 취소
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/AnalyzingOverlay.tsx
git commit -m "feat: add AnalyzingOverlay component"
```

---

### Task 3: `HomePage` — overlay + cancellable analysis

**Files:**
- Modify: `src/pages/HomePage.tsx`

**Interfaces:**
- Consumes: `AnalyzingOverlay` (Task 2).

- [ ] **Step 1: Update the imports**

Find:

```tsx
import { useMemo, useState } from 'react'
```

Replace with:

```tsx
import { useMemo, useRef, useState } from 'react'
```

Find:

```tsx
import { HomeLocationTile } from '../components/HomeLocationTile'
```

Replace with:

```tsx
import { HomeLocationTile } from '../components/HomeLocationTile'
import { AnalyzingOverlay } from '../components/AnalyzingOverlay'
```

- [ ] **Step 2: Add the abort ref**

Find:

```tsx
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
```

Replace with:

```tsx
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
```

- [ ] **Step 3: Make the analysis cancellable**

Find:

```tsx
  async function handleAnalyzeLink() {
    setIsAnalyzing(true)
    setAnalyzeError(null)
    try {
      const res = await fetch('/api/analyze-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl, locations, categories }),
      })
      if (!res.ok) throw new Error('analyze failed')
      const result = await res.json()
      navigate('/new', { state: { prefill: { ...result, sourceUrl: linkUrl } } })
    } catch {
      setAnalyzeError('페이지를 분석하지 못했어요.')
    } finally {
      setIsAnalyzing(false)
    }
  }
```

Replace with:

```tsx
  async function handleAnalyzeLink() {
    const controller = new AbortController()
    abortRef.current = controller
    setIsAnalyzing(true)
    setAnalyzeError(null)
    try {
      const res = await fetch('/api/analyze-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl, locations, categories }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error('analyze failed')
      const result = await res.json()
      navigate('/new', { state: { prefill: { ...result, sourceUrl: linkUrl } } })
    } catch {
      if (!controller.signal.aborted) setAnalyzeError('페이지를 분석하지 못했어요.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  function handleCancelAnalyze() {
    abortRef.current?.abort()
  }
```

- [ ] **Step 4: Render the overlay**

The main return ends with these exact lines (the end of the file):

```tsx
        </div>
      )}
    </div>
  )
}
```

Replace them with:

```tsx
        </div>
      )}

      {isAnalyzing && (
        <AnalyzingOverlay
          url={linkUrl}
          entryNumber={items.length + 1}
          onCancel={handleCancelAnalyze}
        />
      )}
    </div>
  )
}
```

(This anchor is unique: it is the final block of the file. Do not change the earlier search-results branch's return.)

- [ ] **Step 5: Verify**

Run `npx tsc --noEmit` (clean) and `npx vitest run` (62 tests: 58 + 4).

- [ ] **Step 6: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: show analyzing overlay with cancel during link analysis"
```

---

### Task 4: `EntryTabs` + `EntryPreviewCard`

**Files:**
- Create: `src/components/EntryTabs.tsx`, `src/components/EntryPreviewCard.tsx`

**Interfaces:**
- Produces: `EntryTabs({ onSoon }: { onSoon: () => void })`; `EntryPreviewCard({ name, locationName, categoryName, price, restockCycle }: { name: string; locationName: string; categoryName: string; price: number | ''; restockCycle: string })`.

- [ ] **Step 1: Create `src/components/EntryTabs.tsx`**

```tsx
import { Icon } from '../data/materialIcons'

export function EntryTabs({ onSoon }: { onSoon: () => void }) {
  const base = 'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-label-md'
  return (
    <div className="flex gap-1 rounded-xl bg-surface-container p-1">
      <button type="button" onClick={onSoon} className={`${base} text-on-surface-variant`}>
        <Icon name="barcode_scanner" className="text-[18px]" />
        바코드 스캔
      </button>
      <button type="button" onClick={onSoon} className={`${base} text-on-surface-variant`}>
        <Icon name="receipt_long" className="text-[18px]" />
        구매내역
      </button>
      <button
        type="button"
        aria-current="true"
        className={`${base} bg-surface-container-lowest text-primary shadow-[0_2px_0px_#e1bfb8]`}
      >
        <Icon name="edit_note" className="text-[18px]" />
        직접 입력
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/EntryPreviewCard.tsx`**

```tsx
import { Icon } from '../data/materialIcons'

export function EntryPreviewCard({
  name,
  locationName,
  categoryName,
  price,
  restockCycle,
}: {
  name: string
  locationName: string
  categoryName: string
  price: number | ''
  restockCycle: string
}) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]">
      <div className="flex flex-wrap items-center gap-1.5 text-label-sm">
        {locationName && (
          <span className="rounded bg-secondary-container px-1.5 py-0.5 text-on-secondary-container">
            {locationName}
          </span>
        )}
        {categoryName && (
          <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-on-surface-variant">
            {categoryName}
          </span>
        )}
      </div>
      <div className="mt-space-sm flex gap-space-md">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
          <Icon name="inventory_2" className="text-[28px]" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2
            className={`line-clamp-2 font-heading text-headline-md ${
              name ? 'text-on-surface' : 'text-on-surface-variant'
            }`}
          >
            {name || '상품 이름을 입력하세요'}
          </h2>
          {price !== '' && (
            <span className="text-label-md text-primary">정가 {Number(price).toLocaleString()}원</span>
          )}
          {restockCycle && (
            <span className="flex items-center gap-1 text-body-sm text-on-surface-variant">
              <Icon name="update" className="text-[14px]" />
              {restockCycle}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/EntryTabs.tsx src/components/EntryPreviewCard.tsx
git commit -m "feat: add EntryTabs and EntryPreviewCard components"
```

---

### Task 5: `NewItemPage` rewrite

**Files:**
- Modify: `src/pages/NewItemPage.tsx` (whole file)

**Interfaces:**
- Consumes: `getCompletionGain` (Task 1), `EntryTabs`, `EntryPreviewCard` (Task 4), `RecommendationToggle` (unchanged), `Icon`.

**Rule:** everything from `type ProgressMode` through the end of `handleSubmit` is the ORIGINAL code, unchanged, except the additions marked `// added` below. Do not alter any original line.

- [ ] **Step 1: Replace the whole file with**

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getCompletionGain } from '../state/selectors'
import { RecommendationToggle } from '../components/RecommendationToggle'
import { EntryTabs } from '../components/EntryTabs'
import { EntryPreviewCard } from '../components/EntryPreviewCard'
import { Icon } from '../data/materialIcons'
import type { Item } from '../types'

type ProgressMode = 'recommendation' | 'daysUntilEmpty'

type LinkAnalysisPrefill = {
  name: string | null
  locationId: string | null
  suggestedLocationName: string | null
  categoryId: string | null
  suggestedCategoryName: string | null
  masterItemId: string | null
  place: string | null
  price: number | null
  restockCycle: string | null
  sourceUrl: string
}

const CYCLE_PRESETS = [45, 60, 90]

const cardCls = 'space-y-space-sm rounded-2xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]'
const inputCls =
  'mt-1 w-full rounded-lg border-2 border-transparent bg-surface-container-low p-2.5 text-body-md text-on-surface focus:border-primary focus:outline-none'
const labelCls = 'block text-label-md text-on-surface-variant'
const smallBtnCls =
  'shrink-0 rounded-lg bg-surface-container-high px-3 text-label-md text-on-surface active:translate-y-0.5'

function chipCls(active: boolean) {
  return `rounded-full px-3 py-1.5 text-label-md ${
    active
      ? 'bg-primary text-on-primary shadow-[0_2px_0px_#8b1901]'
      : 'bg-surface-container text-on-surface-variant shadow-[0_2px_0px_#e1bfb8]'
  }`
}

export default function NewItemPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('editId')
  const { items, locations, categories, addItem, updateItem, addLocation, addCategory } =
    useLocker()
  const existing = editId ? items.find((i) => i.id === editId) : undefined
  const prefill = !existing
    ? (location.state as { prefill?: LinkAnalysisPrefill } | null)?.prefill
    : undefined

  const prefillLocation = prefill?.locationId
    ? locations.find((l) => l.id === prefill.locationId)
    : undefined
  const prefillCategory =
    prefillLocation && prefill?.categoryId
      ? categories.find((c) => c.id === prefill.categoryId && c.locationId === prefillLocation.id)
      : undefined
  const prefillMasterItemId =
    prefillCategory && prefill?.masterItemId
      ? prefillCategory.masterItems.find((m) => m.id === prefill.masterItemId)?.id
      : undefined

  const [name, setName] = useState(existing?.name ?? prefill?.name ?? '')
  const [locationId, setLocationId] = useState(
    existing?.locationId ?? prefillLocation?.id ?? locations[0].id
  )
  const categoriesForLocation = useMemo(
    () => categories.filter((c) => c.locationId === locationId),
    [categories, locationId]
  )
  const [categoryId, setCategoryId] = useState(
    existing?.categoryId ?? prefillCategory?.id ?? categoriesForLocation[0]?.id ?? ''
  )
  const [masterItemId, setMasterItemId] = useState(
    existing?.masterItemId ?? prefillMasterItemId ?? ''
  )
  const [place, setPlace] = useState(existing?.place ?? prefill?.place ?? '')
  const [restockCycle, setRestockCycle] = useState(
    existing?.restockCycle ?? prefill?.restockCycle ?? ''
  )
  const [progressMode, setProgressMode] = useState<ProgressMode>(
    existing?.daysUntilEmpty !== undefined ? 'daysUntilEmpty' : 'recommendation'
  )
  const [recommendation, setRecommendation] = useState<'recommend' | 'notRecommend'>(
    existing?.recommendation ?? 'recommend'
  )
  const [daysUntilEmpty, setDaysUntilEmpty] = useState(existing?.daysUntilEmpty ?? 30)
  const [price, setPrice] = useState<number | ''>(existing?.price ?? prefill?.price ?? '')
  const [affiliateUrl, setAffiliateUrl] = useState(
    existing?.affiliateUrl ?? prefill?.sourceUrl ?? ''
  )
  const [note, setNote] = useState(existing?.note ?? '')
  const [newLocationName, setNewLocationName] = useState(prefill?.suggestedLocationName ?? '')
  const [newCategoryName, setNewCategoryName] = useState(prefill?.suggestedCategoryName ?? '')
  const [notice, setNotice] = useState<{ id: number } | null>(null) // added
  const cycleInputRef = useRef<HTMLInputElement>(null) // added

  useEffect(() => {
    // added
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 2500)
    return () => clearTimeout(timer)
  }, [notice])

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
      podiumRank: categoryId === existing?.categoryId ? existing?.podiumRank : undefined,
    }
    if (existing) {
      updateItem(existing.id, item)
    } else {
      addItem(item)
    }
    navigate('/')
  }

  const showNotice = () => setNotice({ id: Date.now() }) // added
  const locationName = locations.find((l) => l.id === locationId)?.name ?? '' // added
  const categoryName = selectedCategory?.name ?? '' // added
  const gain = getCompletionGain(items, categories, locationId, categoryId, masterItemId, existing?.id) // added
  const hasGain = gain.after > gain.before // added
  const entryNumber = existing ? items.findIndex((i) => i.id === existing.id) + 1 : items.length + 1 // added
  const isPresetCycle = CYCLE_PRESETS.some((d) => restockCycle === `약 ${d}일마다`) // added

  return (
    <form onSubmit={handleSubmit} className="space-y-space-md p-margin">
      <div className="flex items-center gap-space-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="뒤로가기"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface"
        >
          <Icon name="arrow_back" className="text-[20px]" />
        </button>
        <div className="flex min-w-0 flex-col">
          <h1 className="font-heading text-headline-lg text-on-surface">
            {existing ? '메모 수정하기' : '새로 기록하기'}
          </h1>
          <span className="text-label-sm text-primary">NEW DEX ENTRY #{entryNumber}</span>
        </div>
      </div>

      <EntryTabs onSoon={showNotice} />

      <EntryPreviewCard
        name={name}
        locationName={locationName}
        categoryName={categoryName}
        price={price}
        restockCycle={restockCycle}
      />

      <div className="rounded-2xl bg-secondary-container/40 p-space-md">
        <div className="flex items-center justify-between gap-space-sm">
          <div className="flex min-w-0 flex-col">
            <span className="font-heading text-label-lg text-on-surface">도감 등록 보상 예정</span>
            <span className="text-body-sm text-on-surface-variant">
              {hasGain
                ? `${locationName}도감 수집률 ${gain.before}% → ${gain.after}% UP!`
                : '표준 품목을 연결하면 수집률이 올라가요'}
            </span>
          </div>
          <span className="shrink-0 font-heading text-headline-md text-tertiary">+20P</span>
        </div>
        <div className="mt-space-sm h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${hasGain ? gain.after : gain.before}%` }}
          />
        </div>
      </div>

      <section className={cardCls}>
        <h2 className="flex items-center gap-1.5 font-heading text-headline-md text-on-surface">
          <Icon name="shelves" className="text-[22px] text-primary" />
          도감 보관 구역
        </h2>

        <label className={labelCls}>
          이름
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </label>

        <div>
          <span className={labelCls}>장소</span>
          <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="보관 구역">
            {locations.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={l.id === locationId}
                onClick={() => handleLocationChange(l.id)}
                className={chipCls(l.id === locationId)}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={newLocationName}
            onChange={(e) => setNewLocationName(e.target.value)}
            placeholder="새 장소 이름 (예: 베란다)"
            className="w-full min-w-0 flex-1 rounded-lg border-2 border-transparent bg-surface-container-low p-2.5 text-body-sm text-on-surface focus:border-primary focus:outline-none"
          />
          <button type="button" onClick={handleAddLocation} className={smallBtnCls}>
            장소 추가
          </button>
        </div>

        <label className={labelCls}>
          카테고리
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value)
              setMasterItemId('')
            }}
            className={inputCls}
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
            className="w-full min-w-0 flex-1 rounded-lg border-2 border-transparent bg-surface-container-low p-2.5 text-body-sm text-on-surface focus:border-primary focus:outline-none"
          />
          <button type="button" onClick={handleAddCategory} className={smallBtnCls}>
            카테고리 추가
          </button>
        </div>

        {selectedCategory && (
          <label className={labelCls}>
            표준 품목과 연결 (선택)
            <select
              value={masterItemId}
              onChange={(e) => setMasterItemId(e.target.value)}
              className={inputCls}
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
      </section>

      <section className={cardCls}>
        <h2 className="flex items-center gap-1.5 font-heading text-headline-md text-on-surface">
          <Icon name="shopping_bag" className="text-[22px] text-primary" />
          구매 정보
        </h2>
        <label className={labelCls}>
          구매처
          <input value={place} onChange={(e) => setPlace(e.target.value)} className={inputCls} />
        </label>
        <label className={labelCls}>
          가격 (원)
          <input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
            className={inputCls}
          />
        </label>
        <label className={labelCls}>
          구매 링크
          <input
            value={affiliateUrl ?? ''}
            onChange={(e) => setAffiliateUrl(e.target.value)}
            placeholder="https://..."
            className={inputCls}
          />
        </label>
      </section>

      <section className={cardCls}>
        <h2 className="flex items-center gap-1.5 font-heading text-headline-md text-on-surface">
          <Icon name="update" className="text-[22px] text-primary" />
          예상 소모 &amp; 재구매 주기
        </h2>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="재구매 주기">
          {CYCLE_PRESETS.map((d) => {
            const text = `약 ${d}일마다`
            return (
              <button
                key={d}
                type="button"
                aria-pressed={restockCycle === text}
                onClick={() => setRestockCycle(text)}
                className={chipCls(restockCycle === text)}
              >
                {d}일
              </button>
            )
          })}
          <button
            type="button"
            aria-pressed={restockCycle !== '' && !isPresetCycle}
            onClick={() => cycleInputRef.current?.focus()}
            className={chipCls(restockCycle !== '' && !isPresetCycle)}
          >
            직접설정
          </button>
        </div>
        <label className={labelCls}>
          재구매 주기
          <input
            ref={cycleInputRef}
            value={restockCycle}
            onChange={(e) => setRestockCycle(e.target.value)}
            placeholder="예: 약 2개월마다"
            className={inputCls}
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setProgressMode('recommendation')}
            className={`flex-1 rounded-lg py-2 text-label-md ${
              progressMode === 'recommendation'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface'
            }`}
          >
            추천/비추천
          </button>
          <button
            type="button"
            onClick={() => setProgressMode('daysUntilEmpty')}
            className={`flex-1 rounded-lg py-2 text-label-md ${
              progressMode === 'daysUntilEmpty'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface'
            }`}
          >
            소진까지 D-day
          </button>
        </div>

        {progressMode === 'recommendation' ? (
          <RecommendationToggle value={recommendation} onChange={setRecommendation} />
        ) : (
          <label className={labelCls}>
            소진까지 남은 일수
            <input
              type="number"
              min={0}
              value={daysUntilEmpty}
              onChange={(e) => setDaysUntilEmpty(Number(e.target.value))}
              className={inputCls}
            />
          </label>
        )}
      </section>

      <section className={cardCls}>
        <label className={labelCls}>
          메모
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputCls}
            rows={3}
          />
        </label>
      </section>

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary p-3.5 text-label-lg text-on-primary shadow-[0_4px_0px_#8b1901] active:translate-y-0.5 active:shadow-[0_1px_0px_#8b1901]"
      >
        <Icon name="check_circle" className="text-[20px]" />
        {existing ? '저장하기' : `${locationName}도감에 등록하기(+20P)`}
      </button>

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center md:bottom-8"
      >
        {notice && (
          <span className="max-w-[90%] rounded-full bg-inverse-surface px-4 py-2 text-label-md text-inverse-on-surface shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
            아직 준비 중인 기능이에요
          </span>
        )}
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Verify the preserved logic**

Run: `git diff HEAD -- src/pages/NewItemPage.tsx | grep -E "^[-+]" | grep -E "handleSubmit|handleAddLocation|handleAddCategory|handleLocationChange|useState\(" | head -40`
Expected: no `-` line touching any `useState(` initializer or handler body other than pure additions (the `+ ... // added` lines). Also confirm by eye that `handleSubmit` is identical.

- [ ] **Step 3: Verify**

Run `npx tsc --noEmit` (clean) and `npx vitest run` (62 tests).

- [ ] **Step 4: Commit**

```bash
git add src/pages/NewItemPage.tsx
git commit -m "feat: port NewItemPage to Stitch design (logic preserved)"
```

---

### Task 6: Verification

**Files:** none (verification only)

- [ ] **Step 1: Automated suite**

Run `npx tsc --noEmit`, `npx vitest run`, `npm run test:server`, `npm run build`. Expected: all pass (62 frontend, 8 server).

- [ ] **Step 2: Tailwind class existence check**

Create `_check-classes.mjs` in the repo root with a FILE-WRITING tool (not a shell heredoc), run it, then delete it (do not commit):

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
  'src/components/AnalyzingOverlay.tsx',
  'src/components/EntryTabs.tsx',
  'src/components/EntryPreviewCard.tsx',
  'src/pages/NewItemPage.tsx',
  'src/pages/HomePage.tsx',
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

Expected: only non-class false positives (import paths such as `react-router-dom`). Note `HomePage.tsx` still contains a few legacy `chunky-*`/`text-ink/50`/`bg-stamp` classes in the link sub-sheet — those exist in the config and must resolve. Any MISSING that is a real class is a defect. Also run `grep -rnE "font-(display|headline|body|label|stat)-|scrollbar-none" src` — expected no output.

- [ ] **Step 3: Manual walkthrough (`npm run dev`)**

Confirm: (a) create an item through every field and land on `/` with the item saved; (b) edit an item via `?editId=` (title "메모 수정하기", button "저장하기", fields prefilled, entry number is that item's position); (c) link analysis: paste a URL on Home -> overlay appears -> success navigates to `/new` with prefilled values; cancel during analysis closes the overlay and shows no error text; a failed analysis (e.g. server stopped) closes the overlay and shows "페이지를 분석하지 못했어요."; (d) location chips switch the category and master-item selects; (e) choosing an unowned master item shows "수집률 X% → Y% UP!" and choosing "직접 입력" shows the hint text; (f) restock chips fill the text input and highlight; "직접설정" focuses the input; (g) 바코드 스캔 / 구매내역 tabs show the snackbar; (h) the snackbar and dock clear the mobile bottom nav.

- [ ] **Step 4: Commit fixes only if needed.**
