# Analyzing Overlay Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `AnalyzingOverlay`'s static "AI 도감 스캐너" card layout with a dark, continuously-animated "scanner ring" screen (glowing spinning ring, cross-fading product icons, a sweeping scan line, and cycling percentage/status text) — a purely visual redesign, per the user-approved design from a visual-companion brainstorming session.

**Architecture:** One new set of Tailwind keyframe/animation utilities (`tailwind.config.ts`), one full rewrite of `AnalyzingOverlay.tsx` (fewer props, all-CSS animation, no new JS state), and a matching prop cleanup at its two call sites in `HomePage.tsx`. Single cohesive UI change — one task.

**Tech Stack:** React, TypeScript, Tailwind CSS. No new dependency.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-28-analyzing-overlay-redesign-design.md`.
- All motion is pure CSS `@keyframes` via Tailwind's `theme.extend.keyframes`/`animation` — no new JS timers, no new component state, no new dependency.
- `AnalyzingOverlay`'s new prop shape: `{ onCancel: () => void; dialogLabel?: string }`. `sourceLabel`, `entryNumber`, and `icon` are removed.
- `dialogLabel` is `aria-label` only — never rendered as visible text.
- The cancel button (calling `onCancel`) and the existing `Escape`-key handler are the only interactive/behavioral pieces carried over unchanged.
- Icon names used must be valid Material Symbols Outlined names (this app's `Icon` component is a thin wrapper with no icon allow-list to update) — this plan uses `soap`, `dry_cleaning`, `cleaning_services`, `local_pharmacy`.
- No change to `HomePage.tsx`'s analyze request logic, error handling, or anything besides the two `<AnalyzingOverlay>` call sites' props.
- `npx tsc --noEmit` clean and `npx vitest run` green (123 tests before this plan; no new test file — `AnalyzingOverlay.tsx` has no existing test file, confirmed absent from `src/components/*.test.tsx`).
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## File Structure

```
tailwind.config.ts               # Modify: add 4 new keyframes/animation utilities
src/components/AnalyzingOverlay.tsx  # Modify: full rewrite
src/pages/HomePage.tsx           # Modify: update both call sites' props
```

---

### Task 1: Dark scanner-ring redesign

**Files:**
- Modify: `tailwind.config.ts`, `src/components/AnalyzingOverlay.tsx`, `src/pages/HomePage.tsx`

**Interfaces:**
- Produces: `AnalyzingOverlay({ onCancel: () => void; dialogLabel?: string })` (replaces the current 5-prop signature).

No automated test — `AnalyzingOverlay.tsx` has no existing test file today, consistent with this codebase's precedent of not unit-testing CSS-animation-driven presentational components. Verified by `tsc` + a manual trace (Step 5 below).

- [ ] **Step 1: Add the four new animation utilities to `tailwind.config.ts`**

Find (the end of the `extend` block):

```ts
      boxShadow: {
        'elevation-1': '0px 3px 0px rgba(43,38,37,0.08)',
        'elevation-2': '0px 4px 0px #1E3A34',
        'elevation-3': '0px 4px 0px #A3361E',
        'elevation-4': '0px 12px 24px -4px rgba(30,58,52,0.12), 0px 4px 0px #1E3A34',
      },
    },
  },
  plugins: [],
} satisfies Config
```

Replace with:

```ts
      boxShadow: {
        'elevation-1': '0px 3px 0px rgba(43,38,37,0.08)',
        'elevation-2': '0px 4px 0px #1E3A34',
        'elevation-3': '0px 4px 0px #A3361E',
        'elevation-4': '0px 12px 24px -4px rgba(30,58,52,0.12), 0px 4px 0px #1E3A34',
      },
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
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 2: Rewrite `src/components/AnalyzingOverlay.tsx`**

Replace the entire file with:

```tsx
import { useEffect } from 'react'
import { Icon } from '../data/materialIcons'

const SCAN_ICONS = ['soap', 'dry_cleaning', 'cleaning_services', 'local_pharmacy']
const CYCLE_DELAYS = ['0s', '1.2s', '2.4s', '3.6s']
const ICON_DELAYS = ['0s', '0.8s', '1.6s', '2.4s']

const STATUS_LABELS = [
  '비슷한 상품 탐색 중…',
  '카테고리 후보 비교 중…',
  '가장 근접한 상품 확정 중…',
  '소진 주기 계산 중…',
]

const PERCENTS = [38, 64, 82, 97]

export function AnalyzingOverlay({
  onCancel,
  dialogLabel = '분석 중',
}: {
  onCancel: () => void
  dialogLabel?: string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-space-md bg-[#1e1512] p-margin text-white"
    >
      <div className="relative h-[120px] w-[120px]">
        <div className="absolute inset-0 animate-ring-glow rounded-full bg-[radial-gradient(circle,rgba(255,185,95,0.35),transparent_70%)]" />
        <div className="absolute inset-2 animate-spin rounded-full border-4 border-transparent border-r-primary-container border-t-tertiary-fixed-dim" />
        <div className="absolute inset-3.5 overflow-hidden rounded-full">
          {SCAN_ICONS.map((name, i) => (
            <span
              key={name}
              className="absolute inset-0 flex animate-icon-cycle items-center justify-center opacity-0"
              style={{ animationDelay: ICON_DELAYS[i] }}
            >
              <Icon name={name} className="text-[34px] text-tertiary-fixed-dim" />
            </span>
          ))}
          <div className="absolute inset-x-0 h-3.5 animate-scan-sweep bg-gradient-to-b from-transparent via-tertiary-fixed-dim/90 to-transparent" />
        </div>
      </div>

      <div className="relative h-8 w-40 text-center">
        {PERCENTS.map((pct, i) => (
          <span
            key={pct}
            className="absolute inset-0 animate-text-cycle bg-gradient-to-r from-tertiary-fixed-dim to-primary-container bg-clip-text text-headline-lg font-bold text-transparent opacity-0"
            style={{ animationDelay: CYCLE_DELAYS[i] }}
          >
            {pct}%
          </span>
        ))}
      </div>

      <div className="relative h-5 w-64 text-center">
        {STATUS_LABELS.map((label, i) => (
          <span
            key={label}
            className="absolute inset-0 animate-text-cycle text-body-sm text-outline-variant opacity-0"
            style={{ animationDelay: CYCLE_DELAYS[i] }}
          >
            {label}
          </span>
        ))}
      </div>

      <button
        type="button"
        autoFocus
        onClick={onCancel}
        className="mt-space-sm flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-5 py-2.5 text-label-lg text-outline-variant active:translate-y-0.5"
      >
        <Icon name="close" className="text-[18px]" />
        분석 중단 및 취소
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Update `src/pages/HomePage.tsx`'s two call sites**

Find:

```tsx
      {isAnalyzing && (
        <AnalyzingOverlay
          sourceLabel={linkUrl}
          entryNumber={items.length + 1}
          onCancel={handleCancelAnalyze}
        />
      )}
      {isAnalyzingPhoto && (
        <AnalyzingOverlay
          sourceLabel={photoLabel}
          icon="photo_camera"
          dialogLabel="사진 분석 중"
          entryNumber={items.length + 1}
          onCancel={handleCancelAnalyze}
        />
      )}
```

Replace with:

```tsx
      {isAnalyzing && (
        <AnalyzingOverlay dialogLabel="링크 분석 중" onCancel={handleCancelAnalyze} />
      )}
      {isAnalyzingPhoto && (
        <AnalyzingOverlay dialogLabel="사진 분석 중" onCancel={handleCancelAnalyze} />
      )}
```

- [ ] **Step 4: Run to verify it compiles and the suite stays green**

Run: `npx tsc --noEmit` — expected clean (confirms `photoLabel`/`linkUrl` are
still used elsewhere in `HomePage.tsx` — e.g. `photoLabel` is still set by
`handlePhotoFile` even though no longer passed to `AnalyzingOverlay` — a
lint/unused-var check is not part of `tsc --noEmit`, so this step only
confirms type correctness, not unused-variable cleanliness; if `tsc` or
your judgment flags `photoLabel`/`linkUrl` as now-pointless state, that's
a separate concern outside this plan's scope — they're harmless leftover
state, not a compile error).
Run: `npx vitest run` — expected PASS, 123/123 (unchanged — no test file
touches this component or its call sites).

- [ ] **Step 5: Manual trace**

With `npm run dev` and `npm run dev:server` running, trigger both flows
from the home screen's record-options sheet ("링크로 가져오기" with any
URL, and "카메라로 촬영"/"사진 선택" with any photo) and confirm for
each: the dark overlay appears, the ring visibly spins with a pulsing
glow, the four product icons cross-fade through in the center with the
scan line sweeping over them, the percentage and status text cycle
through their values, and both the Escape key and the cancel button
correctly abort the request and dismiss the overlay (matching the
pre-existing `handleCancelAnalyze` behavior, unchanged by this plan).

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.ts src/components/AnalyzingOverlay.tsx src/pages/HomePage.tsx
git commit -m "feat: redesign AnalyzingOverlay as an animated dark scanner ring"
```

---

Related: `docs/superpowers/specs/2026-09-28-analyzing-overlay-redesign-design.md`.
