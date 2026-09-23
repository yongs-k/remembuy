# Collection Game — Sub-project 3: Screens (Box Store, Dex, Home Entry) — Design Spec

Date: 2026-09-23

## Context

Continues the roadmap from `docs/superpowers/specs/2026-09-22-game-core-design.md`
(sub-project 1, merged) and `docs/superpowers/specs/2026-09-22-virtual-items-design.md`
(sub-project 2, merged). Both projects built server + `GameContext` state
(`state.points`, `state.titles`, `boxes`, `dex`, `claim`, `openBox`) with
**no screens** — the app currently claims slots silently on item save
(`NewItemPage`) and shows nothing else about the game anywhere. This project
adds the first screens.

The user also shared a full product PRD, a Stitch-exported `DESIGN.md`
tokens/component doc, a ~35-route frontend router map, and 107 Stitch mockup
screens (`stitch/stitch_remembuy_gamified_purchase_tracker/`). Per standing
project memory, those describe a much larger product (3D house, room-by-room
placement, 10-pull gacha, room-tour social sharing, receipt OCR, family deck,
ecommerce linking, login+welcome bonus). **None of that is in scope here.**
This project renders exactly what the server already supports: one starter
box, one result per open, a flat 14-item dex, and existing points/titles.
Where a mockup is used as visual reference, it is reference for card style,
color, and layout rhythm only — never for content/features the backend
doesn't have (10-pull buttons, daily-free badges, per-space photo galleries,
cozy-score stats, item artwork).

Decisions confirmed with the user:
- Scope: box store + box-open result + dex + a home entry point. No new
  bottom-nav tab (the tab bar is a fixed 5-column grid with no free slot);
  entry is a new home-screen card with two buttons.
- No item artwork exists (`virtual_items.asset_id` is seeded `NULL` for every
  row) — every visual (dex cards, box-open reveal) uses a grade-colored
  background + a Material Symbols icon placeholder, never a photo.
- Follows this project's established mockup-porting convention (see
  `docs/superpowers/plans/2026-09-21-stitch-collection.md`): named Stitch
  screens are visual references to port from, not literal specs to copy
  verbatim.

## Routing

Two new routes, both rendered inside the existing `AppLayout` (tab bar stays
visible, same as `/item/:id` today):

```
/store   -> StorePage   (box list + open action)
/dex     -> DexPage     (virtual item dex, read-only)
```

Added to `src/App.tsx` alongside the existing 8 routes. Neither path collides
with an existing route (`/collection` is the real-item location/category
inventory — a different concept from `/dex`, the virtual item dex — the two
are NOT merged or renamed).

## Home entry point

New component `src/components/HomeGameCard.tsx`, rendered in `HomePage`
between `HomeProfileCard` and the quest carousel (only in the
`!selectedLocationId` branch, same guard as the existing profile card and
quest carousel).

- Reads `useGame()` for `state` (points) and `dex` (for the completed-count
  line).
- Content: a "가상 상자함" header, current points (`state?.points ?? 0`,
  `monetization_on` icon, same tertiary-color token `HomeProfileCard` uses
  for its points stat), a one-line dex summary
  (`${dex.filter(d => d.status === 'COMPLETE').length}/${dex.length} 완성`,
  or `도감을 채워보세요` if `dex.length === 0` — i.e. still loading), and two
  buttons: "상자 열기" (navigates to `/store`) and "도감 보기" (navigates to
  `/dex`). Visual style: tactile card matching `HomeProfileCard`'s rounded-xl
  + offset-shadow container, no new mockup port (this exact card doesn't
  exist in the Stitch set — general `DESIGN.md` tokens only).
- **Known pre-existing inconsistency, explicitly NOT fixed here:**
  `HomeProfileCard`'s own stat grid already shows a "포인트" number and a
  "칭호 도감 current/total" number, but both are sourced from
  `src/data/homeDummy.ts`'s `DUMMY_STATS` (static placeholder data, unrelated
  to `GameContext`). This means the home screen will show two different point
  numbers after this project ships (real, in `HomeGameCard`; fake, in
  `HomeProfileCard`). Rewiring `HomeProfileCard` to real data is a separate,
  pre-existing task outside this project's scope — flagged here so it isn't
  mistaken for a bug introduced by this work.

## `/store` — StorePage

Visual reference: `stitch/.../2/code.html` (선물상자 상점) for the header/
points-badge/card layout and button styling — ported down to what
`getBoxes`/`openBox` actually support (no 10-pull, no daily-free badge, no
probability table link, no "실제 구매 시 자동 증정" banner — none of that
has a backing API).

- On mount, reads `boxes` and `state` from `useGame()` (already loaded by
  `GameContext`; no new fetch needed). If `boxes.length === 0`, shows a
  loading/empty placeholder line ("상자 정보를 불러오는 중...").
- Renders one card per box (currently always exactly one: `box-starter`):
  name, `costPoints` with the same `monetization_on`/tertiary styling used
  elsewhere, and a single "1개 열기" button.
- Button is `disabled` when `(state?.points ?? 0) < box.costPoints`, with a
  small inline label under the button ("포인트가 부족해요") when disabled —
  this covers the "insufficient points" case before the user ever calls the
  API, so the 400 path is a defensive fallback, not the primary UX.
- On click (enabled): sets a local `opening: string | null` (the box id)
  loading state, calls `await game.openBox(boxId)`. `GameContext.openBox`
  already swallows failures into `console.warn` and leaves `state`/`dex`
  unchanged on error — `StorePage` cannot currently distinguish "it failed"
  from "it succeeded with no visible change" by inspecting context alone.
  Fix (small, additive, matches this project's need): change
  `GameContext.openBox` to return the `OpenBoxResult | undefined` it gets
  (or `undefined` on caught failure) instead of returning `void`, so callers
  that need the result (this page) can react, while existing callers that
  ignore the return value are unaffected. `StorePage` uses the returned value
  to open `BoxOpenResultModal` on success, or show an inline
  "상자를 열지 못했어요, 다시 시도해주세요" message on `undefined`.

## Box-open result — `BoxOpenResultModal`

Visual reference: `stitch/.../_19/code.html` (상자 개봉) for the full-bleed
reveal-card layout, grade badge placement, and button dock — the photo
background is replaced with a grade-colored gradient div plus a centered
Material Symbols icon (`redeem` for a fragment result, `military_tech` for a
completed/full item), since there is no item artwork.

Reuses the existing inline-modal pattern already in `HomePage`
(`fixed inset-0 z-50 bg-black/40` backdrop + centered sheet, `onClick`
backdrop-to-close guarded by `stopPropagation` on the card) rather than
introducing a modal library or new primitive.

Props: `{ result: OpenBoxResult; onClose: () => void }` (from
`src/lib/gameApi.ts`'s existing `OpenBoxResult` type — no new type needed).

- Grade badge + `result.result.grade`-colored background. Fixed mapping
  (reuses existing Tailwind color tokens only, spread across the palette's
  three accent hues plus a neutral for COMMON so all four read as visually
  distinct): `COMMON -> surface-container-high` (neutral gray), `ADVANCED ->
  secondary-container` (teal/mint), `RARE -> primary-container` (coral),
  `LEGENDARY -> tertiary-fixed` (gold/amber). Same mapping is reused by
  `DexItemCard` below — defined once, e.g. as a `GRADE_COLOR` record in
  `src/data/materialIcons.tsx` or a new small `src/data/gradeColors.ts`,
  decide at implementation time based on which file it reads more naturally
  from (`materialIcons.tsx` already holds this kind of per-key lookup
  table).
- If `result.result.type === 'FRAGMENT'` and `result.dexEntry.status !==
  'COMPLETE'`: headline "조각을 획득했어요!", body
  `${result.dexEntry.fragmentCount}/${result.dexEntry.fragmentsRequired}`
  progress bar (reuse the same progress-bar visual as `QuestCarousel`'s
  existing bars if present, else a plain `bg-surface-container-low` track +
  filled `bg-primary` div — check `QuestCarousel.tsx` at implementation time
  and reuse rather than re-invent).
- If `result.result.type === 'FULL_ITEM'`, or `type === 'FRAGMENT'` and
  `result.dexEntry.status === 'COMPLETE'` (i.e. this fragment just completed
  it): headline "도감을 완성했어요!" with the completed-item name.
- If `type === 'FRAGMENT'` and `result.dexEntry.status === 'COMPLETE'` was
  ALREADY true before this open (the accumulate-forever case from
  sub-project 2) — the modal cannot distinguish "just completed" from
  "already complete, still accumulating" from the response alone (both show
  `status: 'COMPLETE'`). Simplest correct read: show the same "완성했어요"
  copy either way — a repeat "완성" message on an already-complete item is
  harmless (matches the spec's design intent that a completed item's
  fragments are inconsequential bonus, not an error case) and avoids adding
  client-side state tracking of prior dex status just to distinguish two
  copy strings.
- Footer: "도감으로 이동" (navigates to `/dex`, closes modal) and "닫기"
  (closes modal, stays on `/store`).

## `/dex` — DexPage

Visual reference: `stitch/.../_24/code.html` (장소 컬렉션 도감) for card
tone and grade-color treatment only — the per-space grouping, room photos,
cozy-score stats, and fragment-quest banners in that mockup have no backing
data (`getDex` returns a flat list, no space association) and are not
ported. Grouping here is by `grade`, not by space.

- Reads `dex` from `useGame()` (already loaded). Groups into the 4 fixed
  grades (`COMMON`, `ADVANCED`, `RARE`, `LEGENDARY`, in that display order regardless
  of catalog order) with a small section header per grade and a 2-column
  grid of `DexItemCard` below each.
- `DexItemCard` (`src/components/DexItemCard.tsx`), props
  `{ entry: DexEntry; onOpen: () => void }`:
  - `LOCKED`: grayscale card, `lock` icon, name hidden (shows "???" — the
    item name is not a spoiler-sensitive secret per the spec, but showing a
    name with no way to interact reads as broken; "???" matches the
    Stitch set's own "미획득" convention seen in `_24`'s locked-space card).
  - `COLLECTING`: name shown, grade-colored progress bar
    `fragmentCount/fragmentsRequired`.
  - `COMPLETE`: name shown, grade-colored border/checkmark badge
    (`check_circle` icon), no progress bar.
  - Tapping any non-`LOCKED` card calls `onOpen`.
- Tapping a card opens a bottom-sheet detail (same inline pattern as
  `BoxOpenResultModal`'s backdrop, but anchored to the bottom like
  `HomePage`'s existing record-options sheet) showing name, grade, and
  `fragmentCount/fragmentsRequired` — read-only, no actions (no "합성"/craft
  button — sub-project 2's rules already auto-complete at the fragment
  threshold; there is no separate crafting step to trigger, so no button for
  it exists).

## Component/file structure

```
src/components/HomeGameCard.tsx        # Create
src/components/HomeGameCard.test.tsx   # Create
src/pages/StorePage.tsx                # Create
src/pages/StorePage.test.tsx           # Create
src/components/BoxOpenResultModal.tsx  # Create
src/components/BoxOpenResultModal.test.tsx # Create
src/pages/DexPage.tsx                  # Create
src/pages/DexPage.test.tsx             # Create
src/components/DexItemCard.tsx         # Create
src/components/DexItemCard.test.tsx    # Create
src/state/GameContext.tsx              # Modify: openBox returns OpenBoxResult | undefined
src/state/GameContext.test.tsx         # Modify: assert the new return value
src/pages/HomePage.tsx                 # Modify: render HomeGameCard
src/App.tsx                            # Modify: add /store, /dex routes
```

## Error handling

- `GameContext.openBox`'s existing `console.warn`-and-swallow behavior for
  network/server errors is kept (matches sub-project 2's established
  pattern for `claim`/`refresh`); this project only adds a return value so
  `StorePage` can show its own inline failure message, it does not add
  retry logic, toasts, or a new error-reporting channel.
- `boxes`/`dex` arrays empty (still loading, or the fetch failed and
  `GameContext` swallowed it) is treated identically by both new pages: a
  plain text placeholder line, no spinner component (none exists in this
  codebase yet — introducing one is out of scope; `AnalyzingOverlay` is
  reused nowhere here since it's a full-screen link-analysis-specific
  overlay, not a generic loading state).

## Testing

RTL (`@testing-library/react`) component tests, following this project's
existing pattern (`GameContext.test.tsx`'s `vi.mock('../lib/gameApi')`
style):
- `HomeGameCard`: renders points/dex-complete-count from a mocked
  `useGame()`, both buttons navigate correctly.
- `StorePage`: renders one box; open button disabled when points < cost;
  enabled + calls `game.openBox` and opens the result modal on a
  truthy return; shows the inline failure line on `undefined` return.
- `BoxOpenResultModal`: one test per branch (FRAGMENT-not-complete,
  FRAGMENT-now-complete, FULL_ITEM), footer buttons call the right
  callbacks.
- `DexPage` / `DexItemCard`: all three status renders (LOCKED shows "???"
  and no tap handler firing; COLLECTING shows the fraction; COMPLETE shows
  the badge); grade grouping order is fixed regardless of input order.
- `GameContext.test.tsx`: extend the existing `openBox` test to assert the
  resolved value is the `OpenBoxResult`, and add one asserting `undefined`
  on a rejected `openBoxApi` call.
- Manual: `npx vitest run` (69 tests before this project) and `npx tsc
  --noEmit` clean after every task, matching sub-projects 1-2's convention.

## Out of scope

3D house/room placement, room showroom/ceremony, story export/social
sharing, guest room tour, 10-pull box opening, daily-free box, box
probability-table display, family deck, ecommerce account linking, login/
auth/welcome bonus (explicitly removed per user decision), admin editing of
any game config (sub-project 4), photo-based item recognition, item artwork/
asset pipeline (would unblock replacing the icon placeholders used here),
craft/disassembly actions, wiring `HomeProfileCard`'s pre-existing
`DUMMY_STATS` to real data.
