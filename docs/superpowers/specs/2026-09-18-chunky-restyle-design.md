# Chunky Game-Style Restyle + Tablet-Width Layout — Design Spec

Date: 2026-09-18

## Purpose

The user wants the app to feel more like a game — chosen via a visual
A/B/C comparison (thick borders, offset "pressed" shadows, bold rounded
buttons — a Duolingo-like "chunky & playful" style, option A of three
shown). Separately, the overall web layout should read as tablet-sized
rather than stretching to fill a wide desktop browser, while staying
fully responsive on real mobile widths (unchanged there). This applies
across the whole app, not just the home screen's existing gamification
elements.

## Visual Style — Foundation

Three new reusable component classes in `src/index.css` (`@layer
components`), plus one `boxShadow` token in `tailwind.config.ts`. No new
colors — every class below reuses existing tokens (`ink`, `card`,
`stamp`, `accent`, `paper`).

```ts
// tailwind.config.ts — add to theme.extend
boxShadow: {
  chunky: '4px 4px 0 0 #2A2420', // ink, hardcoded since box-shadow can't reference a Tailwind color token directly
},
```

```css
/* src/index.css — add inside @layer components */
.chunky-card {
  @apply rounded-2xl border-2 border-ink bg-card shadow-chunky;
}
.chunky-btn {
  @apply rounded-xl border-2 border-ink shadow-chunky transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none;
}
.chunky-input {
  @apply rounded-xl border-2 border-ink;
}
```

`chunky-btn` is deliberately shadow-and-border only — background color,
text color, and padding stay per-usage (a primary button keeps
`bg-stamp text-white`, a secondary one keeps `bg-card text-ink`, etc.),
so this class composes with the existing color usage at each call site
rather than dictating it. `chunky-input` omits the shadow (a pressed-look
shadow on a text field reads as a button, not an input) and just
thickens the border for visual consistency with cards/buttons.

## Layout — Tablet Width

`src/components/AppLayout.tsx`'s outer frame (the `<div className="flex
h-dvh bg-paper text-ink">` wrapping both the sidebar and the content
column) gains `md:max-w-[820px] md:mx-auto`. At `md:` (768px) and above,
the whole frame (sidebar + content, not just the content column) is
capped at 820px and centered on the page — reading as a tablet, not a
stretched desktop layout. Below `md:`, nothing changes (already full-
width, unaffected). No change to the sidebar-vs-bottom-bar breakpoint
logic itself (confirmed via the visual comparison: keep the sidebar at
tablet+ width, bottom bar stays mobile-only) — this is a width cap
layered on top of the existing structure, not a navigation redesign.

820px was chosen to match a common tablet viewport (close to iPad
Air/mini portrait width) and is a plain arbitrary-value Tailwind class,
no new dependency.

## Retrofit Scope — Whole App

Every card, button, and text input across the app adopts the three new
classes. To keep this tractable, the rollout goes through the shared
component layer first (maximizes coverage per file touched), then each
page's own remaining ad-hoc markup:

**Shared components** (touching these covers most of the app's visual
surface at once):
- `src/components/Badge.tsx` — the existing rotated-stamp badge already
  has a "collectible seal" feel; add `border-2` (it currently uses
  `border-2 border-stamp`, already close) — confirm it still reads
  correctly next to the new chunky cards, adjust only if needed.
- `src/components/ItemCard.tsx` — its card wrapper gets `chunky-card`.
- `src/components/ProgressRing.tsx` — the ring itself is SVG (unaffected
  by border/shadow classes), but any surrounding card wrapper in its
  consumers (`LocationIcon`, `HomeProfileCard`) gets the new classes
  where applicable.
- `src/components/LocationIcon.tsx`, `RecommendationBadge.tsx`,
  `RecommendationToggle.tsx`, `HomeProfileCard.tsx`, `QuestCarousel.tsx`
  — apply `chunky-card`/`chunky-btn` to their card/button wrappers,
  matching the visual comparison's approved mockup (thick border, offset
  shadow, bold badge chip).

**Per-page retrofit** (buttons, cards, and inputs not covered by a
shared component):
- `src/components/AppLayout.tsx` — sidebar nav items and bottom-bar nav
  items get `chunky-btn`-style active states (adapt: nav items are
  `NavLink`s, not `<button>`s, so apply the same border/shadow utility
  classes directly rather than the `.chunky-btn` class, since active-
  state styling here is driven by React Router's `isActive`, not CSS
  `:active`).
- `src/pages/HomePage.tsx` — search input (`chunky-input`), location/
  category grid tiles (`chunky-card`), floating record button
  (`chunky-btn`), record-sheet buttons (`chunky-btn`).
- `src/pages/PurchasePage.tsx` — recommendation/discount/group-buy cards
  (`chunky-card`), "참여하기" button (`chunky-btn`).
- `src/pages/RankingPage.tsx` — location/category/product list rows
  (`chunky-card`).
- `src/pages/NotificationsPage.tsx` — notification rows (`chunky-card`),
  구매하기 button/disabled-button (`chunky-btn`).
- `src/pages/ItemDetailPage.tsx` — detail card, buy button, related-items
  cards (`chunky-card`/`chunky-btn`).
- `src/pages/NewItemPage.tsx` — every text input (`chunky-input`), every
  button including "장소 추가"/"카테고리 추가"/"저장하기"/progress-mode
  toggles (`chunky-btn`).
- `src/pages/CollectionPage.tsx` — location ring cards, category
  checklist cards (`chunky-card`).
- `src/pages/FamilyPage.tsx` — family member cards (`chunky-card`).

This is a styling-only pass: no component's props, state, logic, or
data flow changes — only `className` strings gain the new utility
classes (or the equivalent inline Tailwind classes where a shared class
doesn't fit, per the `AppLayout` nav-item note above). No file's
behavior changes; this is verified via the existing automated test
suite passing unchanged (a purely visual diff shouldn't break any
existing assertion) plus a manual visual walkthrough of every page.

## Testing

No new automated tests — this is a pure CSS/className restyle with zero
logic changes. The existing test suite (50 frontend + 8 backend tests)
must continue to pass unchanged, confirming no behavioral regression.
Verification is manual: a visual walkthrough of every page at both a
mobile width (confirm nothing regressed — chunky style applies there
too, per the "whole app" scope, but layout/breakpoints are unaffected)
and a wide desktop width (confirm the tablet-width cap holds and the
chunky style reads consistently across screens).

## Out of Scope (explicitly)

- Any animation/motion beyond the button press-shadow effect (no
  confetti, no bounce-in transitions, etc.) — the chosen style direction
  was static "chunky & playful," not an animated one.
- Changing the sidebar/bottom-bar navigation structure itself (already
  decided via the layout comparison — width cap only, not a nav
  redesign).
- The neon-arcade and collectible-seal style directions shown but not
  chosen.
- Any of the three previously-paused/still-pending feature ideas
  (cross-user completed-collection leaderboard beyond what's shipped,
  real purchase/discount data, further AI features) — unrelated to this
  purely visual restyle.
