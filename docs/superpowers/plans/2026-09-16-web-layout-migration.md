# Web Layout Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the iPhone-mockup-frame styling added earlier this session and replace it with a real responsive web layout — a left sidebar nav at desktop widths, a wide content column, and the existing bottom tab bar unchanged at mobile widths.

**Architecture:** `AppLayout` becomes a `flex` row shell (sidebar + content column) instead of a single phone-shaped box; `index.css`'s `body` rule drops the dark centered backdrop; `HomePage`'s floating record button/sheet revert from `absolute` to `fixed` now that there's no mockup frame to stay confined inside.

**Tech Stack:** React + TypeScript, Tailwind CSS (existing project stack, no new dependencies).

## Global Constraints

- This migration touches only the app shell and one positioning fix — no page content, business logic, or data changes.
- At mobile widths (below Tailwind's `md:` breakpoint, 768px), the layout must be pixel-identical to today's experience: header with brand name, bottom 5-tab bar, floating record button in its usual spot. The only allowed behavioral difference is the button/sheet's positioning mode changing from `absolute` to `fixed` — behaviorally identical when the containing block already fills the viewport, which it does at mobile widths.
- At desktop widths (`md:` and above): no phone bezel/notch/dark backdrop anywhere; a left sidebar with all 5 nav items (icon + label) and correct active-state highlighting (`bg-stamp text-white` on the active `NavLink`); the bottom tab bar is hidden (`md:hidden`); main content sits in a `max-w-3xl` centered column, not still capped at 448px and not stretched edge-to-edge.
- No automated tests for `AppLayout`/`HomePage` — verified via `npx tsc --noEmit` + manual trace, per this branch's established precedent (neither file has a test today, and none of the 43 existing tests render either component).
- Per-page grid density (more columns in location/category tiles on wide screens) is explicitly out of scope for this plan.

## File Structure

```
src/
  components/
    AppLayout.tsx   # Modify: remove mockup-frame styling, add responsive sidebar/content shell
  pages/
    HomePage.tsx    # Modify: floating button + sheet back to `fixed`, remove now-stale comments
  index.css         # Modify: body rule drops dark centered-backdrop styling
```

---

### Task 1: Responsive `AppLayout` shell

**Files:**
- Modify: `src/components/AppLayout.tsx`
- Modify: `src/index.css`

**Interfaces:**
- No new exports or props — `AppLayout` remains a zero-prop component rendered once by `App.tsx`'s router (`<Route element={<AppLayout />}>`), unchanged call site.

- [ ] **Step 1: Replace `src/components/AppLayout.tsx`'s content**

Current content (for reference — this is what you're replacing):

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
    // HomePage's floating record button and options sheet position via `absolute` against this frame — keep it the nearest positioned ancestor
    <div
      className="relative mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-paper shadow-2xl
        sm:my-8 sm:h-[844px] sm:max-h-[85vh] sm:w-[390px] sm:max-w-none sm:rounded-[3rem] sm:border-[10px] sm:border-ink"
    >
      <div className="absolute left-1/2 top-2 z-20 hidden h-7 w-32 -translate-x-1/2 rounded-full bg-ink sm:block" />

      <header className="flex items-center justify-between border-b border-ink/10 bg-card px-4 py-3 sm:pt-6">
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
      <nav className="absolute inset-x-0 bottom-0 grid grid-cols-5 border-t border-ink/10 bg-card">
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

      <div className="absolute bottom-1 left-1/2 z-20 hidden h-1 w-32 -translate-x-1/2 rounded-full bg-ink/70 sm:block" />
    </div>
  )
}
```

Replace the entire file with:

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
    <div className="flex min-h-screen bg-paper text-ink">
      <nav className="hidden w-56 flex-col gap-1 border-r border-ink/10 bg-card p-4 md:flex">
        <span className="mb-4 font-heading text-lg">REMEMBUY</span>
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                isActive ? 'bg-stamp text-white' : 'text-ink/70'
              }`
            }
          >
            <span>{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-ink/10 bg-card px-4 py-3">
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

      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t border-ink/10 bg-card md:hidden">
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

Note: the `TABS` array, `unreadCount` logic, and the notification-bell button's markup are unchanged from the current file — only the surrounding structural containers change.

- [ ] **Step 2: Replace `src/index.css`'s `body` rule**

Current:

```css
body {
  @apply flex min-h-[100dvh] items-center justify-center bg-ink text-ink font-body;
}
```

Replace with:

```css
body {
  @apply bg-paper text-ink font-body;
}
```

Leave the rest of `src/index.css` (the `@tailwind` directives and the `h1, h2, h3` rule) unchanged.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 4: Manual verification trace**

With `npm run dev` running, open the app in a browser and check both widths:
- **At a narrow width (e.g. resize to ~390px, or use browser device emulation):** header shows "REMEMBUY" + bell icon, no sidebar, bottom 5-tab bar visible and functional (clicking each tab navigates and highlights correctly), no phone bezel/notch/dark backdrop (there never was one at this width in the previous version either, but confirm the removal didn't add one).
- **At a wide width (e.g. resize to ~1280px):** left sidebar visible with "REMEMBUY" at top and all 5 nav items (icon + label) below it, clicking each highlights it with a red (`bg-stamp`) background; header no longer shows "REMEMBUY" (sidebar already shows it) but still shows the bell icon aligned to the right; no bottom tab bar; page content sits in a centered column that is clearly wider than the old 448px mobile width but not stretched to the full browser width; no dark background, no rounded bezel, no notch, no home-indicator bar anywhere.
- Confirm the notification bell's unread-dot indicator still appears/disappears correctly (unchanged logic, just re-verify visually since the surrounding markup moved).

- [ ] **Step 5: Commit**

```bash
git add src/components/AppLayout.tsx src/index.css
git commit -m "feat: replace iPhone-mockup-frame shell with responsive sidebar layout"
```

---

### Task 2: Revert `HomePage`'s floating button/sheet to `fixed`

**Files:**
- Modify: `src/pages/HomePage.tsx`

**Interfaces:**
- No new exports or props — internal JSX/className changes only.

- [ ] **Step 1: Update the floating "+" button**

Find this block (the comment line and the button's `className`):

```tsx
      {/* Positions via `absolute` against AppLayout's relative mockup-frame container — do not add relative/absolute/fixed to this component's root div or to AppLayout's <main> without checking this */}
      <button
        type="button"
        onClick={() => setShowRecordOptions(true)}
        className="absolute bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-stamp text-2xl text-white shadow-lg"
        aria-label="새로 기록하기"
      >
        +
      </button>
```

Replace it with (comment removed, `absolute` → `fixed`, add `md:bottom-8` since there's no mobile bottom tab bar to clear at desktop widths):

```tsx
      <button
        type="button"
        onClick={() => setShowRecordOptions(true)}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-stamp text-2xl text-white shadow-lg md:bottom-8"
        aria-label="새로 기록하기"
      >
        +
      </button>
```

(If the exact wording of the existing comment differs slightly from what's shown above, remove whatever single-line comment precedes the button and immediately follow the rest of this step — the important change is deleting that comment and changing `absolute` to `fixed` plus adding `md:bottom-8`.)

- [ ] **Step 2: Update the options-sheet backdrop**

Find:

```tsx
      {showRecordOptions && (
        <div
          className="absolute inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowRecordOptions(false)}
        >
```

Replace with:

```tsx
      {showRecordOptions && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowRecordOptions(false)}
        >
```

(Only `absolute` → `fixed` changes on this line; everything else in the sheet's markup is untouched.)

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 4: Manual verification trace**

With `npm run dev` running:
- At a narrow width: the "+" button still sits in the same visual spot (bottom-right, above the bottom tab bar) and clicking it still opens the same 4-option sheet from the bottom of the screen; clicking the backdrop or "취소" still closes it.
- At a wide width: the "+" button sits a bit closer to the bottom edge (per the new `md:bottom-8`) since there's no bottom tab bar to clear; clicking it opens the sheet anchored to the bottom of the browser window (not confined to any box); the sheet still closes the same way.

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "fix: revert home record button/sheet to fixed positioning (no more mockup frame to escape)"
```

---

### Task 3: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `npx vitest run`
Expected: all 43 existing tests still pass (this plan adds no new test files and touches no tested modules).

- [ ] **Step 2: Type-check and build**

Run: `npx tsc --noEmit`
Expected: zero errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual golden-path walkthrough**

With `npm run dev` running, in a browser:
- Resize from narrow to wide and back, confirming the layout switches cleanly at the `md:` breakpoint (768px) with no visual glitches, no leftover mockup-frame artifacts at any width, and no layout shift in page content beyond the intended width change.
- Click through all 5 nav destinations (홈/랭킹/공유/가족/컬렉션) at both a narrow and a wide width, confirming navigation and active-state highlighting work in both the bottom tab bar (mobile) and the sidebar (desktop).
- On the home screen, confirm the profile card / quest carousel (from the earlier home-gamification-mockup plan) still render correctly inside the new wider content column, and the floating record button/sheet still work as verified in Task 2.
- Confirm the notification bell still navigates to `/notifications` and its unread-dot still reflects real unread state.

- [ ] **Step 4: Commit final state (only if fixes were needed)**

If Steps 1-3 required any fixes, commit them now with a descriptive message. If everything passed as-is, no commit is needed for this task.
