# Web Layout Migration — Design Spec

Date: 2026-09-16

## Purpose

The app was styled earlier this session to look like a native mobile app
inside an iPhone-shaped mockup frame when viewed on desktop (rounded
bezel, dynamic-island notch, home-indicator bar, fixed 390×844 box
centered on a dark backdrop). The user now wants the opposite: a normal
responsive website — a wide, real layout on desktop, and a naturally
reflowing single-column layout on mobile browsers, with no "pretend
phone" illusion anywhere.

This spec covers only the **app shell** (`AppLayout`) and the one
follow-on positioning fix it requires (`HomePage`'s floating record
button/sheet, which were made `absolute` specifically to stay confined
inside the now-removed mockup frame). Per-page content density (e.g.
using more grid columns for the location/category tiles on wide screens)
is explicitly deferred as a fast-follow — see Out of Scope.

## Scope & Approach

- **Remove entirely:** the iPhone-mockup-frame styling in
  `src/components/AppLayout.tsx` (the `sm:h-[844px] sm:w-[390px]
  sm:rounded-[3rem] sm:border-[10px] sm:border-ink` block, the dynamic-
  island `<div>`, the home-indicator `<div>`) and the dark centered-
  backdrop styling in `src/index.css`'s `body` rule.
- **Add:** a real responsive shell — a left sidebar nav at `md:` (≥768px)
  and above, replacing the bottom tab bar at that width; the bottom tab
  bar remains exactly as it is today below `md:`. Main content stops
  being capped at `max-w-md` and instead gets a wider reading column
  (`max-w-3xl`) centered in the remaining space next to the sidebar.
- **Fix:** `src/pages/HomePage.tsx`'s floating "+" record button and its
  options sheet, which use `absolute` positioning today so they stay
  confined inside the mockup frame's `relative` container. With the frame
  gone, `fixed` (viewport-relative) is correct again — this is a revert to
  what these elements were before the mockup-frame work, so it's also a
  net simplification (the two "don't add `relative` to an intervening
  element or this breaks" warning comments go away entirely, since a
  `fixed`-positioned element has no such dependency).

## `AppLayout` — Before/After

**Before** (current, mockup-frame version):
- One `relative` div, capped to phone dimensions at `sm:`, containing
  header + `<main>` + an `absolute`-positioned bottom nav + two decorative
  `absolute` divs (notch, home indicator).

**After:**
- A `flex min-h-screen` row: a `hidden md:flex` sidebar (brand name at
  top, the same 5 `NavLink`s as today's bottom bar, but as a vertical
  list with icon + label side by side, active item highighted with
  `bg-stamp text-white` instead of the bottom bar's active-text-color
  treatment) + a flex-column content area (header with the brand name
  shown only below `md:` via `md:hidden`, since the sidebar already shows
  it, plus the existing notification bell button) + `<main>` wrapping
  `<Outlet />` in a `mx-auto w-full max-w-3xl` div for a comfortable
  reading width on wide screens + the existing bottom tab bar, now
  `fixed inset-x-0 bottom-0 ... md:hidden` (fixed again, correct now that
  there's no mockup frame to escape) instead of `absolute`.
- `<main>`'s bottom padding (reserved for the mobile bottom bar) becomes
  `pb-20 md:pb-4`, since there's no bottom bar to clear at `md:` and
  above.

## `index.css` — Before/After

**Before:** `body { @apply flex min-h-[100dvh] items-center justify-center bg-ink text-ink font-body; }`
(centers a phone-shaped box on a dark backdrop)

**After:** `body { @apply bg-paper text-ink font-body; }`
(the pre-mockup-frame rule — `AppLayout`'s own `min-h-screen` flex row now
fills the page directly, no external centering/backdrop needed)

## `HomePage` — floating button & sheet

- The "+" button's className changes from `absolute bottom-24 right-4
  z-30 ...` to `fixed bottom-24 right-4 z-30 ... md:bottom-8` (the
  `md:bottom-8` is a small enhancement: without the mobile bottom tab bar
  to clear at `md:` and above, the button can sit closer to the bottom
  edge).
- The options-sheet backdrop's className changes from `absolute inset-0
  z-50 ...` to `fixed inset-0 z-50 ...`. Its inner panel is unchanged — a
  bottom-anchored sheet reads fine on desktop too, no separate desktop
  treatment needed.
- The two one-line comments warning about the `absolute`-positioning
  dependency on `AppLayout`'s frame (one in each file, added during the
  prior branch-review fix round) are deleted — the dependency they
  warned about no longer exists.

## Testing

No automated tests exist for `AppLayout` or `HomePage` today (both are
page/shell-level visual components verified via `tsc --noEmit` + manual
trace, per this branch's established precedent). This migration follows
the same approach:
- `npx tsc --noEmit` clean.
- `npx vitest run` — all 43 existing tests still pass (none render
  `AppLayout`/`HomePage`, so no test should need changes).
- Manual trace: at a narrow viewport (e.g. 390px), confirm the layout is
  pixel-identical to today's mobile experience (bottom tab bar, no
  sidebar, floating button in its usual spot) — this migration must not
  change anything at mobile widths except the button/sheet positioning
  mode (which is behaviorally identical, `fixed` vs `absolute`, when the
  containing block fills the viewport anyway). At a wide viewport (e.g.
  1280px), confirm: no phone bezel/notch/dark backdrop anywhere, a left
  sidebar with all 5 nav items and correct active-state highlighting,
  content sits in a centered wide column (not stretched edge-to-edge, not
  still capped at 448px), the floating record button and its sheet still
  open/close correctly and sit relative to the browser window.

## Out of Scope (explicitly)

- Per-page grid density increases (e.g. more columns in the location/
  category tile grids on wide screens) — deferred as a fast-follow once
  the shell itself is confirmed to look right.
- Any change to page content, business logic, or data — this is a shell/
  layout-only migration.
- The link-analysis AI feature design discussed earlier this session is
  paused (not abandoned) until this migration lands, per the user's
  explicit sequencing choice.
