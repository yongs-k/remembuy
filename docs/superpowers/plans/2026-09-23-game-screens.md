# Game Screens (Sub-project 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the already-built game server API (points/titles, box list + open, virtual item dex) as screens: a home entry card, a box store, a box-open result modal, and a dex page.

**Architecture:** Follows the existing `src/pages/` + `src/components/` split. Two new routes (`/store`, `/dex`) render inside the existing `AppLayout` (no new bottom-nav tab). A small pure `src/data/gradeColors.ts` module centralizes the grade->color/label mapping shared by the dex card and the box-open modal. `GameContext.openBox` gains a return value so `StorePage` can react to success/failure without new state-tracking machinery.

**Tech Stack:** React + TypeScript + Tailwind (existing design tokens only); react-router-dom v6; Vitest + `@testing-library/react`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-23-game-screens-design.md`.
- Two new routes only: `/store`, `/dex`, both inside the existing `<AppLayout>` route group in `src/App.tsx`. No 6th bottom-nav tab is added to `src/components/AppLayout.tsx`.
- No item artwork exists (`virtual_items.asset_id` is always `NULL`) — every visual uses a grade-colored background plus a Material Symbols icon (`<Icon name="..." />` from `src/data/materialIcons.tsx`), never a photo/image tag.
- Grade color/label mapping is fixed and defined exactly once, in `src/data/gradeColors.ts`, then imported everywhere a grade needs a color or Korean label: `COMMON -> bg-surface-container-high` (neutral), `ADVANCED -> bg-secondary-container` (teal), `RARE -> bg-primary-container` (coral), `LEGENDARY -> bg-tertiary-fixed` (gold); unknown grade strings fall back to the `COMMON` style rather than throwing.
- Tailwind: font-size scale classes are `text-display-lg|display-sm|headline-lg|headline-md|body-lg|body-md|body-sm|label-lg|label-md|label-sm|stat-counter`. There is NO `font-<scale>` class — only `font-heading` and `font-body`. Spacing tokens are `space-xs|sm|md|lg|xl`, `gutter`, `margin` (e.g. `p-space-md`, `gap-space-sm`).
- Icons only via `<Icon name="..." className="..." />` (already `aria-hidden`), imported from `../data/materialIcons`.
- Two-button footers/docks use `flex items-stretch gap-2` with `flex-1` on each button (matches existing dock patterns in this codebase).
- `npx tsc --noEmit` clean and `npx vitest run` green after every task (69 tests before this plan).
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## File Structure

```
src/state/GameContext.tsx              # Modify: openBox returns OpenBoxResult | undefined
src/state/GameContext.test.mtsx        # Modify: assert the new return value (file is GameContext.test.tsx)
src/data/gradeColors.ts                # Create
src/data/gradeColors.test.ts           # Create
src/components/DexItemCard.tsx         # Create
src/components/DexItemCard.test.tsx    # Create
src/pages/DexPage.tsx                  # Create
src/pages/DexPage.test.tsx             # Create
src/components/BoxOpenResultModal.tsx  # Create
src/components/BoxOpenResultModal.test.tsx # Create
src/pages/StorePage.tsx                # Create
src/pages/StorePage.test.tsx           # Create
src/components/HomeGameCard.tsx        # Create
src/components/HomeGameCard.test.tsx   # Create
src/pages/HomePage.tsx                 # Modify: render <HomeGameCard />
src/App.tsx                            # Modify: add /store, /dex routes
```

---

### Task 1: `GameContext.openBox` returns the result

**Files:**
- Modify: `src/state/GameContext.tsx`, `src/state/GameContext.test.tsx`

**Interfaces:**
- Produces: `useGame().openBox: (boxId: string) => Promise<OpenBoxResult | undefined>` (was `Promise<void>`) — resolves to the `OpenBoxResult` from `src/lib/gameApi.ts` on success, `undefined` if the underlying API call throws (the existing `console.warn` swallow is kept).

- [ ] **Step 1: Write the failing test**

In `src/state/GameContext.test.tsx`, replace the existing `'openBox updates points and the touched dex entry'` test with a version that also asserts the resolved return value, and add a new test for the failure path. Find:

```tsx
  it('openBox updates points and the touched dex entry', async () => {
    vi.mocked(api.claimSlots).mockResolvedValue(claimResult(0))
    vi.mocked(api.fetchGameState).mockResolvedValue({ ...emptyState, points: 1000 })
    vi.mocked(api.fetchDex).mockResolvedValue({
      items: [{ id: 'item-x', name: 'X', grade: 'COMMON', fragmentsRequired: 10, status: 'LOCKED', fragmentCount: 0 }],
    })
    const { result } = renderHook(() => useGame(), { wrapper })
    await waitFor(() => expect(result.current.dex.length).toBe(1))
    vi.mocked(api.openBox).mockResolvedValue({
      result: { type: 'FRAGMENT', itemId: 'item-x', itemName: 'X', grade: 'COMMON' },
      pointsSpent: 500,
      pointsBalance: 1500,
      dexEntry: { id: 'item-x', name: 'X', grade: 'COMMON', fragmentsRequired: 10, status: 'COLLECTING', fragmentCount: 1 },
    })
    await act(async () => {
      await result.current.openBox('box-starter')
    })
    expect(result.current.state?.points).toBe(1500)
    expect(result.current.dex[0].status).toBe('COLLECTING')
    expect(result.current.dex[0].fragmentCount).toBe(1)
  })
```

Replace with:

```tsx
  it('openBox updates points and the touched dex entry, and resolves the result', async () => {
    vi.mocked(api.claimSlots).mockResolvedValue(claimResult(0))
    vi.mocked(api.fetchGameState).mockResolvedValue({ ...emptyState, points: 1000 })
    vi.mocked(api.fetchDex).mockResolvedValue({
      items: [{ id: 'item-x', name: 'X', grade: 'COMMON', fragmentsRequired: 10, status: 'LOCKED', fragmentCount: 0 }],
    })
    const { result } = renderHook(() => useGame(), { wrapper })
    await waitFor(() => expect(result.current.dex.length).toBe(1))
    const openResult: api.OpenBoxResult = {
      result: { type: 'FRAGMENT', itemId: 'item-x', itemName: 'X', grade: 'COMMON' },
      pointsSpent: 500,
      pointsBalance: 1500,
      dexEntry: { id: 'item-x', name: 'X', grade: 'COMMON', fragmentsRequired: 10, status: 'COLLECTING', fragmentCount: 1 },
    }
    vi.mocked(api.openBox).mockResolvedValue(openResult)
    let returned: api.OpenBoxResult | undefined
    await act(async () => {
      returned = await result.current.openBox('box-starter')
    })
    expect(returned).toEqual(openResult)
    expect(result.current.state?.points).toBe(1500)
    expect(result.current.dex[0].status).toBe('COLLECTING')
    expect(result.current.dex[0].fragmentCount).toBe(1)
  })

  it('openBox resolves undefined when the API call fails', async () => {
    vi.mocked(api.claimSlots).mockResolvedValue(claimResult(0))
    vi.mocked(api.fetchGameState).mockResolvedValue({ ...emptyState, points: 1000 })
    vi.mocked(api.openBox).mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useGame(), { wrapper })
    await waitFor(() => expect(result.current.state?.points).toBe(1000))
    let returned: api.OpenBoxResult | undefined
    await act(async () => {
      returned = await result.current.openBox('box-starter')
    })
    expect(returned).toBeUndefined()
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/state/GameContext.test.tsx`
Expected: FAIL — the first test's `returned` is `undefined` (current `openBox` returns nothing).

- [ ] **Step 3: Implement the return value**

In `src/state/GameContext.tsx`, find:

```tsx
  const openBox = useCallback(async (boxId: string) => {
    try {
      const result = await openBoxApi(boxId)
      setState((prev) => (prev ? { ...prev, points: result.pointsBalance } : prev))
      setDex((prev) => prev.map((entry) => (entry.id === result.dexEntry.id ? result.dexEntry : entry)))
    } catch (error) {
      console.warn('open box failed', error)
    }
  }, [])
```

Replace with:

```tsx
  const openBox = useCallback(async (boxId: string) => {
    try {
      const result = await openBoxApi(boxId)
      setState((prev) => (prev ? { ...prev, points: result.pointsBalance } : prev))
      setDex((prev) => prev.map((entry) => (entry.id === result.dexEntry.id ? result.dexEntry : entry)))
      return result
    } catch (error) {
      console.warn('open box failed', error)
      return undefined
    }
  }, [])
```

Find the `GameContextValue` type:

```tsx
type GameContextValue = {
  state: GameState | null
  boxes: Box[]
  dex: DexEntry[]
  refresh: () => Promise<void>
  claim: (slotIds: string[]) => Promise<void>
  openBox: (boxId: string) => Promise<void>
}
```

Replace with:

```tsx
type GameContextValue = {
  state: GameState | null
  boxes: Box[]
  dex: DexEntry[]
  refresh: () => Promise<void>
  claim: (slotIds: string[]) => Promise<void>
  openBox: (boxId: string) => Promise<OpenBoxResult | undefined>
}
```

Find the import block:

```tsx
import {
  claimSlots as claimSlotsApi,
  fetchGameState,
  fetchBoxes,
  fetchDex,
  openBox as openBoxApi,
  type GameState,
  type Box,
  type DexEntry,
} from '../lib/gameApi'
```

Replace with:

```tsx
import {
  claimSlots as claimSlotsApi,
  fetchGameState,
  fetchBoxes,
  fetchDex,
  openBox as openBoxApi,
  type GameState,
  type Box,
  type DexEntry,
  type OpenBoxResult,
} from '../lib/gameApi'
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsc --noEmit` (clean) and `npx vitest run src/state/GameContext.test.tsx` — expected PASS (5 tests: existing 3 unaffected + the rewritten one + the new one).

- [ ] **Step 5: Commit**

```bash
git add src/state/GameContext.tsx src/state/GameContext.test.tsx
git commit -m "feat: return the open-box result from GameContext.openBox"
```

---

### Task 2: Grade color/label helpers

**Files:**
- Create: `src/data/gradeColors.ts`, `src/data/gradeColors.test.ts`

**Interfaces:**
- Produces: `GRADE_ORDER: readonly string[]` (`['COMMON', 'ADVANCED', 'RARE', 'LEGENDARY']`), `gradeLabel(grade: string): string`, `gradeColor(grade: string): { bg: string; text: string; shadow: string }`.

- [ ] **Step 1: Write the failing test**

Create `src/data/gradeColors.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { GRADE_ORDER, gradeLabel, gradeColor } from './gradeColors'

describe('gradeColors', () => {
  it('fixes the display order regardless of any external ordering', () => {
    expect(GRADE_ORDER).toEqual(['COMMON', 'ADVANCED', 'RARE', 'LEGENDARY'])
  })

  it('labels every known grade in Korean', () => {
    expect(gradeLabel('COMMON')).toBe('일반')
    expect(gradeLabel('ADVANCED')).toBe('고급')
    expect(gradeLabel('RARE')).toBe('레어')
    expect(gradeLabel('LEGENDARY')).toBe('전설')
  })

  it('falls back to the raw string for an unknown grade label', () => {
    expect(gradeLabel('MYTHIC')).toBe('MYTHIC')
  })

  it('gives every known grade a distinct color style', () => {
    const styles = GRADE_ORDER.map((grade) => gradeColor(grade))
    const uniqueBackgrounds = new Set(styles.map((s) => s.bg))
    expect(uniqueBackgrounds.size).toBe(4)
  })

  it('falls back to the COMMON style for an unknown grade', () => {
    expect(gradeColor('MYTHIC')).toEqual(gradeColor('COMMON'))
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/data/gradeColors.test.ts`
Expected: FAIL (cannot find module `./gradeColors`).

- [ ] **Step 3: Implement `src/data/gradeColors.ts`**

```ts
type GradeStyle = { bg: string; text: string; shadow: string }

export const GRADE_ORDER = ['COMMON', 'ADVANCED', 'RARE', 'LEGENDARY'] as const

const GRADE_LABEL: Record<string, string> = {
  COMMON: '일반',
  ADVANCED: '고급',
  RARE: '레어',
  LEGENDARY: '전설',
}

const GRADE_COLOR: Record<string, GradeStyle> = {
  COMMON: {
    bg: 'bg-surface-container-high',
    text: 'text-on-surface-variant',
    shadow: 'shadow-[0_2px_0px_#e1bfb8]',
  },
  ADVANCED: {
    bg: 'bg-secondary-container',
    text: 'text-secondary',
    shadow: 'shadow-[0_2px_0px_#aecdc4]',
  },
  RARE: {
    bg: 'bg-primary-container',
    text: 'text-on-primary-container',
    shadow: 'shadow-[0_2px_0px_#8b1901]',
  },
  LEGENDARY: {
    bg: 'bg-tertiary-fixed',
    text: 'text-on-tertiary-fixed',
    shadow: 'shadow-[0_2px_0px_#653e00]',
  },
}

export function gradeLabel(grade: string): string {
  return GRADE_LABEL[grade] ?? grade
}

export function gradeColor(grade: string): GradeStyle {
  return GRADE_COLOR[grade] ?? GRADE_COLOR.COMMON
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsc --noEmit` (clean) and `npx vitest run src/data/gradeColors.test.ts` — expected PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/gradeColors.ts src/data/gradeColors.test.ts
git commit -m "feat: add shared grade color/label lookup for dex and box-open screens"
```

---

### Task 3: `DexItemCard` component

**Files:**
- Create: `src/components/DexItemCard.tsx`, `src/components/DexItemCard.test.tsx`

**Interfaces:**
- Consumes: `DexEntry` type (`src/lib/gameApi.ts`), `Icon` (`../data/materialIcons`), `gradeColor`/`gradeLabel` (`../data/gradeColors`, Task 2).
- Produces: `DexItemCard({ entry: DexEntry; onOpen: () => void })` — a `LOCKED` entry renders a non-interactive placeholder (no click handler, shows `???`, hides the real name); a `COLLECTING`/`COMPLETE` entry renders as a `<button>` that calls `onOpen`.

- [ ] **Step 1: Write the failing test**

Create `src/components/DexItemCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DexItemCard } from './DexItemCard'
import type { DexEntry } from '../lib/gameApi'

const LOCKED: DexEntry = {
  id: 'item-a',
  name: '기본 세면대',
  grade: 'COMMON',
  fragmentsRequired: 10,
  status: 'LOCKED',
  fragmentCount: 0,
}

const COLLECTING: DexEntry = { ...LOCKED, status: 'COLLECTING', fragmentCount: 4 }
const COMPLETE: DexEntry = { ...LOCKED, status: 'COMPLETE', fragmentCount: 10 }

describe('DexItemCard', () => {
  it('a LOCKED entry hides the name, shows "???", and has no click handler', () => {
    const onOpen = vi.fn()
    render(<DexItemCard entry={LOCKED} onOpen={onOpen} />)
    expect(screen.getByText('???')).toBeInTheDocument()
    expect(screen.queryByText('기본 세면대')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('a COLLECTING entry shows the name and a fragment progress bar', () => {
    render(<DexItemCard entry={COLLECTING} onOpen={() => {}} />)
    expect(screen.getByText('기본 세면대')).toBeInTheDocument()
    const track = screen.getByTestId('dex-progress-fill')
    expect(track).toHaveStyle({ width: '40%' })
  })

  it('a COMPLETE entry shows the name and no progress bar, and calls onOpen when tapped', () => {
    const onOpen = vi.fn()
    render(<DexItemCard entry={COMPLETE} onOpen={onOpen} />)
    expect(screen.getByText('기본 세면대')).toBeInTheDocument()
    expect(screen.queryByTestId('dex-progress-fill')).not.toBeInTheDocument()
    screen.getByRole('button').click()
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/DexItemCard.test.tsx`
Expected: FAIL (cannot find module `./DexItemCard`).

- [ ] **Step 3: Implement `src/components/DexItemCard.tsx`**

```tsx
import type { DexEntry } from '../lib/gameApi'
import { Icon } from '../data/materialIcons'
import { gradeColor, gradeLabel } from '../data/gradeColors'

export function DexItemCard({ entry, onOpen }: { entry: DexEntry; onOpen: () => void }) {
  if (entry.status === 'LOCKED') {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl bg-surface-container p-space-sm text-center opacity-60">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
          <Icon name="lock" className="text-[18px]" />
        </div>
        <span className="text-label-md text-on-surface-variant">???</span>
      </div>
    )
  }

  const color = gradeColor(entry.grade)
  const percent = Math.min(100, Math.round((entry.fragmentCount / entry.fragmentsRequired) * 100))

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full flex-col items-center gap-1 rounded-xl ${color.bg} p-space-sm text-center ${color.shadow} transition-transform active:scale-95`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest ${color.text}`}>
        <Icon name={entry.status === 'COMPLETE' ? 'check_circle' : 'inventory_2'} className="text-[18px]" />
      </div>
      <span className={`text-label-md font-bold ${color.text}`}>{entry.name}</span>
      <span className="text-label-sm text-on-surface-variant">{gradeLabel(entry.grade)}</span>
      {entry.status === 'COLLECTING' && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-low">
          <div
            data-testid="dex-progress-fill"
            className="h-full rounded-full bg-primary"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </button>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsc --noEmit` (clean) and `npx vitest run src/components/DexItemCard.test.tsx` — expected PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/DexItemCard.tsx src/components/DexItemCard.test.tsx
git commit -m "feat: add DexItemCard (locked/collecting/complete states)"
```

---

### Task 4: `DexPage`

**Files:**
- Create: `src/pages/DexPage.tsx`, `src/pages/DexPage.test.tsx`

**Interfaces:**
- Consumes: `useGame()` (`../state/GameContext`) for `dex: DexEntry[]`; `DexItemCard` (Task 3); `GRADE_ORDER`, `gradeLabel` (Task 2).
- Produces: `DexPage` (default export) — no props, no new context.

- [ ] **Step 1: Write the failing test**

Create `src/pages/DexPage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DexPage from './DexPage'
import * as GameContextModule from '../state/GameContext'
import type { DexEntry } from '../lib/gameApi'

vi.mock('../state/GameContext')

const ENTRIES: DexEntry[] = [
  { id: 'legendary-1', name: '전설템', grade: 'LEGENDARY', fragmentsRequired: 30, status: 'LOCKED', fragmentCount: 0 },
  { id: 'common-1', name: '기본템', grade: 'COMMON', fragmentsRequired: 10, status: 'COLLECTING', fragmentCount: 3 },
  { id: 'rare-1', name: '레어템', grade: 'RARE', fragmentsRequired: 20, status: 'COMPLETE', fragmentCount: 20 },
]

function mockGame(dex: DexEntry[]) {
  vi.mocked(GameContextModule.useGame).mockReturnValue({
    state: null,
    boxes: [],
    dex,
    refresh: vi.fn(),
    claim: vi.fn(),
    openBox: vi.fn(),
  })
}

describe('DexPage', () => {
  it('shows a loading line when the dex has not loaded yet', () => {
    mockGame([])
    render(<DexPage />)
    expect(screen.getByText('도감 정보를 불러오는 중...')).toBeInTheDocument()
  })

  it('groups entries under fixed COMMON/ADVANCED/RARE/LEGENDARY headers regardless of input order, skipping empty grades', () => {
    mockGame(ENTRIES)
    render(<DexPage />)
    const headers = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headers).toEqual(['일반', '레어', '전설'])
  })

  it('opens a detail sheet for a non-locked entry and closes it on 닫기', () => {
    mockGame(ENTRIES)
    render(<DexPage />)
    fireEvent.click(screen.getByText('레어템'))
    expect(screen.getByText('20 / 20 조각')).toBeInTheDocument()
    fireEvent.click(screen.getByText('닫기'))
    expect(screen.queryByText('20 / 20 조각')).not.toBeInTheDocument()
  })

  it('a locked entry has no detail sheet to open', () => {
    mockGame(ENTRIES)
    render(<DexPage />)
    fireEvent.click(screen.getByText('???'))
    expect(screen.queryByText('0 / 30 조각')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/DexPage.test.tsx`
Expected: FAIL (cannot find module `./DexPage`).

- [ ] **Step 3: Implement `src/pages/DexPage.tsx`**

```tsx
import { useState } from 'react'
import { useGame } from '../state/GameContext'
import { DexItemCard } from '../components/DexItemCard'
import { GRADE_ORDER, gradeLabel } from '../data/gradeColors'
import type { DexEntry } from '../lib/gameApi'

export default function DexPage() {
  const { dex } = useGame()
  const [selected, setSelected] = useState<DexEntry | null>(null)

  return (
    <div className="space-y-4 p-4">
      <h1 className="font-heading text-headline-lg text-on-surface">가상 아이템 도감</h1>

      {dex.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">도감 정보를 불러오는 중...</p>
      ) : (
        GRADE_ORDER.map((grade) => {
          const entries = dex.filter((entry) => entry.grade === grade)
          if (entries.length === 0) return null
          return (
            <div key={grade} className="space-y-2">
              <h2 className="text-label-lg font-bold text-on-surface-variant">{gradeLabel(grade)}</h2>
              <div className="grid grid-cols-2 gap-2">
                {entries.map((entry) => (
                  <DexItemCard key={entry.id} entry={entry} onOpen={() => setSelected(entry)} />
                ))}
              </div>
            </div>
          )
        })
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md space-y-2 rounded-t-2xl bg-surface-container-lowest p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-center font-heading text-headline-md text-on-surface">{selected.name}</p>
            <p className="text-center text-body-sm text-on-surface-variant">{gradeLabel(selected.grade)}</p>
            <p className="text-center text-body-sm text-on-surface-variant">
              {selected.fragmentCount} / {selected.fragmentsRequired} 조각
            </p>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="w-full pt-2 text-center text-body-sm text-on-surface-variant"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsc --noEmit` (clean) and `npx vitest run src/pages/DexPage.test.tsx` — expected PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/DexPage.tsx src/pages/DexPage.test.tsx
git commit -m "feat: add DexPage (grade-grouped virtual item dex)"
```

---

### Task 5: `BoxOpenResultModal` component

**Files:**
- Create: `src/components/BoxOpenResultModal.tsx`, `src/components/BoxOpenResultModal.test.tsx`

**Interfaces:**
- Consumes: `OpenBoxResult` type (`src/lib/gameApi.ts`), `gradeColor`/`gradeLabel` (Task 2), `Icon`.
- Produces: `BoxOpenResultModal({ result: OpenBoxResult; onClose: () => void; onViewDex: () => void })`. (The design spec's "Props" line listed only `result`/`onClose`; `onViewDex` is added here because the spec's own footer description names two distinct actions — closing the modal vs. navigating to `/dex` and closing — which need two separate callbacks so this component stays a pure presentational unit with no `react-router-dom` dependency of its own.)

- [ ] **Step 1: Write the failing test**

Create `src/components/BoxOpenResultModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BoxOpenResultModal } from './BoxOpenResultModal'
import type { OpenBoxResult } from '../lib/gameApi'

const FRAGMENT_RESULT: OpenBoxResult = {
  result: { type: 'FRAGMENT', itemId: 'item-a', itemName: '기본 세면대', grade: 'COMMON' },
  pointsSpent: 500,
  pointsBalance: 1000,
  dexEntry: { id: 'item-a', name: '기본 세면대', grade: 'COMMON', fragmentsRequired: 10, status: 'COLLECTING', fragmentCount: 4 },
}

const COMPLETING_FRAGMENT_RESULT: OpenBoxResult = {
  ...FRAGMENT_RESULT,
  dexEntry: { ...FRAGMENT_RESULT.dexEntry, status: 'COMPLETE', fragmentCount: 10 },
}

const FULL_ITEM_RESULT: OpenBoxResult = {
  result: { type: 'FULL_ITEM', itemId: 'item-b', itemName: '골드 거울', grade: 'RARE' },
  pointsSpent: 500,
  pointsBalance: 1000,
  dexEntry: { id: 'item-b', name: '골드 거울', grade: 'RARE', fragmentsRequired: 20, status: 'COMPLETE', fragmentCount: 0 },
}

describe('BoxOpenResultModal', () => {
  it('shows fragment progress for a FRAGMENT result that did not complete the item', () => {
    render(<BoxOpenResultModal result={FRAGMENT_RESULT} onClose={() => {}} onViewDex={() => {}} />)
    expect(screen.getByText('조각을 획득했어요!')).toBeInTheDocument()
    expect(screen.getByText('4 / 10 조각')).toBeInTheDocument()
  })

  it('shows the completion headline for a FRAGMENT result that just completed the item', () => {
    render(<BoxOpenResultModal result={COMPLETING_FRAGMENT_RESULT} onClose={() => {}} onViewDex={() => {}} />)
    expect(screen.getByText('도감을 완성했어요!')).toBeInTheDocument()
    expect(screen.queryByText(/\/ 10 조각/)).not.toBeInTheDocument()
  })

  it('shows the completion headline for a FULL_ITEM result', () => {
    render(<BoxOpenResultModal result={FULL_ITEM_RESULT} onClose={() => {}} onViewDex={() => {}} />)
    expect(screen.getByText('도감을 완성했어요!')).toBeInTheDocument()
    expect(screen.getByText('골드 거울')).toBeInTheDocument()
  })

  it('calls onClose from the backdrop and the 닫기 button, and onViewDex from 도감으로 이동', () => {
    const onClose = vi.fn()
    const onViewDex = vi.fn()
    render(<BoxOpenResultModal result={FRAGMENT_RESULT} onClose={onClose} onViewDex={onViewDex} />)
    screen.getByText('닫기').click()
    expect(onClose).toHaveBeenCalledTimes(1)
    screen.getByText('도감으로 이동').click()
    expect(onViewDex).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/BoxOpenResultModal.test.tsx`
Expected: FAIL (cannot find module `./BoxOpenResultModal`).

- [ ] **Step 3: Implement `src/components/BoxOpenResultModal.tsx`**

```tsx
import { Icon } from '../data/materialIcons'
import { gradeColor, gradeLabel } from '../data/gradeColors'
import type { OpenBoxResult } from '../lib/gameApi'

export function BoxOpenResultModal({
  result,
  onClose,
  onViewDex,
}: {
  result: OpenBoxResult
  onClose: () => void
  onViewDex: () => void
}) {
  const color = gradeColor(result.result.grade)
  const completed = result.result.type === 'FULL_ITEM' || result.dexEntry.status === 'COMPLETE'
  const percent = Math.min(
    100,
    Math.round((result.dexEntry.fragmentCount / result.dexEntry.fragmentsRequired) * 100)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-sm space-y-4 rounded-2xl bg-surface-container-lowest p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex flex-col items-center gap-2 rounded-xl ${color.bg} p-space-lg`}>
          <Icon name={completed ? 'military_tech' : 'redeem'} className={`text-[48px] ${color.text}`} />
          <span className={`text-label-md font-bold ${color.text}`}>{gradeLabel(result.result.grade)}</span>
        </div>

        <div className="space-y-1 text-center">
          <p className="font-heading text-headline-md text-on-surface">
            {completed ? '도감을 완성했어요!' : '조각을 획득했어요!'}
          </p>
          <p className="text-body-md text-on-surface-variant">{result.result.itemName}</p>
        </div>

        {!completed && (
          <div className="space-y-1">
            <div className="h-3 w-full overflow-hidden rounded-full bg-surface-container-low">
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-center text-label-sm text-on-surface-variant">
              {result.dexEntry.fragmentCount} / {result.dexEntry.fragmentsRequired} 조각
            </p>
          </div>
        )}

        <div className="flex items-stretch gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-surface-container px-space-md py-2.5 text-label-lg text-on-surface-variant"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onViewDex}
            className="flex-1 rounded-xl bg-primary px-space-md py-2.5 text-label-lg text-on-primary shadow-[0_3px_0px_#8b1901] active:translate-y-0.5 active:shadow-[0_1px_0px_#8b1901]"
          >
            도감으로 이동
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsc --noEmit` (clean) and `npx vitest run src/components/BoxOpenResultModal.test.tsx` — expected PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/BoxOpenResultModal.tsx src/components/BoxOpenResultModal.test.tsx
git commit -m "feat: add BoxOpenResultModal"
```

---

### Task 6: `StorePage`

**Files:**
- Create: `src/pages/StorePage.tsx`, `src/pages/StorePage.test.tsx`

**Interfaces:**
- Consumes: `useGame()` for `boxes: Box[]`, `state: GameState | null`, `openBox: (boxId: string) => Promise<OpenBoxResult | undefined>` (Task 1); `BoxOpenResultModal` (Task 5); `useNavigate` from `react-router-dom`.
- Produces: `StorePage` (default export) — no props.

- [ ] **Step 1: Write the failing test**

Create `src/pages/StorePage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import StorePage from './StorePage'
import * as GameContextModule from '../state/GameContext'
import type { Box, GameState, OpenBoxResult } from '../lib/gameApi'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})
vi.mock('../state/GameContext')

const BOX: Box = { id: 'box-starter', name: '시작 상자', costPoints: 500 }
const STATE: GameState = { points: 700, spaces: [], titles: [], benefits: [] }

function mockGame(overrides: {
  boxes?: Box[]
  state?: GameState | null
  openBox?: ReturnType<typeof vi.fn>
} = {}) {
  vi.mocked(GameContextModule.useGame).mockReturnValue({
    state: overrides.state ?? STATE,
    boxes: overrides.boxes ?? [BOX],
    dex: [],
    refresh: vi.fn(),
    claim: vi.fn(),
    openBox: overrides.openBox ?? vi.fn(),
  })
}

describe('StorePage', () => {
  beforeEach(() => {
    navigateMock.mockClear()
  })

  it('shows a loading line while boxes have not loaded', () => {
    mockGame({ boxes: [] })
    render(<StorePage />)
    expect(screen.getByText('상자 정보를 불러오는 중...')).toBeInTheDocument()
  })

  it('disables the open button and shows a hint when points are below cost', () => {
    mockGame({ state: { ...STATE, points: 100 } })
    render(<StorePage />)
    expect(screen.getByRole('button', { name: '1개 열기' })).toBeDisabled()
    expect(screen.getByText('포인트가 부족해요')).toBeInTheDocument()
  })

  it('opens the box and shows the result modal on success', async () => {
    const opened: OpenBoxResult = {
      result: { type: 'FRAGMENT', itemId: 'item-x', itemName: 'X', grade: 'COMMON' },
      pointsSpent: 500,
      pointsBalance: 200,
      dexEntry: { id: 'item-x', name: 'X', grade: 'COMMON', fragmentsRequired: 10, status: 'COLLECTING', fragmentCount: 1 },
    }
    mockGame({ openBox: vi.fn().mockResolvedValue(opened) })
    render(<StorePage />)
    fireEvent.click(screen.getByRole('button', { name: '1개 열기' }))
    await waitFor(() => expect(screen.getByText('조각을 획득했어요!')).toBeInTheDocument())
  })

  it('shows an inline failure message when the open call resolves undefined', async () => {
    mockGame({ openBox: vi.fn().mockResolvedValue(undefined) })
    render(<StorePage />)
    fireEvent.click(screen.getByRole('button', { name: '1개 열기' }))
    await waitFor(() =>
      expect(screen.getByText('상자를 열지 못했어요, 다시 시도해주세요')).toBeInTheDocument()
    )
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/StorePage.test.tsx`
Expected: FAIL (cannot find module `./StorePage`).

- [ ] **Step 3: Implement `src/pages/StorePage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../state/GameContext'
import { BoxOpenResultModal } from '../components/BoxOpenResultModal'
import { Icon } from '../data/materialIcons'
import type { OpenBoxResult } from '../lib/gameApi'

export default function StorePage() {
  const { boxes, state, openBox } = useGame()
  const navigate = useNavigate()
  const [opening, setOpening] = useState<string | null>(null)
  const [result, setResult] = useState<OpenBoxResult | null>(null)
  const [failedBoxId, setFailedBoxId] = useState<string | null>(null)
  const points = state?.points ?? 0

  async function handleOpen(boxId: string) {
    setOpening(boxId)
    setFailedBoxId(null)
    const opened = await openBox(boxId)
    setOpening(null)
    if (opened) {
      setResult(opened)
    } else {
      setFailedBoxId(boxId)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-headline-lg text-on-surface">선물상자 상점</h1>
        <span className="flex items-center gap-1 rounded-full bg-surface-container-high px-space-sm py-1 text-label-md font-bold text-tertiary">
          <Icon name="monetization_on" className="text-[16px]" />
          <span>{points}P</span>
        </span>
      </div>

      {boxes.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">상자 정보를 불러오는 중...</p>
      ) : (
        boxes.map((box) => {
          const affordable = points >= box.costPoints
          return (
            <div
              key={box.id}
              className="space-y-3 rounded-xl bg-surface-container-lowest p-space-md shadow-[0_4px_0px_#eae0de]"
            >
              <div className="flex items-center justify-between">
                <span className="font-heading text-headline-md text-on-surface">{box.name}</span>
                <span className="flex items-center gap-1 text-label-lg font-bold text-tertiary">
                  <Icon name="monetization_on" className="text-[16px]" />
                  <span>{box.costPoints}P</span>
                </span>
              </div>
              <button
                type="button"
                disabled={!affordable || opening === box.id}
                onClick={() => handleOpen(box.id)}
                className="w-full rounded-xl bg-primary py-2.5 text-label-lg text-on-primary shadow-[0_3px_0px_#8b1901] active:translate-y-0.5 active:shadow-[0_1px_0px_#8b1901] disabled:opacity-40 disabled:active:translate-y-0 disabled:active:shadow-[0_3px_0px_#8b1901]"
              >
                {opening === box.id ? '여는 중...' : '1개 열기'}
              </button>
              {!affordable && <p className="text-center text-label-sm text-primary">포인트가 부족해요</p>}
              {failedBoxId === box.id && (
                <p className="text-center text-label-sm text-primary">상자를 열지 못했어요, 다시 시도해주세요</p>
              )}
            </div>
          )
        })
      )}

      {result && (
        <BoxOpenResultModal
          result={result}
          onClose={() => setResult(null)}
          onViewDex={() => {
            setResult(null)
            navigate('/dex')
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsc --noEmit` (clean) and `npx vitest run src/pages/StorePage.test.tsx` — expected PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/StorePage.tsx src/pages/StorePage.test.tsx
git commit -m "feat: add StorePage"
```

---

### Task 7: `HomeGameCard` component

**Files:**
- Create: `src/components/HomeGameCard.tsx`, `src/components/HomeGameCard.test.tsx`

**Interfaces:**
- Consumes: `useGame()` for `state: GameState | null`, `dex: DexEntry[]`; `useNavigate` from `react-router-dom`.
- Produces: `HomeGameCard()` — no props.

- [ ] **Step 1: Write the failing test**

Create `src/components/HomeGameCard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HomeGameCard } from './HomeGameCard'
import * as GameContextModule from '../state/GameContext'
import type { DexEntry, GameState } from '../lib/gameApi'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})
vi.mock('../state/GameContext')

const STATE: GameState = { points: 1250, spaces: [], titles: [], benefits: [] }
const DEX: DexEntry[] = [
  { id: 'a', name: 'A', grade: 'COMMON', fragmentsRequired: 10, status: 'COMPLETE', fragmentCount: 10 },
  { id: 'b', name: 'B', grade: 'COMMON', fragmentsRequired: 10, status: 'LOCKED', fragmentCount: 0 },
]

function mockGame(state: GameState | null, dex: DexEntry[]) {
  vi.mocked(GameContextModule.useGame).mockReturnValue({
    state,
    boxes: [],
    dex,
    refresh: vi.fn(),
    claim: vi.fn(),
    openBox: vi.fn(),
  })
}

describe('HomeGameCard', () => {
  beforeEach(() => {
    navigateMock.mockClear()
  })

  it('shows the points balance and the completed/total dex count', () => {
    mockGame(STATE, DEX)
    render(<HomeGameCard />)
    expect(screen.getByText('1250P')).toBeInTheDocument()
    expect(screen.getByText('1/2 완성')).toBeInTheDocument()
  })

  it('shows a placeholder line while the dex has not loaded', () => {
    mockGame(STATE, [])
    render(<HomeGameCard />)
    expect(screen.getByText('도감을 채워보세요')).toBeInTheDocument()
  })

  it('navigates to /store and /dex from its two buttons', () => {
    mockGame(STATE, DEX)
    render(<HomeGameCard />)
    fireEvent.click(screen.getByText('상자 열기'))
    expect(navigateMock).toHaveBeenCalledWith('/store')
    fireEvent.click(screen.getByText('도감 보기'))
    expect(navigateMock).toHaveBeenCalledWith('/dex')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/HomeGameCard.test.tsx`
Expected: FAIL (cannot find module `./HomeGameCard`).

- [ ] **Step 3: Implement `src/components/HomeGameCard.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import { useGame } from '../state/GameContext'
import { Icon } from '../data/materialIcons'

export function HomeGameCard() {
  const { state, dex } = useGame()
  const navigate = useNavigate()
  const points = state?.points ?? 0
  const completed = dex.filter((entry) => entry.status === 'COMPLETE').length

  return (
    <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-[0_4px_0px_#eae0de]">
      <div className="mb-space-sm flex items-center justify-between">
        <span className="font-heading text-headline-md text-on-surface">가상 상자함</span>
        <span className="flex items-center gap-1 text-label-lg font-bold text-tertiary">
          <Icon name="monetization_on" className="text-[16px]" />
          <span>{points}P</span>
        </span>
      </div>
      <p className="mb-space-md text-body-sm text-on-surface-variant">
        {dex.length === 0 ? '도감을 채워보세요' : `${completed}/${dex.length} 완성`}
      </p>
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => navigate('/store')}
          className="flex-1 rounded-xl bg-primary py-2.5 text-label-lg text-on-primary shadow-[0_3px_0px_#8b1901] active:translate-y-0.5 active:shadow-[0_1px_0px_#8b1901]"
        >
          상자 열기
        </button>
        <button
          type="button"
          onClick={() => navigate('/dex')}
          className="flex-1 rounded-xl bg-surface-container px-space-md py-2.5 text-label-lg text-on-surface-variant"
        >
          도감 보기
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsc --noEmit` (clean) and `npx vitest run src/components/HomeGameCard.test.tsx` — expected PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/HomeGameCard.tsx src/components/HomeGameCard.test.tsx
git commit -m "feat: add HomeGameCard"
```

---

### Task 8: Wire routes, home card, and final verification

**Files:**
- Modify: `src/App.tsx`, `src/pages/HomePage.tsx`

**Interfaces:** none new — wires together Tasks 1-7.

- [ ] **Step 1: Add the two routes**

In `src/App.tsx`, find:

```tsx
import { Routes, Route } from 'react-router-dom'
import { LockerProvider } from './state/LockerContext'
import { GameProvider } from './state/GameContext'
import { AppLayout } from './components/AppLayout'
import HomePage from './pages/HomePage'
import ItemDetailPage from './pages/ItemDetailPage'
import RankingPage from './pages/RankingPage'
import NotificationsPage from './pages/NotificationsPage'
import PurchasePage from './pages/PurchasePage'
import FamilyPage from './pages/FamilyPage'
import NewItemPage from './pages/NewItemPage'
import CollectionPage from './pages/CollectionPage'

export default function App() {
  return (
    <LockerProvider>
      <GameProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/item/:id" element={<ItemDetailPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/purchase" element={<PurchasePage />} />
          <Route path="/family" element={<FamilyPage />} />
          <Route path="/new" element={<NewItemPage />} />
          <Route path="/collection" element={<CollectionPage />} />
        </Route>
      </Routes>
      </GameProvider>
    </LockerProvider>
  )
}
```

Replace with:

```tsx
import { Routes, Route } from 'react-router-dom'
import { LockerProvider } from './state/LockerContext'
import { GameProvider } from './state/GameContext'
import { AppLayout } from './components/AppLayout'
import HomePage from './pages/HomePage'
import ItemDetailPage from './pages/ItemDetailPage'
import RankingPage from './pages/RankingPage'
import NotificationsPage from './pages/NotificationsPage'
import PurchasePage from './pages/PurchasePage'
import FamilyPage from './pages/FamilyPage'
import NewItemPage from './pages/NewItemPage'
import CollectionPage from './pages/CollectionPage'
import StorePage from './pages/StorePage'
import DexPage from './pages/DexPage'

export default function App() {
  return (
    <LockerProvider>
      <GameProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/item/:id" element={<ItemDetailPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/purchase" element={<PurchasePage />} />
          <Route path="/family" element={<FamilyPage />} />
          <Route path="/new" element={<NewItemPage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/dex" element={<DexPage />} />
        </Route>
      </Routes>
      </GameProvider>
    </LockerProvider>
  )
}
```

- [ ] **Step 2: Render `HomeGameCard` on the home screen**

In `src/pages/HomePage.tsx`, find:

```tsx
import { AnalyzingOverlay } from '../components/AnalyzingOverlay'
import { Icon } from '../data/materialIcons'
import { DUMMY_QUESTS } from '../data/homeDummy'
```

Replace with:

```tsx
import { AnalyzingOverlay } from '../components/AnalyzingOverlay'
import { HomeGameCard } from '../components/HomeGameCard'
import { Icon } from '../data/materialIcons'
import { DUMMY_QUESTS } from '../data/homeDummy'
```

Find:

```tsx
      {!selectedLocationId && (
        <>
          <HomeProfileCard itemCount={items.length} />
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg">추천 퀘스트</h2>
```

Replace with:

```tsx
      {!selectedLocationId && (
        <>
          <HomeProfileCard itemCount={items.length} />
          <HomeGameCard />
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg">추천 퀘스트</h2>
```

- [ ] **Step 3: Full verification**

Run, in order:
1. `npx tsc --noEmit` — expect clean.
2. `npx vitest run` — expect all tests green (69 existing + 2 from Task 1's rewritten/added tests + 5 from Task 2 + 3 from Task 3 + 4 from Task 4 + 4 from Task 5 + 4 from Task 6 + 3 from Task 7 = 94 total; confirm the exact number from the tool's own summary rather than trusting this arithmetic).
3. `npm run build` — expect success.
4. `npm run test:server` — expect unaffected (36 tests, unchanged by this plan).

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/pages/HomePage.tsx
git commit -m "feat: wire /store and /dex routes, add home entry point"
```

---

### Task 9: Verification report

**Files:** none (verification only)

- [ ] **Step 1: Summarize**

Report the exact test counts from Task 8 Step 3's tool output (not a recomputed guess), confirm `tsc --noEmit` and `npm run build` both succeeded, and confirm `npm run test:server` is unchanged at 36/36.
