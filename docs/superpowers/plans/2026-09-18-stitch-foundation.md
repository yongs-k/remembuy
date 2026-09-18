# Stitch Design System Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Material-3-style color/typography/spacing tokens, repoint the app's fonts to Plus Jakarta Sans + Noto Sans, and load the Material Symbols icon font — the shared foundation every later Stitch-screen-port sub-project depends on.

**Architecture:** Purely additive Tailwind config + `index.html` changes. No existing token, class, or component is removed or renamed — the current `paper`/`card`/`ink`/`stamp`/`accent`/`warn` tokens and `chunky-*` classes keep working exactly as before, so every already-shipped page keeps its current look until its own later migration task.

**Tech Stack:** Tailwind CSS (existing project stack), Google Fonts CDN (existing pattern, just new font families). No new npm dependencies.

## Global Constraints

- Purely additive: no existing color token, `fontFamily` key (other than repointing `heading`/`body`'s VALUES, not their names), class, or component is removed, renamed, or restructured.
- No new npm dependencies.
- `tsc --noEmit` clean and all 50 existing frontend tests passing, unchanged, after every task — this plan touches no logic, so nothing should need updating.
- Do not override Tailwind's default `borderRadius` scale — later per-screen tasks use arbitrary radius values instead, to avoid shifting the rounding of every already-shipped chunky-styled element.
- Exact hex/size/weight values come from `docs/superpowers/specs/2026-09-18-stitch-foundation-design.md` and the Stitch export's own `DESIGN.md` frontmatter — copy them verbatim, don't approximate.

## File Structure

```
tailwind.config.ts   # Modify: add Material 3 colors, add typography scale, add spacing scale, add elevation shadows, repoint heading/body fonts
index.html            # Modify: swap Google Fonts link to Plus Jakarta Sans + Noto Sans, add Material Symbols Outlined link
```

---

### Task 1: `tailwind.config.ts` — full token additions

**Files:**
- Modify: `tailwind.config.ts`

**Interfaces:**
- Produces: every Tailwind utility class implied by the new tokens (e.g. `bg-primary`, `text-on-surface`, `text-headline-lg`, `p-space-md`, `shadow-elevation-2`) — available globally to every later sub-project's JSX with no import needed.

- [ ] **Step 1: Replace the whole file**

Find the entire current file:

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        heading: ['"Gowun Batang"', 'serif'],
        body: ['"IBM Plex Sans KR"', 'sans-serif'],
      },
      boxShadow: {
        chunky: '4px 4px 0 0 #2A2420',
      },
    },
  },
  plugins: [],
} satisfies Config
```

Replace it with:

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
        surface: '#fff8f6',
        'surface-dim': '#e2d8d6',
        'surface-bright': '#fff8f6',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#fcf1ef',
        'surface-container': '#f6ecea',
        'surface-container-high': '#f0e6e4',
        'surface-container-highest': '#eae0de',
        'on-surface': '#1f1b1a',
        'on-surface-variant': '#59413c',
        'inverse-surface': '#352f2e',
        'inverse-on-surface': '#f9eeec',
        outline: '#8d716a',
        'outline-variant': '#e1bfb8',
        'surface-tint': '#ad3217',
        primary: '#aa3015',
        'on-primary': '#ffffff',
        'primary-container': '#cc482b',
        'on-primary-container': '#fffbff',
        'inverse-primary': '#ffb4a4',
        secondary: '#48645d',
        'on-secondary': '#ffffff',
        'secondary-container': '#c7e6dd',
        'on-secondary-container': '#4c6861',
        tertiary: '#825100',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#a36700',
        'on-tertiary-container': '#fffbff',
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
        'primary-fixed': '#ffdad3',
        'primary-fixed-dim': '#ffb4a4',
        'on-primary-fixed': '#3d0600',
        'on-primary-fixed-variant': '#8b1901',
        'secondary-fixed': '#cae9e0',
        'secondary-fixed-dim': '#aecdc4',
        'on-secondary-fixed': '#02201b',
        'on-secondary-fixed-variant': '#304c46',
        'tertiary-fixed': '#ffddb8',
        'tertiary-fixed-dim': '#ffb95f',
        'on-tertiary-fixed': '#2a1700',
        'on-tertiary-fixed-variant': '#653e00',
        background: '#fff8f6',
        'on-background': '#1f1b1a',
        'surface-variant': '#eae0de',
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"Noto Sans"', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['36px', { lineHeight: '44px', letterSpacing: '-0.03em', fontWeight: '800' }],
        'display-sm': ['28px', { lineHeight: '36px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'headline-lg': ['22px', { lineHeight: '28px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md': ['18px', { lineHeight: '24px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'body-lg': ['16px', { lineHeight: '24px', letterSpacing: '-0.01em', fontWeight: '500' }],
        'body-md': ['14px', { lineHeight: '20px', letterSpacing: '-0.01em', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '18px', letterSpacing: '0em', fontWeight: '400' }],
        'label-lg': ['14px', { lineHeight: '18px', letterSpacing: '0.01em', fontWeight: '700' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '700' }],
        'label-sm': ['10px', { lineHeight: '14px', letterSpacing: '0.04em', fontWeight: '800' }],
        'stat-counter': ['24px', { lineHeight: '28px', letterSpacing: '-0.02em', fontWeight: '800' }],
      },
      spacing: {
        gutter: '0.75rem',
        'gutter-mobile': '0.5rem',
        margin: '1rem',
        'margin-mobile': '1rem',
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '0.875rem',
        'space-lg': '1.25rem',
        'space-xl': '1.75rem',
      },
      boxShadow: {
        chunky: '4px 4px 0 0 #2A2420',
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

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 3: Run the test suite**

Run: `npx vitest run`
Expected: all 50 tests pass unchanged.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat: add Stitch design system color/typography/spacing/elevation tokens"
```

---

### Task 2: `index.html` — font links

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: nothing from Task 1 directly, but Task 1's `fontFamily.heading`/`body` repointing only takes visual effect once these font files are actually loaded.

- [ ] **Step 1: Replace the Google Fonts `<link>` and add the Material Symbols link**

Find:

```html
    <link
      href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
```

Replace with:

```html
    <link
      href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Noto+Sans:wght@400;500;700&display=swap"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      rel="stylesheet"
    />
```

(The two existing `<link rel="preconnect" ...>` lines right above stay unchanged — both new `<link>`s are still served from `fonts.googleapis.com`/`fonts.gstatic.com`, so the preconnects still apply.)

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors (this file isn't TypeScript, but confirms nothing else broke).

- [ ] **Step 3: Run the test suite**

Run: `npx vitest run`
Expected: all 50 tests pass unchanged.

- [ ] **Step 4: Manual verification trace**

With `npm run dev` running:
- Confirm the app still loads with no console errors about missing fonts.
- Confirm every existing heading (`<h1>`, section titles using `font-heading`) now renders in Plus Jakarta Sans (a bold, geometric sans-serif) instead of Gowun Batang (a serif) — this should be visible immediately on the home screen's "REMEMBUY" wordmark and every page's `<h1>`.
- Confirm body text now renders in Noto Sans instead of IBM Plex Sans KR — subtle but should look slightly different, particularly in Korean text weight/spacing.
- Confirm every existing page's layout, colors, borders, and chunky shadows are completely unchanged — this task should be visually invisible except for the font faces.
- Open browser devtools' Network tab and confirm a request for `Material+Symbols+Outlined` succeeds (200) — even though nothing uses the icon font yet, confirms the link itself is valid and loadable.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: switch to Plus Jakarta Sans/Noto Sans, load Material Symbols font"
```

---

### Task 3: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full frontend automated test suite**

Run: `npx vitest run`
Expected: all 50 tests pass, unchanged count (this plan added zero test files — pure config/HTML change).

- [ ] **Step 2: Run the backend test suite**

Run: `npm run test:server`
Expected: all 8 tests pass (unaffected — this plan touches no `server/` files).

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit`
Expected: zero errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual golden-path walkthrough**

With `npm run dev` running, click through every existing tab (홈/랭킹/구매/가족/컬렉션) and confirm:
- All text now renders in the new font faces (Plus Jakarta Sans headings, Noto Sans body).
- Every existing chunky-styled card/button/input still looks exactly as it did before this plan (colors, borders, shadows, radii, layout — none of that should have changed).
- No console errors or broken font-loading network requests.

- [ ] **Step 5: Commit final state (only if fixes were needed)**

If Steps 1-4 required any fixes, commit them now with a descriptive message. If everything passed as-is, no commit is needed for this task.
