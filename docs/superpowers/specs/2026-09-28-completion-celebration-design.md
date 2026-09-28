# Registration Completion Celebration — Design Spec

Date: 2026-09-28

## Purpose

User feedback: "등록 시에 등록 완료에 대한 임펙트가 없습니다" — submitting
the new-item form (`src/pages/NewItemPage.tsx`) currently saves the item,
silently claims any linked master-item reward, and instantly
`navigate('/')`s back to the home screen. Nothing is shown in between.
Explored via the visual-companion brainstorming tool (two style
directions); the user picked the dark theme matching the AnalyzingOverlay
redesign shipped earlier today.

## Design

**New component: `src/components/CompletionCelebration.tsx`** — a
full-viewport dark overlay (`#1e1512`, matching `AnalyzingOverlay`'s
palette), shown after a successful save instead of navigating
immediately:

- A radial glow "burst" pops in behind a bouncing circular badge
  containing a Material Symbols icon — reused from this app's existing
  `LOCATION_MATERIAL_ICON` map (`src/data/materialIcons.tsx`), keyed by
  the saved item's `locationId`, so no new icon data is introduced.
- A handful of falling confetti pieces (small colored rectangles,
  CSS-animated fall + rotate + fade, using this app's existing brand
  colors).
- Title: "도감 등록 완료!"; subtitle: the item's name.
- **"+N P 획득"**, shown only when a reward was actually claimed (see
  Interface changes below) — omitted entirely when the item wasn't
  linked to a master item (no claim happens) or the claim yielded 0
  points.
- A dex-completion progress line ("OO 도감 수집률 25% → 42%") with an
  animated bar fill, shown only when completion actually increased
  (reusing the existing `gain`/`hasGain` values `NewItemPage.tsx`
  already computes today for its in-form preview — no new calculation).
- **Dismissal: tap anywhere on the overlay** — there is no auto-timeout
  and no separate button. On dismiss, the pending `navigate('/')` (held
  back until now) fires.

## Interface changes

**`src/state/GameContext.tsx`'s `claim` function** currently returns
`Promise<void>`, discarding the server's `pointsAwarded` (already present
in `ClaimResult`, `src/lib/gameApi.ts`, just unused today). It changes to
`Promise<number>`, returning the points actually awarded (`0` when
`slotIds` is empty, or when the claim request fails — matching today's
existing "warn and continue" error handling, just now surfacing `0`
instead of `undefined`). `claim` has exactly one caller today
(`NewItemPage.tsx`) — confirmed via a full-codebase search — so this is
a safe, non-breaking signature change.

**`src/pages/NewItemPage.tsx`'s `handleSubmit`** becomes `async`:
1. Build and save the `Item` (`addItem`/`updateItem`) — unchanged.
2. If `masterItemId` is set, `await game.claim([masterItemId])` and
   capture the returned points (0 otherwise).
3. Instead of calling `navigate('/')` immediately, set a new piece of
   local state holding the celebration's props (item name, location
   icon, points awarded, dex gain before/after) and render
   `<CompletionCelebration>` when it's non-null.
4. `CompletionCelebration`'s `onDismiss` callback clears that state and
   calls `navigate('/')` — the actual navigation this plan defers, not
   removes.

## Out of Scope (explicitly)

- Any change to what `addItem`/`updateItem`/`game.claim` actually do
  server-side or in `LockerContext` — this plan only changes when
  navigation happens and what's shown in between.
- `AnalyzingOverlay` itself — already shipped earlier today; this is a
  separate, second dark overlay for a different moment (save completion,
  not analysis-in-progress). No shared component between the two beyond
  matching color choices, since their content/lifecycle differ
  (analysis overlay: cancellable, tied to an in-flight request;
  celebration: tap-to-dismiss, shown only after success).
- Any animation/visual change to the existing in-form "gain" preview
  (`getCompletionGain`, shown live while filling out the form) — that
  stays as-is; this plan only adds a post-submit celebration that reuses
  its already-computed numbers.

## Testing

No automated test exists for `NewItemPage.tsx` or `AnalyzingOverlay.tsx`
today (confirmed absent from `src/pages/*.test.tsx` /
`src/components/*.test.tsx`), consistent with this codebase's precedent
for this class of page/animation component — `CompletionCelebration.tsx`
follows the same precedent, no new test file. `GameContext.tsx`'s
`claim` signature change is verified by `npx tsc --noEmit` (its one call
site must still type-check) — no existing test file covers
`GameContext.tsx` directly either (confirmed absent). Verified overall
by `npx tsc --noEmit` plus a manual trace: register an item linked to a
master item and confirm points show; register one without a link and
confirm the points line is omitted; register an item that raises dex
completion and confirm the bar/percentages show and animate; tap the
overlay and confirm it navigates home.
