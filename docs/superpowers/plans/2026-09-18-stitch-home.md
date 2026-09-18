# Stitch Home Screen Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Google Stitch Home screen mockup (`stitch/.../remembuy_2`) onto REMEMBUY's `AppLayout` shell and `HomePage`'s top-level view — visual only, using the Material 3 tokens already added in the Foundation sub-project.

**Architecture:** A new tiny Material Symbols icon helper + per-location icon map, a new richer `HomeLocationTile` component replacing the plain `LocationIcon` grid on Home specifically, and targeted restyles of `AppLayout`, `HomeProfileCard`, `QuestCarousel`, and `HomePage`. No routing, state, or data-flow logic changes anywhere.

**Tech Stack:** React + TypeScript + Tailwind (existing stack), Material Symbols Outlined font (already loaded by the Foundation sub-project's `index.html` change). No new dependencies.

## Global Constraints

- Zero logic/prop/behavior change except where explicitly noted (the `DummyQuest.icon`/`DUMMY_PROFILE.titleBadge` fields change shape from an emoji-embedded string to a `{ icon, text }`-style structure, since Material Symbols icons need to render separately from their label text — this is a data-shape change, not a behavior change, and is scoped to Task 3/4 below).
- `src/data/locations.ts`'s 10 locations already match the mockup's 10 tiles by name and order — no data changes there.
- `LocationIcon.tsx` is NOT modified in this plan — it's still used by `CollectionPage` (a not-yet-ported page). A new, separate `HomeLocationTile.tsx` is added for Home's richer presentation instead of overloading `LocationIcon`.
- The record-options sheet's flow (4 options → link-analysis sub-flow → `/new` navigation) is unchanged — only its visual presentation (icons, colors) changes.
- `tsc --noEmit` clean and all 50 existing tests passing, unchanged, after every task.
- Material icon names used in this plan (`cottage`, `leaderboard`, `local_fire_department`, `groups_2`, `menu_book`, `token`, `notifications`, `person`, `star`, `auto_awesome`, `expand_more`, `tune`, `water_drop`, `soup_kitchen`, `redeem`, `check_circle`, `stars`, `search`, `qr_code_scanner`, `add`, `photo_camera`, `image`, `link`, `edit_note`, `bathtub`, `local_laundry_service`, `checkroom`, `brush`, `bed`, `weekend`, `roller_skating`, `medication`, `directions_car`) are copied verbatim from the Stitch `code.html` export — don't substitute similar-sounding names.

## File Structure

```
src/
  data/
    materialIcons.tsx     # Create: Icon component + LOCATION_MATERIAL_ICON map
    homeDummy.ts           # Modify: DUMMY_PROFILE.titleBadge and DummyQuest.icon become {icon, text}/icon-name shaped
  components/
    HomeLocationTile.tsx    # Create: 2-column rich location tile (icon chip + donut ring + name + count)
    AppLayout.tsx            # Modify: Material icons + new color tokens on header/sidebar/bottom nav
    HomeProfileCard.tsx      # Modify: rebuilt to match the mockup's profile card
    QuestCarousel.tsx        # Modify: rebuilt to match the mockup's quest card
  pages/
    HomePage.tsx              # Modify: search bar, location grid (uses HomeLocationTile), FAB, record sheet icons
```

---

### Task 1: Icon helper + per-location icon map

**Files:**
- Create: `src/data/materialIcons.tsx`

**Interfaces:**
- Produces: `Icon({ name, className }: { name: string; className?: string })` (a component, not a plain function — renders a `<span className="material-symbols-outlined ...">`), `LOCATION_MATERIAL_ICON: Record<string, string>`.

- [ ] **Step 1: Create `src/data/materialIcons.tsx`**

```tsx
export function Icon({ name, className }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className ?? ''}`}>{name}</span>
}

export const LOCATION_MATERIAL_ICON: Record<string, string> = {
  bathroom: 'bathtub',
  kitchen: 'soup_kitchen',
  laundry: 'local_laundry_service',
  closet: 'checkroom',
  vanity: 'brush',
  bedroom: 'bed',
  livingroom: 'weekend',
  entrance: 'roller_skating',
  medicine: 'medication',
  car: 'directions_car',
}
```

(File extension is `.tsx`, not `.ts`, because `Icon` returns JSX — matches this project's convention of `.tsx` for any file containing JSX, e.g. `src/components/*.tsx`.)

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/materialIcons.tsx
git commit -m "feat: add Material Symbols icon helper and per-location icon map"
```

---

### Task 2: `HomeLocationTile` component

**Files:**
- Create: `src/components/HomeLocationTile.tsx`

**Interfaces:**
- Consumes: `Icon`, `LOCATION_MATERIAL_ICON` (Task 1), `LOCATION_COLOR_HEX` (existing, `src/data/locationColors.ts`).
- Produces: `HomeLocationTile({ location, percent, count, onClick }: { location: Location; percent: number; count: number; onClick: () => void })`.

- [ ] **Step 1: Create `src/components/HomeLocationTile.tsx`**

```tsx
import type { Location } from '../types'
import { LOCATION_COLOR_HEX } from '../data/locationColors'
import { Icon, LOCATION_MATERIAL_ICON } from '../data/materialIcons'

export function HomeLocationTile({
  location,
  percent,
  count,
  onClick,
}: {
  location: Location
  percent: number
  count: number
  onClick: () => void
}) {
  const color = LOCATION_COLOR_HEX[location.colorToken] ?? '#3F6459'
  const icon = LOCATION_MATERIAL_ICON[location.colorToken] ?? 'inventory_2'
  const clamped = Math.min(100, Math.max(0, percent))
  const circumference = 2 * Math.PI * 15.9155

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[126px] flex-col justify-between rounded-xl bg-surface-container-lowest p-space-md text-left shadow-[0_3px_0px_#eae0de] transition-shadow hover:shadow-[0_4px_0px_#eae0de]"
    >
      <div className="flex items-start justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}33`, color }}
        >
          <Icon name={icon} className="text-[20px]" />
        </div>
        <div className="relative flex h-8 w-8 items-center justify-center">
          <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#eae0de"
              strokeWidth="4"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={color}
              strokeDasharray={`${clamped}, 100`}
              strokeLinecap="round"
              strokeWidth="4"
            />
          </svg>
          <span className="absolute text-label-sm font-extrabold text-on-surface">{clamped}%</span>
        </div>
      </div>
      <div className="mt-2 flex flex-col">
        <span className="truncate font-headline-md text-headline-md font-bold text-on-surface">
          {location.name}
        </span>
        <span className="flex items-center gap-1 text-body-sm text-on-surface-variant">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          {count}개 등록
        </span>
      </div>
    </button>
  )
}
```

Note: the icon-chip background uses the location's existing hex color at a fixed low alpha (`${color}33`, i.e. ~20% opacity) rather than trying to replicate each of the mockup's differently-named token shades per tile (`secondary-container/50`, `tertiary-fixed/40`, etc.) — this is a deliberate simplification so the component stays data-driven for any location, not hardcoded per the 10 specific tiles in the mockup, while keeping the same "tinted icon chip + colored progress ring" visual pattern. `circumference` is computed but not directly used in the JSX below it (the mockup hardcodes `stroke-dasharray="12, 100"` etc. as a percentage-out-of-100 shorthand that SVG's `stroke-dasharray` accepts directly) — remove the unused `circumference` local if your editor/linter flags it, or keep it as documentation of the ring math; either is fine, it doesn't affect the rendered output since `strokeDasharray={`${clamped}, 100`}` is a percentage on a normalized 100-unit path length, matching the mockup's own approach exactly.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/HomeLocationTile.tsx
git commit -m "feat: add HomeLocationTile (icon chip + donut ring + name + count)"
```

---

### Task 3: `AppLayout` — Material icons and new tokens

**Files:**
- Modify: `src/components/AppLayout.tsx`

**Interfaces:**
- Consumes: `Icon` (Task 1).

- [ ] **Step 1: Replace the whole file**

Find the entire current file:

```tsx
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications } from '../state/selectors'
import { useSeenNotifications } from '../hooks/useSeenNotifications'

const TABS = [
  { to: '/', label: '홈', icon: '🏠' },
  { to: '/ranking', label: '랭킹', icon: '🏆' },
  { to: '/purchase', label: '구매', icon: '🛒' },
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
    <div className="flex h-dvh bg-paper text-ink md:mx-auto md:max-w-[820px]">
      <nav className="hidden w-56 flex-col gap-1 border-r-2 border-ink bg-card p-4 md:flex">
        <span className="mb-4 font-heading text-lg">REMEMBUY</span>
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm ${
                isActive
                  ? 'border-ink bg-stamp text-white shadow-chunky'
                  : 'border-transparent text-ink/70'
              }`
            }
          >
            <span>{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b-2 border-ink bg-card px-4 py-3">
          <span className="font-heading text-lg md:hidden">REMEMBUY</span>
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="relative ml-auto text-xl"
            aria-label="알림"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-stamp" />
            )}
          </button>
        </header>
        <main className="flex-1 overflow-y-auto pb-20 md:pb-4">
          <div className="mx-auto w-full max-w-3xl">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t-2 border-ink bg-card md:hidden">
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

Replace it with:

```tsx
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications } from '../state/selectors'
import { useSeenNotifications } from '../hooks/useSeenNotifications'
import { Icon } from '../data/materialIcons'

const TABS = [
  { to: '/', label: '홈', icon: 'cottage' },
  { to: '/ranking', label: '랭킹', icon: 'leaderboard' },
  { to: '/purchase', label: '구매', icon: 'local_fire_department' },
  { to: '/family', label: '가족', icon: 'groups_2' },
  { to: '/collection', label: '컬렉션', icon: 'menu_book' },
]

export function AppLayout() {
  const navigate = useNavigate()
  const { items } = useLocker()
  const { seenIds } = useSeenNotifications()
  const unreadCount = getUpcomingNotifications(items, 7).filter(
    (item) => !seenIds.includes(item.id)
  ).length

  return (
    <div className="flex h-dvh bg-surface text-on-surface md:mx-auto md:max-w-[820px]">
      <nav className="hidden w-56 flex-col gap-1 border-r-2 border-ink bg-surface-container-lowest p-4 md:flex">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container text-on-primary-container shadow-[0_3px_0px_#8b1901]">
            <Icon name="token" className="text-[20px]" />
          </div>
          <span className="font-heading text-lg text-primary">REMEMBUY</span>
        </div>
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm ${
                isActive
                  ? 'border-ink bg-primary text-on-primary shadow-[0_3px_0px_#8b1901]'
                  : 'border-transparent text-on-surface-variant'
              }`
            }
          >
            <Icon name={tab.icon} className="text-[20px]" />
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b-2 border-ink bg-surface-container-lowest px-4 py-3">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container text-on-primary-container shadow-[0_3px_0px_#8b1901]">
              <Icon name="token" className="text-[20px]" />
            </div>
            <span className="font-heading text-lg text-primary">REMEMBUY</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="relative ml-auto text-on-surface hover:text-primary"
            aria-label="알림"
          >
            <Icon name="notifications" className="text-[22px]" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-surface-container-lowest" />
            )}
          </button>
        </header>
        <main className="flex-1 overflow-y-auto pb-20 md:pb-4">
          <div className="mx-auto w-full max-w-3xl">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t-2 border-ink bg-surface-container-lowest md:hidden">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-xs ${
                isActive ? 'text-primary font-bold' : 'text-on-surface-variant'
              }`
            }
          >
            <Icon name={tab.icon} className="text-[22px]" />
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
```

Note: the outer frame's background moves from `bg-paper` to `bg-surface` and the header/sidebar/bottom-nav bars move from `bg-card` to `bg-surface-container-lowest` — this is a deliberate, app-wide background shift (both are warm off-whites in the same family, `#E9DFC3` → `#fff8f6`), accepted as the first visible step toward the new palette everywhere, since `AppLayout` wraps every page including not-yet-ported ones. Not-yet-ported pages' own `bg-card`/`bg-paper` usage on their internal cards is untouched — only the shared shell's chrome changes here.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 3: Run the test suite**

Run: `npx vitest run`
Expected: all 50 tests pass unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/components/AppLayout.tsx
git commit -m "feat: port AppLayout shell to Material Symbols icons and Stitch color tokens"
```

---

### Task 4: `homeDummy.ts` icon-shape change + `HomeProfileCard` + `QuestCarousel` rebuild

**Files:**
- Modify: `src/data/homeDummy.ts`
- Modify: `src/components/HomeProfileCard.tsx`
- Modify: `src/components/QuestCarousel.tsx`

**Interfaces:**
- Consumes: `Icon` (Task 1).
- Produces: `DUMMY_PROFILE.titleBadge` becomes `{ icon: string; text: string }` (was a single emoji-prefixed string); `DummyQuest.icon` becomes a Material icon name string (was an emoji string) — same field name, different value convention, still a `string`.

- [ ] **Step 1: Update `src/data/homeDummy.ts`**

Find:

```ts
export const DUMMY_PROFILE = {
  name: '지음님',
  titleBadge: '🧴 욕실마스터',
}
```

Replace with:

```ts
export const DUMMY_PROFILE = {
  name: '지음님',
  titleBadge: { icon: 'auto_awesome', text: '욕실마스터' },
}
```

Find:

```ts
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

Replace with:

```ts
export const DUMMY_QUESTS: DummyQuest[] = [
  {
    id: 'quest-bathroom-essentials',
    icon: 'water_drop',
    title: '욕실 필수템 채우기',
    subtitle: '샴푸・바디워시・치약',
    progress: { current: 3, total: 3 },
    rewardPoints: 30,
  },
  {
    id: 'quest-kitchen-restock',
    icon: 'soup_kitchen',
    title: '주방 소모품 채우기',
    subtitle: '세제・수세미・키친타월',
    progress: { current: 1, total: 3 },
    rewardPoints: 20,
  },
]
```

(No change to the `DummyQuest` type declaration itself — `icon: string` already accommodates either an emoji or a Material icon name; only the stored values change.)

- [ ] **Step 2: Replace `src/components/HomeProfileCard.tsx`**

Find the entire current file:

```tsx
import { Badge } from './Badge'
import { DUMMY_PROFILE, DUMMY_STATS } from '../data/homeDummy'

export function HomeProfileCard({ itemCount }: { itemCount: number }) {
  return (
    <div className="chunky-card space-y-3 p-4">
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

Replace it with:

```tsx
import { DUMMY_PROFILE, DUMMY_STATS } from '../data/homeDummy'
import { Icon } from '../data/materialIcons'

export function HomeProfileCard({ itemCount }: { itemCount: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-space-md shadow-[0_4px_0px_#eae0de]">
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-primary-fixed/20 blur-2xl" />
      <div className="relative z-10 mb-space-md flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-on-secondary shadow-[0_2px_0px_#304c46]">
              나
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-tertiary-fixed text-on-tertiary-fixed shadow-sm">
              <Icon name="star" className="text-[11px]" />
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-headline-md text-headline-md text-on-surface">
                {DUMMY_PROFILE.name}
              </span>
              <button
                type="button"
                aria-label="칭호 변경"
                className="flex items-center gap-0.5 rounded-full bg-secondary-container/60 px-2 py-0.5 transition-colors hover:bg-secondary-container"
              >
                <span className="flex items-center gap-0.5 font-label-sm text-label-sm font-extrabold text-secondary">
                  <Icon name="auto_awesome" className="text-[13px] text-tertiary" />
                  {DUMMY_PROFILE.titleBadge.text}
                </span>
                <Icon name="expand_more" className="text-[14px] text-secondary" />
              </button>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              LV.4 꼼꼼한 살림 탐험가
            </span>
          </div>
        </div>
        <button
          type="button"
          aria-label="프로필 설정"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant transition-colors hover:text-on-surface active:scale-95"
        >
          <Icon name="tune" className="text-[18px]" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1 rounded-lg bg-surface-container-low p-space-sm pt-space-sm">
        <div className="flex flex-col items-center text-center">
          <span className="font-stat-counter text-body-lg font-extrabold text-primary">
            {itemCount}
            <span className="ml-0.5 font-label-sm text-label-sm font-bold">개</span>
          </span>
          <span className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">기록 상품</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="font-stat-counter text-body-lg font-extrabold text-secondary">
            {(DUMMY_STATS.totalSaved / 10000).toFixed(1)}
            <span className="ml-0.5 font-label-sm text-label-sm font-bold">만</span>
          </span>
          <span className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">누적 절약</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-0.5 text-tertiary">
            <Icon name="monetization_on" className="text-[14px]" />
            <span className="font-stat-counter text-body-lg font-extrabold">{DUMMY_STATS.points}</span>
          </div>
          <span className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">포인트</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="font-stat-counter text-body-lg font-extrabold text-on-surface">
            {DUMMY_STATS.titleProgress.current}
            <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">
              /{DUMMY_STATS.titleProgress.total}
            </span>
          </span>
          <span className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">칭호 도감</span>
        </div>
      </div>
    </div>
  )
}
```

Note: `Badge` is no longer imported/used by this file (the title badge is now a bespoke pill matching the mockup, not the generic rotated-stamp `Badge`) — this is fine, `Badge` is still used elsewhere (`RankingPage.tsx`). `누적 절약` now shows `3.2만` (computed as `totalSaved / 10000`, one decimal) instead of the previous `₩32,000`, matching the mockup's compact "만원" notation exactly.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 4: Replace `src/components/QuestCarousel.tsx`**

Find the entire current file:

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
            className="chunky-card w-full flex-shrink-0 snap-center p-4"
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
                className="rounded-full border-2 border-ink bg-stamp px-4 py-1.5 text-sm text-white disabled:opacity-40"
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

Replace it with:

```tsx
import { useRef, useState } from 'react'
import type { DummyQuest } from '../data/homeDummy'
import { Icon } from '../data/materialIcons'

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
        {quests.map((quest) => {
          const isComplete = quest.progress.current >= quest.progress.total
          const percent = Math.min(100, (quest.progress.current / quest.progress.total) * 100)
          return (
            <div
              key={quest.id}
              className="relative w-full flex-shrink-0 snap-center overflow-hidden rounded-xl bg-surface-container-lowest p-space-md shadow-[0_4px_0px_#eae0de]"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-tertiary-fixed/30 blur-xl" />
              <div className="flex items-start justify-between gap-space-sm">
                <div className="flex items-start gap-space-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-secondary shadow-[0_2px_0px_#aecdc4]">
                    <Icon name={quest.icon} className="text-[24px]" />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-headline-md text-headline-md font-bold text-on-surface">
                        {quest.title}
                      </span>
                      {isComplete && (
                        <span className="rounded bg-secondary/10 px-1.5 py-0.5 font-label-sm text-label-sm font-bold text-secondary">
                          도감 완성!
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate font-body-sm text-body-sm text-on-surface-variant">
                      {quest.subtitle}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-tertiary-fixed px-2 py-1 font-stat-counter text-body-sm text-on-tertiary-fixed shadow-sm">
                  <Icon name="stars" className="text-[14px]" />
                  +{quest.rewardPoints}P
                </div>
              </div>
              <div className="my-0.5 flex flex-col gap-1">
                <div className="h-3 w-full overflow-hidden rounded-full bg-surface-container p-0.5 shadow-inner">
                  <div
                    className="relative h-full rounded-full bg-gradient-to-r from-secondary to-primary-container shadow-sm transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/25" />
                  </div>
                </div>
                <div className="flex items-center justify-between px-0.5 font-label-sm text-label-sm text-on-surface-variant">
                  <span>달성 현황: {quest.progress.current}종 수집 완료</span>
                  <span className="font-bold text-primary">
                    {quest.progress.current} / {quest.progress.total} 달성
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1">
                  {quests.map((q, i) => (
                    <span
                      key={q.id}
                      className={
                        i === activeIndex
                          ? 'h-1.5 w-4 rounded-full bg-primary'
                          : 'h-1.5 w-1.5 rounded-full bg-surface-variant'
                      }
                    />
                  ))}
                </div>
                <button
                  type="button"
                  disabled={!isComplete}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-space-lg py-2 font-label-lg text-label-lg text-on-primary shadow-[0_3px_0px_#8b1901] transition-all hover:bg-primary-container active:translate-y-0.5 active:shadow-[0_1px_0px_#8b1901] disabled:opacity-40 disabled:active:translate-y-0 disabled:active:shadow-[0_3px_0px_#8b1901]"
                >
                  <Icon name="redeem" className="text-[18px]" />
                  보상받기
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

Note: the dot-pagination row moved INSIDE each card (matching the mockup's "Claim Action & Slide Navigation Indicator" row, which sits inside the card next to the claim button) instead of being a separate row below the scroll container — this means the previous `{quests.length > 1 && (...)}` wrapper is gone and each card renders its own full set of dots (all cards render the same dots reflecting the shared `activeIndex`, exactly like the mockup, which shows the dots once per visible card). The claim button is disabled (and visually dimmed via `disabled:opacity-40`) when the quest isn't complete, replacing the previous behavior which was already disabled-when-incomplete — same logic, restyled. Clicking the enabled claim button is still a no-op (no `onClick`) — this mockup's own vanilla-JS "swap label to 지급 완료" behavior on click is NOT ported, since this is a static visual mockup with dummy data, not a real claim flow (consistent with this component's existing no-op button).

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 6: Run the test suite**

Run: `npx vitest run`
Expected: all 50 tests pass unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/data/homeDummy.ts src/components/HomeProfileCard.tsx src/components/QuestCarousel.tsx
git commit -m "feat: port HomeProfileCard and QuestCarousel to Stitch design"
```

---

### Task 5: `HomePage` — search bar, location grid, FAB, record sheet

**Files:**
- Modify: `src/pages/HomePage.tsx`

**Interfaces:**
- Consumes: `HomeLocationTile` (Task 2), `Icon` (Task 1).

- [ ] **Step 1: Add imports**

Find:

```tsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getLocationCompletion } from '../state/selectors'
import { LocationIcon } from '../components/LocationIcon'
import { ItemCard } from '../components/ItemCard'
import { HomeProfileCard } from '../components/HomeProfileCard'
import { QuestCarousel } from '../components/QuestCarousel'
import { DUMMY_QUESTS } from '../data/homeDummy'
```

Replace with:

```tsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getLocationCompletion } from '../state/selectors'
import { ItemCard } from '../components/ItemCard'
import { HomeProfileCard } from '../components/HomeProfileCard'
import { QuestCarousel } from '../components/QuestCarousel'
import { HomeLocationTile } from '../components/HomeLocationTile'
import { Icon } from '../data/materialIcons'
import { DUMMY_QUESTS } from '../data/homeDummy'
```

(`LocationIcon` import is removed — this page no longer uses it, replaced by `HomeLocationTile`. `LocationIcon.tsx` itself is untouched and still imported by `CollectionPage.tsx`.)

- [ ] **Step 2: Restyle both search inputs**

Find (appears twice — once in the `searchResults !== null` branch, once in the main return):

```tsx
        <input
          type="search"
          placeholder="상품 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="chunky-input w-full bg-card p-2"
        />
```

Replace BOTH occurrences with:

```tsx
        <div className="flex items-center gap-2 rounded-xl bg-surface-container-lowest p-1.5 shadow-[0_3px_0px_#eae0de]">
          <div className="pointer-events-none flex items-center pl-2.5 text-on-surface-variant">
            <Icon name="search" className="text-[20px]" />
          </div>
          <input
            type="search"
            placeholder="상품 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 w-full bg-transparent py-1.5 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none"
          />
        </div>
```

Note: only the MAIN return's search bar (not the search-results branch's) needs the trailing barcode-scan button per the mockup — but for visual consistency across both views of the same search affordance, add the scan button to both. After the `<input>` (still inside the same wrapping `<div>`), add:

```tsx
          <button
            type="button"
            aria-label="바코드 스캔"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface transition-colors hover:bg-surface-variant active:scale-95"
          >
            <Icon name="qr_code_scanner" className="text-[20px]" />
          </button>
```

so each full replacement block is:

```tsx
        <div className="flex items-center gap-2 rounded-xl bg-surface-container-lowest p-1.5 shadow-[0_3px_0px_#eae0de]">
          <div className="pointer-events-none flex items-center pl-2.5 text-on-surface-variant">
            <Icon name="search" className="text-[20px]" />
          </div>
          <input
            type="search"
            placeholder="상품 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 w-full bg-transparent py-1.5 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none"
          />
          <button
            type="button"
            aria-label="바코드 스캔"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface transition-colors hover:bg-surface-variant active:scale-95"
          >
            <Icon name="qr_code_scanner" className="text-[20px]" />
          </button>
        </div>
```

The barcode-scan button has no `onClick` — visual-only, same "not-yet-built input method" pattern as the record sheet's camera/photo options.

- [ ] **Step 3: Replace the location grid**

Find:

```tsx
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
```

Replace with:

```tsx
      {!selectedLocationId && (
        <div className="grid grid-cols-2 gap-space-sm">
          {locations.map((location) => (
            <HomeLocationTile
              key={location.id}
              location={location}
              percent={getLocationCompletion(items, location.id, categories)}
              count={categories.filter((c) => c.locationId === location.id).length}
              onClick={() => setSelectedLocationId(location.id)}
            />
          ))}
        </div>
      )}
```

Note: `count` here is the number of CATEGORIES registered under that location (matching the mockup's "3/25개 등록" — read as "3 categories out of 25 possible slots," i.e. this app's closest existing equivalent is category count per location) rather than item count, since that's what's readily available per-location without a new selector. This is a reasonable interpretation of the mockup's ambiguous "등록" count for this app's actual data shape.

- [ ] **Step 4: Restyle the floating action button**

Find:

```tsx
      <button
        type="button"
        onClick={() => setShowRecordOptions(true)}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-stamp text-2xl text-white shadow-chunky active:translate-x-1 active:translate-y-1 active:shadow-none md:bottom-8"
        aria-label="새로 기록하기"
      >
        +
      </button>
```

Replace with:

```tsx
      <button
        type="button"
        onClick={() => setShowRecordOptions(true)}
        className="fixed bottom-24 right-4 z-30 flex items-center gap-2 rounded-full bg-primary py-3 pl-3 pr-4 text-on-primary shadow-[0_6px_16px_rgba(170,48,21,0.35),0_3px_0px_#8b1901] transition-all hover:bg-primary-container active:translate-y-1 active:shadow-[0_2px_0px_#8b1901] md:bottom-8"
        aria-label="새로 기록하기"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
          <Icon name="add" className="text-[18px]" />
        </span>
        <span className="font-label-lg text-label-lg font-bold">물품 등록</span>
      </button>
```

- [ ] **Step 5: Restyle the record-options sheet**

Find:

```tsx
      {showRecordOptions && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={closeRecordSheet}
        >
          <div
            className="w-full max-w-md space-y-2 rounded-t-2xl bg-card p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            {!showLinkInput ? (
              <>
                <p className="pb-1 text-center text-sm text-ink/50">어떻게 기록할까요?</p>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="chunky-btn flex w-full items-center gap-3 rounded-xl p-3 text-left"
                >
                  <span className="text-xl">📷</span>
                  <span>카메라로 촬영</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="chunky-btn flex w-full items-center gap-3 rounded-xl p-3 text-left"
                >
                  <span className="text-xl">🖼️</span>
                  <span>사진 선택</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLinkInput(true)}
                  className="chunky-btn flex w-full items-center gap-3 rounded-xl p-3 text-left"
                >
                  <span className="text-xl">🔗</span>
                  <span>링크로 가져오기</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="chunky-btn flex w-full items-center gap-3 rounded-xl p-3 text-left"
                >
                  <span className="text-xl">✏️</span>
                  <span>직접 입력</span>
                </button>
                <button
                  type="button"
                  onClick={closeRecordSheet}
                  className="w-full pt-2 text-center text-sm text-ink/50"
                >
                  취소
                </button>
              </>
            ) : (
```

Replace with:

```tsx
      {showRecordOptions && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={closeRecordSheet}
        >
          <div
            className="w-full max-w-md space-y-2 rounded-t-2xl bg-surface-container-lowest p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            {!showLinkInput ? (
              <>
                <p className="pb-1 text-center font-body-sm text-body-sm text-on-surface-variant">
                  어떻게 기록할까요?
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-ink p-3 text-left text-on-surface"
                >
                  <Icon name="photo_camera" className="text-[20px] text-primary" />
                  <span>카메라로 촬영</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-ink p-3 text-left text-on-surface"
                >
                  <Icon name="image" className="text-[20px] text-primary" />
                  <span>사진 선택</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLinkInput(true)}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-ink p-3 text-left text-on-surface"
                >
                  <Icon name="link" className="text-[20px] text-primary" />
                  <span>링크로 가져오기</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-ink p-3 text-left text-on-surface"
                >
                  <Icon name="edit_note" className="text-[20px] text-primary" />
                  <span>직접 입력</span>
                </button>
                <button
                  type="button"
                  onClick={closeRecordSheet}
                  className="w-full pt-2 text-center font-body-sm text-body-sm text-on-surface-variant"
                >
                  취소
                </button>
              </>
            ) : (
```

Leave the `showLinkInput` branch (URL input, 분석하기/직접 입력하기/뒤로 buttons) exactly as-is for this task — it's not part of the Home mockup's own flow and stays visually consistent with the `chunky-*` classes for now; restyling it isn't required to satisfy this sub-project's scope (it's a secondary sub-flow, not shown in `remembuy_2`'s mockup at all).

- [ ] **Step 6: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 7: Run the test suite**

Run: `npx vitest run`
Expected: all 50 tests pass unchanged.

- [ ] **Step 8: Manual verification trace**

With `npm run dev` running:
- Open the home screen's top-level view, compare side-by-side against `remembuy_2/screen.png` — header, profile card, quest carousel, search bar, and 2-column location grid should closely match.
- Click a location tile — confirm it still drills into that location's categories exactly as before (only the tile's appearance changed).
- Type in the search box — confirm results still show and the restyled search bar still works.
- Click the "물품 등록" FAB — confirm the sheet opens with the 4 restyled options (each now with a colored Material icon instead of an emoji), and each option still navigates/behaves exactly as before ("링크로 가져오기" still opens the URL-input sub-view, others still go to `/new`).
- Confirm the quest carousel's swipe/scroll still updates the active dot, and the claim button is disabled-looking on the second (incomplete) quest, enabled-looking on the first (complete) quest.

- [ ] **Step 9: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: port HomePage search bar, location grid, FAB, and record sheet to Stitch design"
```

---

### Task 6: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full frontend automated test suite**

Run: `npx vitest run`
Expected: all 50 tests pass, unchanged count (this plan added zero test files).

- [ ] **Step 2: Run the backend test suite**

Run: `npm run test:server`
Expected: all 8 tests pass (unaffected — this plan touches no `server/` files).

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit`
Expected: zero errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual golden-path walkthrough**

With `npm run dev` running, at both a mobile width and a tablet+ width:
- Compare the Home screen's top-level view against `stitch/.../remembuy_2/screen.png` for overall visual fidelity (colors, icons, card shapes, shadows).
- Confirm every other tab (랭킹/구매/가족/컬렉션) still renders with its EXISTING `chunky-*` styling, completely unaffected by this plan — this sub-project only touches Home and the shared `AppLayout` shell's chrome (header/nav), not any other page's own content.
- Confirm `CollectionPage` (which still uses `LocationIcon`, untouched by this plan) renders exactly as before.
- Re-verify the full drill-down flow (location → category → product list → item detail) still works end to end from the restyled Home screen.

- [ ] **Step 5: Commit final state (only if fixes were needed)**

If Steps 1-4 required any fixes, commit them now with a descriptive message. If everything passed as-is, no commit is needed for this task.
