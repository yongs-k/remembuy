# Home Screen Gamification Mockup — Design Spec

Date: 2026-09-15

## Purpose

The user shared a reference screenshot of a richer home screen: a profile
card (name + title badge), a stats row (items recorded, cumulative
savings, points, title progress), a "recommended quest" carousel with a
reward CTA, then the existing search bar and location-ring grid.

None of the underlying systems (points, quests, savings tracking, titles)
exist in this codebase, and building them is explicitly out of scope for
the current Group A plan (`docs/superpowers/plans/2026-09-11-remembuy-group-a.md`,
Global Constraints: "No backend, no AI/photo/link-based input, no
multi-user data ... deferred to Group B/C"). This spec covers a **visual-only
mockup**: the layout and components from the screenshot, populated with
static dummy data. No point accrual, quest progress, or reward logic is
implemented.

## Scope & Placement

- The profile card and quest carousel render **only on the home screen's
  top-level view** (no location selected) — the same level that currently
  shows the location grid (`src/pages/HomePage.tsx`, the
  `!selectedLocationId` branch). The category and product drill-down levels
  are unchanged.
- Screen order (top-level view only): existing `AppLayout` header → new
  `HomeProfileCard` → new "추천 퀘스트" section heading with a "전체보기 →"
  link (link is non-functional, decorative only) → new `QuestCarousel` →
  existing search input → existing location ring grid → existing floating
  "+" record button.
- No new interactivity is wired to real logic: "보상받기" (claim reward),
  the title-badge dropdown caret, and "전체보기" are all visual-only and do
  nothing on click (no `onClick`, or a no-op).
- Exception: "24개 기록 상품" (items recorded) uses real data —
  `items.length` from `useLocker()` — since that count already exists and
  reusing it is strictly less code than inventing a fake number.

## Data

New file `src/data/homeDummy.ts`, following the existing static-dummy-data
pattern already used by `src/data/feedData.ts`:

```ts
export const DUMMY_PROFILE = {
  name: '지음님',
  titleBadge: '🧴 욕실마스터',
}

export const DUMMY_STATS = {
  totalSaved: 32000, // 원, rendered as "₩32,000"
  points: 128,
  titleProgress: { current: 4, total: 8 }, // rendered as "4/8"
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

Two quest entries is enough to make the carousel's swipe/dots
demonstrable without inventing more fake content than the screenshot
calls for (YAGNI — a single quest wouldn't show any carousel behavior at
all).

## Components

### `src/components/HomeProfileCard.tsx` (new)

Props: none (reads `DUMMY_PROFILE`, `DUMMY_STATS` directly, plus takes
`itemCount: number` as a prop for the real item count — kept as a prop
rather than calling `useLocker()` itself, so the component stays a pure
display component testable/reasoned about in isolation).

Renders, matching the screenshot:
- A circular avatar placeholder (initial "나") + `지음님` + title badge chip
  (`🧴 욕실마스터`) with a decorative "▾" caret (non-interactive).
- A 4-column stats row: `{itemCount}개 / 기록 상품`, `₩32,000 / 누적 절약`,
  `128P / 포인트`, `4/8 / 칭호`.

### `src/components/QuestCarousel.tsx` (new)

Props: `quests: DummyQuest[]`.

- Horizontally scrollable row (`overflow-x-auto`, `snap-x snap-mandatory`,
  each card `snap-center` / `snap-start`, `scrollbar-hide` via a small
  inline style or utility class since Tailwind has no built-in
  scrollbar-hide) of quest cards. Each card shows the quest icon, title,
  subtitle, a progress bar (`current/total` filled), the reward
  ("+{rewardPoints}P"), and a "보상받기" button (visually enabled when
  `current >= total`, otherwise visually disabled — no click behavior
  either way, since there's no reward system to call).
- Dot indicators below the row, one per quest, reflecting the currently
  centered card. Implemented with a scroll listener on the row's `ref`
  that computes the active index from `scrollLeft` and card width
  (`Math.round(scrollLeft / cardWidth)`), matching a standard scroll-snap
  carousel pattern — no carousel library, this is straightforward native
  scroll + a few lines of arithmetic.

### `src/pages/HomePage.tsx` (modified)

In the `!selectedLocationId` branch, insert `<HomeProfileCard
itemCount={items.length} />`, the "추천 퀘스트" heading row, and
`<QuestCarousel quests={DUMMY_QUESTS} />` immediately before the existing
search input. No other branch of `HomePage` changes.

## Visual Notes

- Reuse existing design tokens (`bg-card`, `text-ink`, `bg-stamp`, rounded
  corners, existing spacing scale) — no new colors introduced, matching
  the rest of the plan's UI.
- The quest card's progress bar and "보상받기" button reuse the same visual
  language as the reference screenshot (red/stamp-colored fill and
  button) but no new color tokens are added — `bg-stamp` already matches.

## Testing

No automated test is added. `QuestCarousel`'s scroll-driven dot index
can't be meaningfully exercised in jsdom (no real layout/scrollLeft
behavior), and this plan's other visual/page-level components
(`HomePage`, `RankingPage`, `NewItemPage`) are already verified by
`tsc --noEmit` plus a manual trace rather than automated tests. This
follows the same precedent: `npx tsc --noEmit` clean, plus a manual trace
description (open home, confirm profile/stats/quest render, confirm swipe
moves the active dot, confirm dropping into a location still shows the
unchanged category/product drill-down with no profile/quest section).

## Out of Scope (explicitly)

- Real points accrual, quest progress tracking, reward redemption, title/
  badge unlock logic, savings calculation — all deferred, no data model
  changes to `Item`/`Location`/`Category` or `LockerContext`.
- Backend, multi-user, or persistence for any of the dummy data.
