# Chunky Game-Style Restyle + Tablet-Width Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the whole app with a "chunky & playful" game aesthetic (thick ink-colored borders, offset "pressed" shadows on interactive elements) and cap the overall layout at a tablet width on desktop, with mobile unaffected.

**Architecture:** Three new Tailwind component classes (`chunky-card`, `chunky-btn`, `chunky-input`) defined once in `src/index.css`, plus one `boxShadow` token in `tailwind.config.ts`, then applied across shared components first (maximizes coverage) and each page's remaining ad-hoc markup. A single `md:max-w-[820px] md:mx-auto` on `AppLayout`'s outer frame caps the whole app at tablet width on desktop.

**Tech Stack:** Tailwind CSS (existing project stack, no new dependencies). Zero logic/behavior changes anywhere in this plan — className-only.

## Global Constraints

- No new npm dependencies. No new colors — every new class reuses existing tokens (`ink`, `card`, `stamp`, `accent`, `paper`).
- `chunky-card` = `rounded-2xl border-2 border-ink bg-card shadow-chunky` (static/display use).
- `chunky-btn` = `rounded-xl border-2 border-ink shadow-chunky transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none` (no background/rounded override — compose with per-usage `bg-*`/`rounded-*` utility classes, which win over the component class due to Tailwind's utilities-after-components layer order). Apply to ANY clickable element (`<button>`, or a `<li>`/`<div>` with `onClick`), not just `<button>`.
- `chunky-input` = `rounded-xl border-2 border-ink` (border only, no shadow — a shadowed input reads as a button).
- Small pill-shaped toggles/chips (filter pills, recommendation toggle, progress-mode toggle, ranking medal buttons) keep their existing `rounded-full` shape — do not force them into `chunky-btn`'s `rounded-xl`. Instead add `border-2 border-ink` directly alongside their existing classes (lighter treatment, avoids visual clutter from many small heavy-shadowed pills next to each other).
- This is a styling-only pass: no props, state, event handlers, or data flow change anywhere. Every task's "done" bar is: `tsc --noEmit` clean and the full existing test suite (50 frontend + 8 backend) passing unchanged.
- `AppLayout.tsx`'s outer frame gets `md:mx-auto md:max-w-[820px]` — this caps sidebar+content together at tablet width on desktop; no change to the sidebar-vs-bottom-bar breakpoint logic itself.

## File Structure

```
tailwind.config.ts                    # Modify: add boxShadow.chunky token
src/
  index.css                           # Modify: add .chunky-card/.chunky-btn/.chunky-input
  components/
    AppLayout.tsx                     # Modify: tablet-width cap + chunky nav/header borders
    Badge.tsx                         # No change (already fits the style)
    ItemCard.tsx                      # Modify: chunky-btn
    LocationIcon.tsx                  # Modify: chunky-btn wrapper
    RecommendationBadge.tsx           # No change (plain text, not a card/button)
    RecommendationToggle.tsx          # Modify: border-2 on both pill buttons
    HomeProfileCard.tsx               # Modify: chunky-card
    QuestCarousel.tsx                 # Modify: chunky-card + chunky-btn on reward button
  pages/
    HomePage.tsx                      # Modify: chunky-input, chunky-card grids, chunky-btn buttons/sheet
    PurchasePage.tsx                  # Modify: chunky-card sections, chunky-btn on 참여하기
    RankingPage.tsx                   # Modify: chunky-btn rows, border-2 on medal buttons
    NotificationsPage.tsx             # Modify: chunky-card rows, chunky-btn on 구매하기
    ItemDetailPage.tsx                # Modify: chunky-card image/note blocks, chunky-btn buttons
    NewItemPage.tsx                   # Modify: chunky-input on all fields, chunky-btn on all buttons
    CollectionPage.tsx                # Modify: chunky-btn location tiles, chunky-card category cards
    FamilyPage.tsx                    # Modify: chunky-card member rows, chunky-btn invite button
```

---

### Task 1: Foundation classes + `AppLayout` (tablet width + shell borders)

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/index.css`
- Modify: `src/components/AppLayout.tsx`

**Interfaces:**
- Produces: three CSS classes (`chunky-card`, `chunky-btn`, `chunky-input`) usable by every later task via plain `className` strings — no imports needed, they're global CSS.

- [ ] **Step 1: Add the `boxShadow` token to `tailwind.config.ts`**

Find:

```ts
      fontFamily: {
        heading: ['"Gowun Batang"', 'serif'],
        body: ['"IBM Plex Sans KR"', 'sans-serif'],
      },
    },
  },
  plugins: [],
```

Replace with:

```ts
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
```

- [ ] **Step 2: Add the three component classes to `src/index.css`**

Find:

```css
h1, h2, h3 {
  @apply font-heading;
}
```

Replace with:

```css
h1, h2, h3 {
  @apply font-heading;
}

@layer components {
  .chunky-card {
    @apply rounded-2xl border-2 border-ink bg-card shadow-chunky;
  }
  .chunky-btn {
    @apply rounded-xl border-2 border-ink shadow-chunky transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none;
  }
  .chunky-input {
    @apply rounded-xl border-2 border-ink;
  }
}
```

- [ ] **Step 3: Cap `AppLayout.tsx`'s frame at tablet width and thicken its borders**

Find:

```tsx
  return (
    <div className="flex h-dvh bg-paper text-ink">
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
```

Replace with:

```tsx
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
```

Find:

```tsx
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t border-ink/10 bg-card md:hidden">
```

Replace with:

```tsx
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t-2 border-ink bg-card md:hidden">
```

The bottom-bar `NavLink`s themselves are left unchanged (small icon+label targets — a heavy border/shadow on each of 5 tiny items would look cluttered; the thickened container border above is enough to read as "chunky" at that scale).

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 5: Run the test suite**

Run: `npx vitest run`
Expected: all 50 tests pass unchanged (no test renders `AppLayout`).

- [ ] **Step 6: Manual verification trace**

With `npm run dev` running:
- At a wide desktop width, confirm the whole app (sidebar + content) is now capped at 820px and centered, not stretched edge-to-edge.
- Confirm the active sidebar tab shows a thick ink border + offset shadow; inactive tabs show a transparent border (no layout shift from the border appearing/disappearing, since inactive tabs also reserve the same `border-2` width via `border-transparent`).
- At a narrow mobile width, confirm nothing changed (bottom bar unaffected, no sidebar, full width).

- [ ] **Step 7: Commit**

```bash
git add tailwind.config.ts src/index.css src/components/AppLayout.tsx
git commit -m "feat: add chunky game-style foundation classes, cap app width at tablet size"
```

---

### Task 2: Shared components

**Files:**
- Modify: `src/components/ItemCard.tsx`
- Modify: `src/components/LocationIcon.tsx`
- Modify: `src/components/RecommendationToggle.tsx`
- Modify: `src/components/HomeProfileCard.tsx`
- Modify: `src/components/QuestCarousel.tsx`

**Interfaces:**
- Consumes: `chunky-card`, `chunky-btn` (Task 1, global CSS, no import needed).

- [ ] **Step 1: `src/components/ItemCard.tsx`**

Find:

```tsx
      className="flex w-full items-center gap-3 rounded-lg border border-ink/10 bg-card p-3 text-left shadow-sm"
```

Replace with:

```tsx
      className="chunky-btn flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left"
```

- [ ] **Step 2: `src/components/LocationIcon.tsx`**

Find:

```tsx
      className={`flex flex-col items-center gap-1 ${selected ? 'opacity-100' : 'opacity-80'}`}
```

Replace with:

```tsx
      className={`chunky-btn flex flex-col items-center gap-1 rounded-2xl bg-transparent p-2 shadow-none active:shadow-none ${selected ? 'opacity-100' : 'opacity-80'}`}
```

Note: `shadow-none` on the base state is deliberate — this button has no solid background (it's just an icon+label, not a card), so a permanent offset shadow would look like a floating box around transparent content. Keeping `chunky-btn`'s border+press-transform (for the click feedback) while suppressing its shadow here is the right call; only the ring/emoji inside visually anchors it.

- [ ] **Step 3: `src/components/RecommendationToggle.tsx`**

Find:

```tsx
        className={`flex-1 rounded-lg py-2 text-sm ${
          value === 'recommend' ? 'bg-accent text-white' : 'bg-card text-ink'
        }`}
```

Replace with:

```tsx
        className={`flex-1 rounded-lg border-2 border-ink py-2 text-sm ${
          value === 'recommend' ? 'bg-accent text-white' : 'bg-card text-ink'
        }`}
```

Find:

```tsx
        className={`flex-1 rounded-lg py-2 text-sm ${
          value === 'notRecommend' ? 'bg-stamp text-white' : 'bg-card text-ink'
        }`}
```

Replace with:

```tsx
        className={`flex-1 rounded-lg border-2 border-ink py-2 text-sm ${
          value === 'notRecommend' ? 'bg-stamp text-white' : 'bg-card text-ink'
        }`}
```

- [ ] **Step 4: `src/components/HomeProfileCard.tsx`**

Find:

```tsx
    <div className="space-y-3 rounded-2xl bg-card p-4">
```

Replace with:

```tsx
    <div className="chunky-card space-y-3 p-4">
```

- [ ] **Step 5: `src/components/QuestCarousel.tsx`**

Find:

```tsx
            className="w-full flex-shrink-0 snap-center rounded-2xl border border-stamp/30 bg-card p-4"
```

Replace with:

```tsx
            className="chunky-card w-full flex-shrink-0 snap-center p-4"
```

Find:

```tsx
                className="rounded-full bg-stamp px-4 py-1.5 text-sm text-white disabled:opacity-40"
```

Replace with:

```tsx
                className="rounded-full border-2 border-ink bg-stamp px-4 py-1.5 text-sm text-white disabled:opacity-40"
```

- [ ] **Step 6: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 7: Run the test suite**

Run: `npx vitest run`
Expected: all 50 tests pass unchanged (`ProgressRing.test.tsx` is the only test touching a component in this task's tree, and it tests the SVG ring, not the wrapper touched here).

- [ ] **Step 8: Manual verification trace**

With `npm run dev` running, open the home screen's top-level view:
- Confirm the profile card and quest carousel cards now show thick ink borders and offset shadows.
- Confirm the location ring buttons still look like plain icon+label (no stray shadow/box around them) but show a slight press-shift on click.
- Confirm the recommendation toggle (visible on `/item/:id` for non-urgent items) shows thicker borders on both pill buttons.

- [ ] **Step 9: Commit**

```bash
git add src/components/ItemCard.tsx src/components/LocationIcon.tsx src/components/RecommendationToggle.tsx src/components/HomeProfileCard.tsx src/components/QuestCarousel.tsx
git commit -m "feat: apply chunky style to shared components"
```

---

### Task 3: `HomePage` + `PurchasePage`

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/PurchasePage.tsx`

- [ ] **Step 1: `src/pages/HomePage.tsx` — search inputs (2 occurrences, identical)**

Both the search-results branch and the main branch have this exact input; find each occurrence of:

```tsx
          className="w-full rounded-lg border border-ink/20 bg-card p-2"
```

Replace each with:

```tsx
          className="chunky-input w-full bg-card p-2"
```

(There are two separate `<input type="search" ...>` blocks with this exact className — one in the `searchResults !== null` branch, one in the main return. Update both.)

- [ ] **Step 2: Location grid tiles**

Find:

```tsx
      {!selectedLocationId && (
        <div className="grid grid-cols-3 gap-3">
          {locations.map((location) => (
            <LocationIcon
```

Leave this block's structure as-is (the `LocationIcon` component itself was restyled in Task 2 — no change needed here).

- [ ] **Step 3: Category grid tiles**

Find:

```tsx
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategoryId(category.id)}
                className="rounded-lg border border-ink/10 bg-card p-3 text-left"
              >
```

Replace with:

```tsx
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategoryId(category.id)}
                className="chunky-btn rounded-2xl bg-card p-3 text-left"
              >
```

- [ ] **Step 4: Filter pills (전체/임박만/추천한 상품만)**

Find each of the three filter buttons, e.g.:

```tsx
              className={`rounded-full px-3 py-1 text-sm ${
                filter === 'all' ? 'bg-stamp text-white' : 'bg-card text-ink'
              }`}
```

Add `border-2 border-ink` to each of the three (all/urgent/recommended) — replace with:

```tsx
              className={`rounded-full border-2 border-ink px-3 py-1 text-sm ${
                filter === 'all' ? 'bg-stamp text-white' : 'bg-card text-ink'
              }`}
```

(and the same pattern for the `urgent`/`recommended` variants — three occurrences total, each with the matching `filter === '...'` check unchanged, only the leading `rounded-full` becomes `rounded-full border-2 border-ink`).

- [ ] **Step 5: Floating record button**

Find:

```tsx
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-stamp text-2xl text-white shadow-lg md:bottom-8"
```

Replace with:

```tsx
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-stamp text-2xl text-white shadow-chunky active:translate-x-1 active:translate-y-1 active:shadow-none md:bottom-8"
```

- [ ] **Step 6: Record-sheet buttons (4 option buttons)**

Each of the four sheet options shares this className, e.g.:

```tsx
                  className="flex w-full items-center gap-3 rounded-lg border border-ink/10 p-3 text-left"
```

Replace all four occurrences (카메라로 촬영 / 사진 선택 / 링크로 가져오기 / 직접 입력) with:

```tsx
                  className="chunky-btn flex w-full items-center gap-3 rounded-xl p-3 text-left"
```

- [ ] **Step 7: Link-input view's URL input and 분석하기 button**

Find:

```tsx
                  className="w-full rounded-lg border border-ink/20 bg-paper p-2 text-sm"
```

Replace with:

```tsx
                  className="chunky-input w-full bg-paper p-2 text-sm"
```

Find:

```tsx
                  className="w-full rounded-lg bg-stamp py-2 text-sm text-white disabled:opacity-40"
```

Replace with:

```tsx
                  className="chunky-btn w-full rounded-xl bg-stamp py-2 text-sm text-white disabled:opacity-40 disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-chunky"
```

(The `disabled:active:*` overrides prevent the pressed-look from triggering on a disabled button, which can't really be "pressed" anyway but browsers still apply `:active` styles to disabled elements in some cases — belt-and-suspenders, matches this button's existing `disabled:opacity-40`.)

- [ ] **Step 8: `src/pages/PurchasePage.tsx` — all three card sections**

Find (occurs 3 times, once per section — recommendation cards, discount cards, group-buy cards):

```tsx
            <div key={rec.id} className="rounded-lg border border-ink/10 bg-card p-3">
```

```tsx
              <div key={deal.id} className="rounded-lg border border-ink/10 bg-card p-3">
```

```tsx
              <div key={gb.id} className="rounded-lg border border-ink/10 bg-card p-3">
```

Replace each with the `chunky-card` equivalent (keep the unique `key` prop and variable name per block):

```tsx
            <div key={rec.id} className="chunky-card p-3">
```

```tsx
              <div key={deal.id} className="chunky-card p-3">
```

```tsx
              <div key={gb.id} className="chunky-card p-3">
```

- [ ] **Step 9: PurchasePage's discount badge and 참여하기 button**

Find:

```tsx
                  <span className="rounded-full bg-stamp px-2 py-0.5 text-xs text-white">
```

Replace with:

```tsx
                  <span className="rounded-full border-2 border-ink bg-stamp px-2 py-0.5 text-xs text-white">
```

Find:

```tsx
                <button
                  type="button"
                  className="mt-2 w-full rounded-lg bg-stamp py-2 text-sm text-white"
                >
```

Replace with:

```tsx
                <button
                  type="button"
                  className="chunky-btn mt-2 w-full rounded-xl bg-stamp py-2 text-sm text-white"
                >
```

- [ ] **Step 10: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 11: Run the test suite**

Run: `npx vitest run`
Expected: all 50 tests pass unchanged.

- [ ] **Step 12: Manual verification trace**

With `npm run dev` running:
- Home screen: search bar has a thick border, location grid unchanged visually (icons only), category tiles and filter pills show thick borders, floating "+" button shows the offset shadow and presses down on click, the record sheet's 4 options and the link-input sub-view all show the chunky treatment.
- Purchase tab: all three sections' cards show thick borders + offset shadows, the discount badge has a border, "참여하기" shows the press effect.

- [ ] **Step 13: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/PurchasePage.tsx
git commit -m "feat: apply chunky style to HomePage and PurchasePage"
```

---

### Task 4: `RankingPage` + `NotificationsPage` + `ItemDetailPage`

**Files:**
- Modify: `src/pages/RankingPage.tsx`
- Modify: `src/pages/NotificationsPage.tsx`
- Modify: `src/pages/ItemDetailPage.tsx`

- [ ] **Step 1: `src/pages/RankingPage.tsx` — all three drill-level list rows**

Find (locations level):

```tsx
              className="flex cursor-pointer items-center justify-between rounded-lg border border-ink/10 bg-card p-3"
```

This exact className string appears twice (locations-level `<li>` and categories-level `<li>`) and a near-identical one for the products-level `<li>` (which additionally has `gap-3` instead of `justify-between`):

```tsx
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-ink/10 bg-card p-3"
```

Replace the first two (locations, categories) with:

```tsx
              className="chunky-btn flex cursor-pointer items-center justify-between rounded-2xl bg-card p-3"
```

Replace the third (products-level) with:

```tsx
              className="chunky-btn flex cursor-pointer items-center gap-3 rounded-2xl bg-card p-3"
```

- [ ] **Step 2: Ranking medal buttons**

Find:

```tsx
                      className={isAssigned ? 'opacity-100' : 'opacity-30'}
```

Replace with:

```tsx
                      className={`rounded-full border-2 border-ink ${isAssigned ? 'opacity-100' : 'opacity-30'}`}
```

(The medal is a bare emoji with no background today; adding a thin ink ring around each gives it a "coin/token" feel consistent with the chunky direction without changing its size meaningfully — the border is subtle since the button has no padding/background here, matching the emoji's own bounding box.)

- [ ] **Step 3: Global ranking section — no change needed**

The `🌍 전체 유저 인기 랭킹` list items (`<li className="flex items-center justify-between text-sm">`) are plain text rows, not cards — leave unchanged (adding a chunky card per row here would be visually heavier than this secondary, informational list warrants).

- [ ] **Step 4: `src/pages/NotificationsPage.tsx`**

Find:

```tsx
            <li key={item.id} className="rounded-lg border border-ink/10 bg-card p-3">
```

Replace with:

```tsx
            <li key={item.id} className="chunky-card p-3">
```

Find:

```tsx
                  <a
                    href={item.affiliateUrl}
                    className="ml-auto rounded-full bg-stamp px-3 py-1 text-sm text-white"
                  >
```

Replace with:

```tsx
                  <a
                    href={item.affiliateUrl}
                    className="chunky-btn ml-auto rounded-full bg-stamp px-3 py-1 text-sm text-white"
                  >
```

Find:

```tsx
                  <button
                    type="button"
                    disabled
                    className="ml-auto rounded-full bg-ink/10 px-3 py-1 text-sm text-ink/40"
                  >
```

Replace with:

```tsx
                  <button
                    type="button"
                    disabled
                    className="ml-auto rounded-full border-2 border-ink/20 bg-ink/10 px-3 py-1 text-sm text-ink/40"
                  >
```

(The disabled variant uses `border-ink/20` — a faint border, not full-strength `border-ink` — so a disabled/unavailable action visually reads as muted, not just its text/background.)

- [ ] **Step 5: `src/pages/ItemDetailPage.tsx`**

Find:

```tsx
      <div className="flex h-40 items-center justify-center rounded-lg bg-card text-5xl">
```

Replace with:

```tsx
      <div className="chunky-card flex h-40 items-center justify-center text-5xl">
```

Find:

```tsx
      {item.note && <p className="rounded-lg bg-card p-3 text-sm">{item.note}</p>}
```

Replace with:

```tsx
      {item.note && <p className="chunky-card p-3 text-sm">{item.note}</p>}
```

Find:

```tsx
          <a
            href={item.affiliateUrl}
            className="flex-1 rounded-lg bg-stamp py-2 text-center text-white"
          >
            구매하기
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="flex-1 rounded-lg bg-ink/10 py-2 text-center text-ink/40"
          >
            구매 링크 없음
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate(`/new?editId=${item.id}`)}
          className="flex-1 rounded-lg border border-ink/20 py-2 text-center"
        >
          메모 수정하기
        </button>
```

Replace with:

```tsx
          <a
            href={item.affiliateUrl}
            className="chunky-btn flex-1 rounded-xl bg-stamp py-2 text-center text-white"
          >
            구매하기
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="flex-1 rounded-xl border-2 border-ink/20 bg-ink/10 py-2 text-center text-ink/40"
          >
            구매 링크 없음
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate(`/new?editId=${item.id}`)}
          className="chunky-btn flex-1 rounded-xl bg-card py-2 text-center"
        >
          메모 수정하기
        </button>
```

- [ ] **Step 6: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 7: Run the test suite**

Run: `npx vitest run`
Expected: all 50 tests pass unchanged.

- [ ] **Step 8: Manual verification trace**

With `npm run dev` running:
- `/ranking`: drill through all three levels, confirm every row shows a thick border + offset shadow and a press effect on click; medal buttons show a thin ring.
- `/notifications`: confirm rows are chunky cards, 구매하기/구매 링크 없음 show the button treatment.
- Open an item's detail page: confirm the image placeholder, note block, and action buttons all show the chunky treatment.

- [ ] **Step 9: Commit**

```bash
git add src/pages/RankingPage.tsx src/pages/NotificationsPage.tsx src/pages/ItemDetailPage.tsx
git commit -m "feat: apply chunky style to RankingPage, NotificationsPage, ItemDetailPage"
```

---

### Task 5: `NewItemPage` + `CollectionPage` + `FamilyPage`

**Files:**
- Modify: `src/pages/NewItemPage.tsx`
- Modify: `src/pages/CollectionPage.tsx`
- Modify: `src/pages/FamilyPage.tsx`

- [ ] **Step 1: `src/pages/NewItemPage.tsx` — every text/number/url input, select, and textarea**

This file has the same className repeated on every field:

```tsx
          className="mt-1 w-full rounded-lg border border-ink/20 bg-card p-2"
```

This exact string appears on: 이름 input, 장소 select, 카테고리 select, 표준 품목 select, 구매처 input, 가격 input, 구매 링크 input, 재구매 주기 input, and the 메모 textarea (9 occurrences). Replace ALL of them with:

```tsx
          className="chunky-input mt-1 w-full bg-card p-2"
```

- [ ] **Step 2: The two "새 장소/카테고리 이름" inline inputs**

Find (occurs twice, once for location once for category — identical className):

```tsx
          className="flex-1 rounded-lg border border-ink/20 bg-card p-2 text-sm"
```

Replace both with:

```tsx
          className="chunky-input flex-1 bg-card p-2 text-sm"
```

- [ ] **Step 3: The two "장소 추가"/"카테고리 추가" buttons**

Find (occurs twice, identical className):

```tsx
          className="rounded-lg border border-ink/20 px-3 text-sm"
```

Replace both with:

```tsx
          className="chunky-btn rounded-xl bg-card px-3 text-sm"
```

- [ ] **Step 4: The 추천/비추천 vs 소진까지 D-day progress-mode toggle buttons**

Find (two buttons, `recommendation`/`daysUntilEmpty` variants):

```tsx
          className={`flex-1 rounded-lg py-2 text-sm ${
            progressMode === 'recommendation' ? 'bg-stamp text-white' : 'bg-card text-ink'
          }`}
```

```tsx
          className={`flex-1 rounded-lg py-2 text-sm ${
            progressMode === 'daysUntilEmpty' ? 'bg-stamp text-white' : 'bg-card text-ink'
          }`}
```

Replace each with the `border-2 border-ink` addition (same pattern as Task 3's HomePage filter pills):

```tsx
          className={`flex-1 rounded-lg border-2 border-ink py-2 text-sm ${
            progressMode === 'recommendation' ? 'bg-stamp text-white' : 'bg-card text-ink'
          }`}
```

```tsx
          className={`flex-1 rounded-lg border-2 border-ink py-2 text-sm ${
            progressMode === 'daysUntilEmpty' ? 'bg-stamp text-white' : 'bg-card text-ink'
          }`}
```

- [ ] **Step 5: The 저장하기 submit button**

Find:

```tsx
      <button type="submit" className="w-full rounded-lg bg-stamp py-2 text-white">
```

Replace with:

```tsx
      <button type="submit" className="chunky-btn w-full rounded-xl bg-stamp py-2 text-white">
```

- [ ] **Step 6: `src/pages/CollectionPage.tsx` — location ring tile and category cards**

Find:

```tsx
                className={`flex flex-col items-center gap-1 rounded-lg p-2 ${
                  activeLocationId === location.id ? 'bg-card' : ''
                }`}
```

Replace with:

```tsx
                className={`chunky-btn flex flex-col items-center gap-1 rounded-2xl p-2 shadow-none active:shadow-none ${
                  activeLocationId === location.id ? 'bg-card shadow-chunky active:shadow-none' : 'bg-transparent'
                }`}
```

(Same reasoning as `LocationIcon` in Task 2: only show the border/shadow treatment when this tile is the active/selected one, since the inactive state has no background and a permanent shadow would look like a floating box around nothing. The `active:shadow-none` override on both branches keeps the press-down feel consistent whether or not the tile currently shows a shadow.)

Find:

```tsx
            <div key={category.id} className="rounded-lg border border-ink/10 bg-card p-3">
```

Replace with:

```tsx
            <div key={category.id} className="chunky-card p-3">
```

- [ ] **Step 7: `src/pages/FamilyPage.tsx`**

Find:

```tsx
          <li key={member.id} className="rounded-lg border border-ink/10 bg-card p-3">
```

Replace with:

```tsx
          <li key={member.id} className="chunky-card p-3">
```

Find:

```tsx
        className="w-full rounded-lg bg-stamp py-2 text-white"
```

Replace with:

```tsx
        className="chunky-btn w-full rounded-xl bg-stamp py-2 text-white"
```

- [ ] **Step 8: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 9: Run the test suite**

Run: `npx vitest run`
Expected: all 50 tests pass unchanged.

- [ ] **Step 10: Manual verification trace**

With `npm run dev` running:
- `/new`: every field shows a thick ink border, every button (장소/카테고리 추가, progress-mode toggle, 저장하기) shows the chunky treatment; submitting still works exactly as before (create and edit both — this is a pure style pass, confirm no functional regression by actually saving an item).
- `/collection`: confirm only the currently-selected location tile shows a card-like shadow, others stay borderless icon+label; category cards show the chunky treatment.
- `/family`: confirm member cards and the invite button show the chunky treatment.

- [ ] **Step 11: Commit**

```bash
git add src/pages/NewItemPage.tsx src/pages/CollectionPage.tsx src/pages/FamilyPage.tsx
git commit -m "feat: apply chunky style to NewItemPage, CollectionPage, FamilyPage"
```

---

### Task 6: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full frontend automated test suite**

Run: `npx vitest run`
Expected: all 50 tests pass, unchanged count (this plan added zero test files — pure styling).

- [ ] **Step 2: Run the backend test suite**

Run: `npm run test:server`
Expected: all 8 tests pass (unaffected — this plan touches no `server/` files).

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit`
Expected: zero errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual golden-path walkthrough**

With `npm run dev` (and `npm run dev:server` if exercising the link-analysis or podium-ranking flows) running, at BOTH a mobile width and a wide desktop width:
- Click through every tab (홈/랭킹/구매/가족/컬렉션) and confirm every card/button/input across the whole app shows the consistent chunky treatment (thick ink borders, offset shadows on interactive elements, press-down feedback on click) with no visual inconsistency between pages.
- Confirm the desktop-width app frame is capped at tablet size (820px) and centered, not stretched.
- Confirm mobile width is completely unaffected in layout/breakpoint behavior (only the visual style — borders/shadows — changed, not the responsive structure).
- Confirm no interactive element lost its click handler or navigation — this was a styling-only pass, so every button/link/input must still function exactly as before (create/edit an item, toggle a filter, assign a podium medal, open the record sheet, etc.).

- [ ] **Step 5: Commit final state (only if fixes were needed)**

If Steps 1-4 required any fixes, commit them now with a descriptive message. If everything passed as-is, no commit is needed for this task.
