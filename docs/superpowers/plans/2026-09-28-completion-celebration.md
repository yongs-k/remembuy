# Registration Completion Celebration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a brief dark, animated "등록 완료" celebration (badge bounce, confetti, points earned, dex-completion progress) after a successful item registration, tap-to-dismiss, before navigating home — instead of today's instant silent navigation.

**Architecture:** One new presentational component (`CompletionCelebration.tsx`, matching `AnalyzingOverlay`'s dark visual language, shipped earlier today), four new static Tailwind keyframe/animation utilities for the one-shot entrance effects (badge bounce, glow burst, points fade-in, confetti fall), a CSS-transition-driven (not keyframe-driven) progress bar for the dex-percentage since its start/end values are dynamic per-registration, one signature change to `GameContext.tsx`'s `claim` so callers can read the points actually awarded, and integration into `NewItemPage.tsx`'s submit flow.

**Tech Stack:** React, TypeScript, Tailwind CSS. No new dependency.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-28-completion-celebration-design.md`.
- `CompletionCelebration` dismisses on tap anywhere on the overlay — no auto-timeout, no separate close button.
- The points line only renders when `pointsAwarded > 0`. The dex-progress line only renders when `dexAfter > dexBefore`.
- Location icon: reuse the existing `LOCATION_MATERIAL_ICON` map (`src/data/materialIcons.tsx`), keyed by the location's `colorToken` (NOT its `id` — confirmed from this map's four existing call sites, e.g. `src/components/HomeLocationTile.tsx`), falling back to `'inventory_2'` when absent — the same pattern those four sites already use.
- `GameContext.tsx`'s `claim` changes from `Promise<void>` to `Promise<number>` (points awarded; `0` on an empty `slotIds` array or a failed claim, matching today's existing catch-and-warn behavior). `claim` has exactly one external caller (`NewItemPage.tsx`, confirmed via full-codebase search) plus one internal `void claim(ids)` reconciliation call in the same file that ignores the return value either way — both remain valid under the new signature with no other changes needed.
- **Lesson from earlier today's `AnalyzingOverlay` work:** after editing `tailwind.config.ts`, Vite's HMR page-reload does not always fully pick up brand-new keyframe/animation keys — a full dev-server restart may be required to see new `animate-*` utilities actually appear in the compiled CSS. Verify by grepping the served CSS for the new class names, not just by trusting a clean `tsc`/HMR log.
- `npx tsc --noEmit` clean and `npx vitest run` green (123 tests; no new test file — none of the three touched/created files have an existing test file, confirmed absent from `src/pages/*.test.tsx`, `src/components/*.test.tsx`, and there's no `GameContext.test.tsx`).
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## File Structure

```
tailwind.config.ts                        # Modify: add 4 more keyframes/animation utilities
src/components/CompletionCelebration.tsx  # Create
src/state/GameContext.tsx                 # Modify: claim returns Promise<number>
src/pages/NewItemPage.tsx                 # Modify: async handleSubmit, celebration state + render
```

---

### Task 1: Registration completion celebration

**Files:**
- Modify: `tailwind.config.ts`, `src/state/GameContext.tsx`, `src/pages/NewItemPage.tsx`
- Create: `src/components/CompletionCelebration.tsx`

**Interfaces:**
- Produces: `CompletionCelebration({ itemName, icon, pointsAwarded, dexBefore, dexAfter, locationName, onDismiss })`.
- Produces: `GameContext`'s `claim: (slotIds: string[]) => Promise<number>` (was `Promise<void>`).

No automated test — matches this codebase's precedent of not
unit-testing this class of page/animation component (none of the three
touched files have a test file today). Verified by `tsc` + a manual
trace (Step 6 below).

- [ ] **Step 1: Add four new animation utilities to `tailwind.config.ts`**

Find (the end of the `keyframes`/`animation` blocks added earlier today
for `AnalyzingOverlay`):

```ts
      keyframes: {
        'ring-glow': {
          '0%, 100%': { transform: 'scale(0.9)', opacity: '0.6' },
          '50%': { transform: 'scale(1.15)', opacity: '1' },
        },
        'icon-cycle': {
          '0%': { opacity: '0', transform: 'scale(0.6) rotate(-8deg)' },
          '8%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
          '22%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
          '30%': { opacity: '0', transform: 'scale(0.6) rotate(8deg)' },
          '100%': { opacity: '0' },
        },
        'text-cycle': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '6%': { opacity: '1', transform: 'translateY(0)' },
          '27%': { opacity: '1', transform: 'translateY(0)' },
          '33%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '0' },
        },
        'scan-sweep': {
          '0%': { top: '-10%' },
          '50%': { top: '100%' },
          '100%': { top: '-10%' },
        },
      },
      animation: {
        'ring-glow': 'ring-glow 1.8s ease-in-out infinite',
        'icon-cycle': 'icon-cycle 3.2s infinite',
        'text-cycle': 'text-cycle 4.8s infinite',
        'scan-sweep': 'scan-sweep 1.6s ease-in-out infinite',
      },
```

Replace with:

```ts
      keyframes: {
        'ring-glow': {
          '0%, 100%': { transform: 'scale(0.9)', opacity: '0.6' },
          '50%': { transform: 'scale(1.15)', opacity: '1' },
        },
        'icon-cycle': {
          '0%': { opacity: '0', transform: 'scale(0.6) rotate(-8deg)' },
          '8%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
          '22%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
          '30%': { opacity: '0', transform: 'scale(0.6) rotate(8deg)' },
          '100%': { opacity: '0' },
        },
        'text-cycle': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '6%': { opacity: '1', transform: 'translateY(0)' },
          '27%': { opacity: '1', transform: 'translateY(0)' },
          '33%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '0' },
        },
        'scan-sweep': {
          '0%': { top: '-10%' },
          '50%': { top: '100%' },
          '100%': { top: '-10%' },
        },
        'burst-pop': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '0.8' },
        },
        'badge-bounce': {
          '0%': { transform: 'scale(0) rotate(-20deg)' },
          '60%': { transform: 'scale(1.2) rotate(8deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)' },
        },
        'point-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'confetti-fall': {
          '0%': { opacity: '0', transform: 'translateY(-20px) rotate(0deg)' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(380px) rotate(360deg)' },
        },
      },
      animation: {
        'ring-glow': 'ring-glow 1.8s ease-in-out infinite',
        'icon-cycle': 'icon-cycle 3.2s infinite',
        'text-cycle': 'text-cycle 4.8s infinite',
        'scan-sweep': 'scan-sweep 1.6s ease-in-out infinite',
        'burst-pop': 'burst-pop 0.6s ease-out both',
        'badge-bounce': 'badge-bounce 0.7s cubic-bezier(0.34,1.56,0.64,1) both',
        'point-in': 'point-in 0.5s 0.4s ease-out both',
        'confetti-fall': 'confetti-fall 2.2s ease-in infinite',
      },
```

- [ ] **Step 2: Create `src/components/CompletionCelebration.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Icon } from '../data/materialIcons'

const CONFETTI = [
  { left: '20%', color: '#ffb95f', delay: '0s' },
  { left: '70%', color: '#cc482b', delay: '0.3s' },
  { left: '40%', color: '#48645d', delay: '0.6s' },
  { left: '85%', color: '#ffb95f', delay: '0.9s' },
]

export function CompletionCelebration({
  itemName,
  icon,
  pointsAwarded,
  dexBefore,
  dexAfter,
  locationName,
  onDismiss,
}: {
  itemName: string
  icon: string
  pointsAwarded: number
  dexBefore: number
  dexAfter: number
  locationName: string
  onDismiss: () => void
}) {
  const hasGain = dexAfter > dexBefore
  const [barGrown, setBarGrown] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setBarGrown(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="등록 완료"
      onClick={onDismiss}
      className="fixed inset-0 z-[60] cursor-pointer overflow-y-auto bg-[#1e1512] text-white"
    >
      <div className="relative mx-auto flex min-h-full w-full max-w-sm flex-col items-center justify-center gap-space-sm p-margin">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {CONFETTI.map((c) => (
            <span
              key={c.left}
              className="absolute top-0 h-3.5 w-2 animate-confetti-fall opacity-0"
              style={{ left: c.left, backgroundColor: c.color, animationDelay: c.delay }}
            />
          ))}
        </div>

        <div className="relative h-[180px] w-[180px] shrink-0">
          <div className="absolute inset-0 animate-burst-pop rounded-full bg-[radial-gradient(circle,rgba(255,185,95,0.35),transparent_65%)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-[72px] w-[72px] animate-badge-bounce items-center justify-center rounded-full bg-gradient-to-br from-primary-container to-tertiary-fixed-dim shadow-[0_0_30px_rgba(255,185,95,0.5)]">
              <Icon name={icon} className="text-[34px] text-white" />
            </div>
          </div>
        </div>

        <h2 className="text-headline-lg font-extrabold">도감 등록 완료!</h2>
        <p className="text-body-sm text-outline-variant">{itemName}</p>

        {pointsAwarded > 0 && (
          <p className="mt-1 animate-point-in bg-gradient-to-r from-tertiary-fixed-dim to-primary-container bg-clip-text text-headline-md font-extrabold text-transparent opacity-0">
            +{pointsAwarded}P 획득
          </p>
        )}

        {hasGain && (
          <div className="mt-2 w-full max-w-[200px] shrink-0">
            <div className="mb-1 flex justify-between text-label-sm text-outline-variant">
              <span>{locationName} 도감 수집률</span>
              <span>
                {dexBefore}% → {dexAfter}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-container to-tertiary-fixed-dim transition-[width] duration-1000 ease-out"
                style={{ width: `${barGrown ? dexAfter : dexBefore}%` }}
              />
            </div>
          </div>
        )}

        <p className="mt-space-md text-label-sm text-outline">화면을 탭해서 닫기</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Change `GameContext.tsx`'s `claim` to return points awarded**

Find:

```tsx
  claim: (slotIds: string[]) => Promise<void>
```

Replace with:

```tsx
  claim: (slotIds: string[]) => Promise<number>
```

Find:

```tsx
  const claim = useCallback(
    async (slotIds: string[]) => {
      if (slotIds.length === 0) {
        await refresh()
        return
      }
      try {
        const result = await claimSlotsApi(slotIds)
        setState(result.state)
      } catch (error) {
        console.warn('game claim failed', error)
      }
      await loadCatalogState()
    },
    [refresh, loadCatalogState]
  )
```

Replace with:

```tsx
  const claim = useCallback(
    async (slotIds: string[]) => {
      if (slotIds.length === 0) {
        await refresh()
        return 0
      }
      let pointsAwarded = 0
      try {
        const result = await claimSlotsApi(slotIds)
        setState(result.state)
        pointsAwarded = result.pointsAwarded
      } catch (error) {
        console.warn('game claim failed', error)
      }
      await loadCatalogState()
      return pointsAwarded
    },
    [refresh, loadCatalogState]
  )
```

- [ ] **Step 4: Wire it into `NewItemPage.tsx`**

Find (the imports):

```tsx
import { RecommendationToggle } from '../components/RecommendationToggle'
import { EntryTabs } from '../components/EntryTabs'
import { EntryPreviewCard } from '../components/EntryPreviewCard'
import { Icon } from '../data/materialIcons'
import { useGame } from '../state/GameContext'
import type { Item } from '../types'
```

Replace with:

```tsx
import { RecommendationToggle } from '../components/RecommendationToggle'
import { EntryTabs } from '../components/EntryTabs'
import { EntryPreviewCard } from '../components/EntryPreviewCard'
import { CompletionCelebration } from '../components/CompletionCelebration'
import { Icon, LOCATION_MATERIAL_ICON } from '../data/materialIcons'
import { useGame } from '../state/GameContext'
import type { Item } from '../types'
```

Find:

```tsx
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
      daysUntilEmpty:
        progressMode === 'daysUntilEmpty'
          ? existing
            ? daysUntilEmpty - (getRemainingDays({ ...existing, daysUntilEmpty: 0 }) ?? 0)
            : daysUntilEmpty
          : undefined,
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
    if (masterItemId) void game.claim([masterItemId])
    navigate('/')
  }
```

Replace with:

```tsx
  async function handleSubmit(e: React.FormEvent) {
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
      daysUntilEmpty:
        progressMode === 'daysUntilEmpty'
          ? existing
            ? daysUntilEmpty - (getRemainingDays({ ...existing, daysUntilEmpty: 0 }) ?? 0)
            : daysUntilEmpty
          : undefined,
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
    const pointsAwarded = masterItemId ? await game.claim([masterItemId]) : 0
    setCelebration({
      itemName: item.name,
      icon: LOCATION_MATERIAL_ICON[location?.colorToken ?? ''] ?? 'inventory_2',
      pointsAwarded,
      dexBefore: gain.before,
      dexAfter: gain.after,
      locationName,
    })
  }
```

Find:

```tsx
  const showNotice = () => setNotice({ id: Date.now() }) // added
  const locationName = locations.find((l) => l.id === locationId)?.name ?? '' // added
```

Replace with:

```tsx
  const showNotice = () => setNotice({ id: Date.now() }) // added
  const location = locations.find((l) => l.id === locationId) // added
  const locationName = location?.name ?? '' // added
```

Find (near the other `useState` declarations, e.g. right after `notice`):

```tsx
  const [notice, setNotice] = useState<{ id: number } | null>(null) // added
```

Replace with:

```tsx
  const [notice, setNotice] = useState<{ id: number } | null>(null) // added
  const [celebration, setCelebration] = useState<{
    itemName: string
    icon: string
    pointsAwarded: number
    dexBefore: number
    dexAfter: number
    locationName: string
  } | null>(null)
```

Find (the end of the JSX, right before the closing `</form>`):

```tsx
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

Replace with:

```tsx
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
      {celebration && (
        <CompletionCelebration
          {...celebration}
          onDismiss={() => {
            setCelebration(null)
            navigate('/')
          }}
        />
      )}
    </form>
  )
}
```

- [ ] **Step 5: Run to verify it compiles and the suite stays green**

Run: `npx tsc --noEmit` — expected clean.
Run: `npx vitest run` — expected PASS, 123/123 (unchanged).

- [ ] **Step 6: Restart the dev server and manually trace**

Per this plan's Global Constraints note: fully restart `npm run dev`
(kill and re-run, not just rely on HMR) so the four new Tailwind
animation utilities actually land in the compiled CSS — confirm with
`curl -s http://localhost:7777/src/index.css | grep -o "burst-pop\|badge-bounce\|point-in\|confetti-fall" | sort -u`
before trusting a visual check.

Then, with both dev servers running, register a new item:
1. Linked to a master item, in a category with room to grow completion
   → confirm the celebration shows the badge bounce, confetti, "+NP
   획득" (N > 0), and the dex-percentage bar animating from before% to
   after%.
2. Not linked to any master item → confirm the celebration still shows
   (title/item name/badge) but the points line is absent.
3. An edit (`existing` is set) that doesn't raise completion → confirm
   the dex-progress line is absent.
4. Tap the overlay in each case → confirm it navigates to `/` exactly
   once (no double-navigation, no stuck overlay).

- [ ] **Step 7: Commit**

```bash
git add tailwind.config.ts src/components/CompletionCelebration.tsx src/state/GameContext.tsx src/pages/NewItemPage.tsx
git commit -m "feat: show an animated completion celebration after registering an item"
```

---

Related: `docs/superpowers/specs/2026-09-28-completion-celebration-design.md`,
`docs/superpowers/plans/2026-09-28-analyzing-overlay-redesign.md`.
