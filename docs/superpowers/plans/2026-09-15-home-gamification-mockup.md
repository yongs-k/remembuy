# Home Screen Gamification Mockup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visual-only profile/stats card and a swipeable "recommended quest" carousel to the top level of the home screen, matching the reference screenshot, using static dummy data (no new points/quest/savings logic).

**Architecture:** Two new presentational components (`HomeProfileCard`, `QuestCarousel`) fed by one new static data module (`src/data/homeDummy.ts`), inserted into `HomePage.tsx`'s existing top-level (`!selectedLocationId`) branch, above the existing search bar and location grid.

**Tech Stack:** React + TypeScript, Tailwind CSS (existing project stack, no new dependencies).

## Global Constraints

- This is visual-only: no point accrual, quest progress tracking, reward redemption, or savings calculation is implemented. "보상받기" and "전체보기" have no behavior beyond what's specified per task.
- Exception: item count ("N개 기록 상품") uses real data — `items.length` from `useLocker()` — passed into `HomeProfileCard` as a prop, not read by the component itself.
- No changes to `Item`/`Location`/`Category` types or `LockerContext` — this plan touches only new files plus `HomePage.tsx`.
- The new profile/quest section renders **only** in `HomePage`'s top-level view (`!selectedLocationId`, i.e., before any location is drilled into) and **not** in the search-results view. The category/product drill-down levels are unchanged.
- Reuse existing design tokens and components: `bg-card`, `bg-paper`, `bg-stamp`, `bg-accent`, `text-ink`, the existing `Badge` component (`src/components/Badge.tsx`), and the existing linear-progress-bar markup pattern already used in `src/pages/CollectionPage.tsx:118-121` (`h-2 rounded-full bg-paper` track + `h-2 rounded-full bg-accent`/`bg-stamp` fill via inline `style={{ width: '${pct}%' }}`). No new colors or dependencies.
- No automated tests for the two new components — this plan follows the same precedent as this codebase's other visual/page-level components (`HomePage`, `RankingPage`, `NewItemPage`), verified via `npx tsc --noEmit` plus a manual trace instead of unit tests, because a scroll-snap carousel's active-dot behavior isn't meaningfully testable in jsdom (no real layout/scrollLeft).

## File Structure

```
src/
  data/
    homeDummy.ts                 # Create: static profile/stats/quest dummy data + DummyQuest type
  components/
    HomeProfileCard.tsx          # Create: avatar+name+title badge+4-stat row card
    QuestCarousel.tsx            # Create: swipeable quest card row + dot indicators
  pages/
    HomePage.tsx                 # Modify: render HomeProfileCard + quest section in the top-level branch
```

---

### Task 1: Dummy data module

**Files:**
- Create: `src/data/homeDummy.ts`

**Interfaces:**
- Produces: `DUMMY_PROFILE: { name: string; titleBadge: string }`, `DUMMY_STATS: { totalSaved: number; points: number; titleProgress: { current: number; total: number } }`, `DummyQuest` type, `DUMMY_QUESTS: DummyQuest[]`.

- [ ] **Step 1: Create `src/data/homeDummy.ts`**

```ts
export const DUMMY_PROFILE = {
  name: '지음님',
  titleBadge: '🧴 욕실마스터',
}

export const DUMMY_STATS = {
  totalSaved: 32000,
  points: 128,
  titleProgress: { current: 4, total: 8 },
}

export type DummyQuest = {
  id: string
  icon: string
  title: string
  subtitle: string
  progress: { current: number; total: number }
  rewardPoints: number
}

export const DUMMY_QUESTS: DummyQuest[] = [
  {
    id: 'quest-bathroom-essentials',
    icon: '💧',
    title: '욕실 필수템 채우기',
    subtitle: '샴푸・바디워시・치약',
    progress: { current: 3, total: 3 },
    rewardPoints: 30,
  },
  {
    id: 'quest-kitchen-restock',
    icon: '🍳',
    title: '주방 소모품 채우기',
    subtitle: '세제・수세미・키친타월',
    progress: { current: 1, total: 3 },
    rewardPoints: 20,
  },
]
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors (this file has no dependencies on the rest of the app).

- [ ] **Step 3: Commit**

```bash
git add src/data/homeDummy.ts
git commit -m "feat: add static dummy data for home profile/stats/quest mockup"
```

---

### Task 2: `HomeProfileCard` component

**Files:**
- Create: `src/components/HomeProfileCard.tsx`

**Interfaces:**
- Consumes: `DUMMY_PROFILE`, `DUMMY_STATS` (Task 1), `Badge` (existing, `src/components/Badge.tsx`, takes `children: ReactNode`).
- Produces: `HomeProfileCard({ itemCount }: { itemCount: number })` — default export is NOT used (named export, matching `Badge`/`ItemCard`'s existing named-export convention for shared components).

- [ ] **Step 1: Create `src/components/HomeProfileCard.tsx`**

```tsx
import { Badge } from './Badge'
import { DUMMY_PROFILE, DUMMY_STATS } from '../data/homeDummy'

export function HomeProfileCard({ itemCount }: { itemCount: number }) {
  return (
    <div className="space-y-3 rounded-2xl bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white">
          나
        </div>
        <div className="flex flex-1 items-center gap-2">
          <span className="font-medium">{DUMMY_PROFILE.name}</span>
          <Badge>{DUMMY_PROFILE.titleBadge}</Badge>
          <span className="text-ink/40">▾</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="font-heading text-lg">{itemCount}개</p>
          <p className="text-xs text-ink/50">기록 상품</p>
        </div>
        <div>
          <p className="font-heading text-lg">₩{DUMMY_STATS.totalSaved.toLocaleString()}</p>
          <p className="text-xs text-ink/50">누적 절약</p>
        </div>
        <div>
          <p className="font-heading text-lg">{DUMMY_STATS.points}P</p>
          <p className="text-xs text-ink/50">포인트</p>
        </div>
        <div>
          <p className="font-heading text-lg">
            {DUMMY_STATS.titleProgress.current}/{DUMMY_STATS.titleProgress.total}
          </p>
          <p className="text-xs text-ink/50">칭호</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/HomeProfileCard.tsx
git commit -m "feat: add HomeProfileCard (avatar, title badge, 4-stat row)"
```

---

### Task 3: `QuestCarousel` component

**Files:**
- Create: `src/components/QuestCarousel.tsx`

**Interfaces:**
- Consumes: `DummyQuest` type (Task 1).
- Produces: `QuestCarousel({ quests }: { quests: DummyQuest[] })`.

- [ ] **Step 1: Create `src/components/QuestCarousel.tsx`**

```tsx
import { useRef, useState } from 'react'
import type { DummyQuest } from '../data/homeDummy'

export function QuestCarousel({ quests }: { quests: DummyQuest[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  function handleScroll() {
    const el = scrollRef.current
    if (!el || quests.length === 0) return
    const cardWidth = el.scrollWidth / quests.length
    const index = Math.round(el.scrollLeft / cardWidth)
    setActiveIndex(Math.min(quests.length - 1, Math.max(0, index)))
  }

  return (
    <div className="space-y-2">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1"
      >
        {quests.map((quest) => (
          <div
            key={quest.id}
            className="w-full flex-shrink-0 snap-center rounded-2xl border border-stamp/30 bg-card p-4"
          >
            <div className="flex items-start gap-2">
              <span className="text-xl">{quest.icon}</span>
              <div className="flex-1">
                <p className="font-medium">{quest.title}</p>
                <p className="text-xs text-ink/50">{quest.subtitle}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-paper">
                <div
                  className="h-2 rounded-full bg-stamp"
                  style={{
                    width: `${Math.min(
                      100,
                      (quest.progress.current / quest.progress.total) * 100
                    )}%`,
                  }}
                />
              </div>
              <span className="text-xs text-ink/50">
                {quest.progress.current}/{quest.progress.total}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-medium text-stamp">+{quest.rewardPoints}P</span>
              <button
                type="button"
                disabled={quest.progress.current < quest.progress.total}
                className="rounded-full bg-stamp px-4 py-1.5 text-sm text-white disabled:opacity-40"
              >
                보상받기
              </button>
            </div>
          </div>
        ))}
      </div>
      {quests.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {quests.map((quest, i) => (
            <span
              key={quest.id}
              className={`h-1.5 w-1.5 rounded-full ${
                i === activeIndex ? 'bg-stamp' : 'bg-ink/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

Note on `disabled`: the brief's reference screenshot shows an enabled-looking "보상받기" button on a 3/3 (complete) quest. This implementation visually disables the button (`opacity-40`, `disabled`) when `current < total`, and leaves it enabled-looking (but still a no-op — no `onClick`) when the quest is complete, since a quest at 1/3 offering a claimable reward would misrepresent the mockup. This matches the reference screenshot's only shown quest (3/3, reward available).

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/QuestCarousel.tsx
git commit -m "feat: add QuestCarousel (swipeable quest cards with dot indicators)"
```

---

### Task 4: Wire into `HomePage`

**Files:**
- Modify: `src/pages/HomePage.tsx`

**Interfaces:**
- Consumes: `HomeProfileCard` (Task 2), `QuestCarousel` + `DUMMY_QUESTS` (Task 3, Task 1).

- [ ] **Step 1: Add imports**

At the top of `src/pages/HomePage.tsx`, alongside the existing imports:

```tsx
import { HomeProfileCard } from '../components/HomeProfileCard'
import { QuestCarousel } from '../components/QuestCarousel'
import { DUMMY_QUESTS } from '../data/homeDummy'
```

- [ ] **Step 2: Insert the profile/quest section into the top-level branch**

In the main `return` (the one starting `<div className="space-y-4 p-4">` that follows the `searchResults !== null` early return), the current top of that block is:

```tsx
  return (
    <div className="space-y-4 p-4">
      <input
        type="search"
        placeholder="상품 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-ink/20 bg-card p-2"
      />
```

Change it to insert the new section directly above the search `<input>`, gated on `!selectedLocationId` so it never shows once a location is drilled into:

```tsx
  return (
    <div className="space-y-4 p-4">
      {!selectedLocationId && (
        <>
          <HomeProfileCard itemCount={items.length} />
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg">추천 퀘스트</h2>
            <span className="text-sm text-ink/40">전체보기 →</span>
          </div>
          <QuestCarousel quests={DUMMY_QUESTS} />
        </>
      )}

      <input
        type="search"
        placeholder="상품 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-ink/20 bg-card p-2"
      />
```

Do not touch the `searchResults !== null` early-return block above this (the search-results view stays exactly as-is, with no profile/quest section), and do not touch anything below the search input (`selectedLocationId`/`selectedCategoryId` branches, the floating record button, or the record-options sheet).

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 4: Manual verification trace**

Trace against seed data (10 seed items, per `src/data/seedItems.ts`) and the dummy data from Task 1:
- Opening `/` (no location selected): `HomeProfileCard` shows "지음님" with the "🧴 욕실마스터" badge, and the stats row shows "10개 / 기록 상품" (real `items.length`), "₩32,000 / 누적 절약", "128P / 포인트", "4/8 / 칭호" (all from `DUMMY_STATS`).
- Below it, "추천 퀘스트" heading with "전체보기 →" renders, then the quest carousel shows the first card ("욕실 필수템 채우기", "샴푸・바디워시・치약", a fully-filled progress bar since 3/3, "+30P", an enabled-looking "보상받기" button) with two dots below it, the first one highlighted.
- Scrolling the carousel row right moves to the second card ("주방 소모품 채우기", 1/3 progress bar ~33% filled, "+20P", a dimmed/disabled "보상받기" button) and the second dot highlights instead.
- Clicking any location tile (e.g. `bathroom`) still drills into the category grid as before, and the profile card and quest carousel are gone from that view (only the "← 뒤로" button, category tiles, and the header/nav remain above the search input's usual position — note the search input itself always stays visible per the pre-existing behavior, this task doesn't change that).
- Typing into the search box still shows the flat search-results view with no profile/quest section (unchanged from before this task, since that branch is untouched).

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: show profile card and quest carousel on home's top-level view"
```

---

### Task 5: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `npx vitest run`
Expected: all existing tests still pass (43/43 as of the start of this plan — this plan adds no new test files, so the count should be unchanged).

- [ ] **Step 2: Type-check and build**

Run: `npx tsc --noEmit`
Expected: zero errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual golden-path walkthrough**

With `npm run dev` running, in a browser at the app's dev URL:
- Confirm the home screen's top level shows the profile card, stats row, "추천 퀘스트" heading, and the swipeable quest carousel with dots, above the search bar and location grid, matching the reference screenshot's layout and content.
- Confirm swiping/dragging the quest carousel moves between the two dummy quest cards and the active dot updates.
- Confirm drilling into a location and then into a category hides the profile/quest section and shows the existing category/product drill-down unchanged.
- Confirm searching (typing in the search box from any level) shows the flat search-results view with no profile/quest section.
- Confirm the floating "+" record button and its camera/photo/link/manual-entry sheet (added in the prior Group A plan work) still work unchanged.

- [ ] **Step 4: Commit final state (only if fixes were needed)**

If Steps 1-3 required any fixes, commit them now with a descriptive message. If everything passed as-is, no commit is needed for this task.
