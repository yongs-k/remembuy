# Purchase Tab Mockup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the "공유" (share) tab entirely and replace it, at the same tab-bar slot, with a "구매" (purchase) tab showing three visual-only mockup sections: AI-recommended products, discounts, and group-buy campaigns.

**Architecture:** One new static dummy-data module (`purchaseDummy.ts`) feeding one new page component (`PurchasePage.tsx`), wired in at `/purchase` in place of the deleted `/feed` route; `AppLayout`'s tab list updates in the same slot.

**Tech Stack:** React + TypeScript, Tailwind CSS (existing project stack, no new dependencies).

## Global Constraints

- Visual-only: no real recommendation logic, no real discount data source, no real group-buy participation/backend. The "참여하기" button has no `onClick` — a true no-op, not a fake success message.
- The tab bar/sidebar stays at 5 tabs total — this plan only swaps the content and label/icon of one existing slot (공유 → 구매), it doesn't add or remove a tab.
- `src/pages/FeedPage.tsx` and `src/data/feedData.ts` are deleted outright, not refactored or kept as dead code.
- No changes to `LockerContext`, `Item`/`Location`/`Category` types, or any other existing page.
- No automated test for `PurchasePage.tsx` — this branch's established precedent for page-level components (verified via `tsc --noEmit` + manual trace).
- Discount percentage is computed in the component from `originalPrice`/`discountedPrice` at render time, never stored as a separate field (avoids a value that could drift from the numbers it's derived from).

## File Structure

```
src/
  data/
    purchaseDummy.ts       # Create: DUMMY_RECOMMENDATIONS, DUMMY_DISCOUNTS, DUMMY_GROUP_BUYS
    feedData.ts             # Delete
  pages/
    PurchasePage.tsx        # Create: three-section mockup page
    FeedPage.tsx             # Delete
  components/
    AppLayout.tsx            # Modify: TABS entry 공유→구매, icon 👥→🛒, path /feed→/purchase
  App.tsx                    # Modify: route /feed→/purchase, import FeedPage→PurchasePage
```

---

### Task 1: Dummy data + `PurchasePage` component

**Files:**
- Create: `src/data/purchaseDummy.ts`
- Create: `src/pages/PurchasePage.tsx`

**Interfaces:**
- Produces: `DummyRecommendation`, `DummyDiscount`, `DummyGroupBuy` types and `DUMMY_RECOMMENDATIONS`, `DUMMY_DISCOUNTS`, `DUMMY_GROUP_BUYS` arrays; `PurchasePage` as the default export of `src/pages/PurchasePage.tsx` (matching every other page's default-export convention, e.g. `HomePage`, `RankingPage`).

- [ ] **Step 1: Create `src/data/purchaseDummy.ts`**

```ts
export type DummyRecommendation = {
  id: string
  name: string
  reason: string
  price: number
}

export const DUMMY_RECOMMENDATIONS: DummyRecommendation[] = [
  { id: 'rec-1', name: '샴푸', reason: '지난달 재구매 주기가 다가와요', price: 12000 },
  { id: 'rec-2', name: '주방세제', reason: '자주 함께 기록되는 상품이에요', price: 5000 },
]

export type DummyDiscount = {
  id: string
  name: string
  originalPrice: number
  discountedPrice: number
}

export const DUMMY_DISCOUNTS: DummyDiscount[] = [
  { id: 'disc-1', name: '2겹 화장지 30롤', originalPrice: 25000, discountedPrice: 18000 },
  { id: 'disc-2', name: '섬유유연제 3L', originalPrice: 15000, discountedPrice: 11000 },
]

export type DummyGroupBuy = {
  id: string
  name: string
  currentParticipants: number
  targetParticipants: number
  pricePerPerson: number
}

export const DUMMY_GROUP_BUYS: DummyGroupBuy[] = [
  { id: 'gb-1', name: '고급 세탁세제 대용량', currentParticipants: 7, targetParticipants: 10, pricePerPerson: 9000 },
  { id: 'gb-2', name: '유기농 주방타월 세트', currentParticipants: 3, targetParticipants: 8, pricePerPerson: 6000 },
]
```

- [ ] **Step 2: Create `src/pages/PurchasePage.tsx`**

```tsx
import { DUMMY_RECOMMENDATIONS, DUMMY_DISCOUNTS, DUMMY_GROUP_BUYS } from '../data/purchaseDummy'

export default function PurchasePage() {
  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-bold">구매</h1>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">🤖 AI 추천 상품</h2>
        <div className="space-y-2">
          {DUMMY_RECOMMENDATIONS.map((rec) => (
            <div key={rec.id} className="rounded-lg border border-ink/10 bg-card p-3">
              <p className="font-medium">{rec.name}</p>
              <p className="text-sm text-ink/50">{rec.reason}</p>
              <p className="mt-1 text-sm font-medium text-stamp">{rec.price.toLocaleString()}원</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">🔥 할인 중</h2>
        <div className="space-y-2">
          {DUMMY_DISCOUNTS.map((deal) => {
            const percentOff = Math.round((1 - deal.discountedPrice / deal.originalPrice) * 100)
            return (
              <div key={deal.id} className="rounded-lg border border-ink/10 bg-card p-3">
                <p className="font-medium">{deal.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-ink/40 line-through">
                    {deal.originalPrice.toLocaleString()}원
                  </span>
                  <span className="text-sm font-medium text-stamp">
                    {deal.discountedPrice.toLocaleString()}원
                  </span>
                  <span className="rounded-full bg-stamp px-2 py-0.5 text-xs text-white">
                    {percentOff}% 할인
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">👥 공동구매 진행중</h2>
        <div className="space-y-2">
          {DUMMY_GROUP_BUYS.map((gb) => {
            const percent = Math.round((gb.currentParticipants / gb.targetParticipants) * 100)
            return (
              <div key={gb.id} className="rounded-lg border border-ink/10 bg-card p-3">
                <p className="font-medium">{gb.name}</p>
                <div className="mt-2 h-2 rounded-full bg-paper">
                  <div className="h-2 rounded-full bg-accent" style={{ width: `${percent}%` }} />
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-ink/50">
                    {gb.currentParticipants}/{gb.targetParticipants}명 참여
                  </span>
                  <span className="font-medium">{gb.pricePerPerson.toLocaleString()}원/인</span>
                </div>
                <button
                  type="button"
                  className="mt-2 w-full rounded-lg bg-stamp py-2 text-sm text-white"
                >
                  참여하기
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
```

Note: the `h-2 rounded-full bg-paper` track / `h-2 rounded-full bg-accent` fill progress-bar markup is the same pattern already used in `src/pages/CollectionPage.tsx:118-121` — reused deliberately, not reinvented.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors. (`PurchasePage` isn't routed yet, so this only confirms the two new files are internally well-typed — Task 2 wires routing.)

- [ ] **Step 4: Commit**

```bash
git add src/data/purchaseDummy.ts src/pages/PurchasePage.tsx
git commit -m "feat: add PurchasePage mockup (AI recommendations, discounts, group-buys)"
```

---

### Task 2: Remove the share tab, wire in the purchase tab

**Files:**
- Delete: `src/pages/FeedPage.tsx`
- Delete: `src/data/feedData.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/AppLayout.tsx`

**Interfaces:**
- Consumes: `PurchasePage` (Task 1, default export of `src/pages/PurchasePage.tsx`).

- [ ] **Step 1: Delete the old files**

```bash
rm src/pages/FeedPage.tsx src/data/feedData.ts
```

- [ ] **Step 2: Update `src/App.tsx`**

Change the import line:

```tsx
import FeedPage from './pages/FeedPage'
```

to:

```tsx
import PurchasePage from './pages/PurchasePage'
```

Change the route line:

```tsx
          <Route path="/feed" element={<FeedPage />} />
```

to:

```tsx
          <Route path="/purchase" element={<PurchasePage />} />
```

No other line in this file changes.

- [ ] **Step 3: Update `src/components/AppLayout.tsx`**

In the `TABS` array, change:

```tsx
  { to: '/feed', label: '공유', icon: '👥' },
```

to:

```tsx
  { to: '/purchase', label: '구매', icon: '🛒' },
```

Keep this entry in the same position in the array (3rd of 5) — don't reorder the other tabs.

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors — this also confirms nothing else in the codebase still imports `FeedPage` or `feedData` (a leftover import would now be a compile error).

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: all existing tests still pass (no test file references `FeedPage`/`feedData` — confirm this is true by checking there's no `src/pages/FeedPage.test.tsx` or similar; if one exists, delete it in this same step and note it in the commit).

- [ ] **Step 6: Manual verification trace**

With `npm run dev` running:
- At both a narrow and a wide viewport, confirm the tab bar/sidebar shows "🛒 구매" in the 3rd slot (same position the "👥 공유" tab used to occupy), and the other 4 tabs (홈/랭킹/가족/컬렉션) are unchanged.
- Click into "구매": confirm the three sections render ("🤖 AI 추천 상품" with 2 items, "🔥 할인 중" with 2 items showing correct discount percentages — 18000/25000 → 28% 할인, 11000/15000 → 27% 할인 — and "👥 공동구매 진행중" with 2 progress bars at the correct fill percentages).
- Click "참여하기" on a group-buy card — confirm nothing happens (no navigation, no alert, no state change).
- Navigate directly to `/feed` in the browser URL bar — confirm it's no longer a valid route (renders nothing inside the layout, or whatever this router's fallback behavior is — there's no explicit 404 route in this app, so confirm it simply doesn't match `FeedPage` or crash).

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/components/AppLayout.tsx
git commit -m "feat: replace share tab with purchase tab"
```

(The `rm` from Step 1 should already be staged as part of `git add -u`-style tracking once you `git add` the modified files — if the deletions don't show up in `git status` as staged, add them explicitly: `git add src/pages/FeedPage.tsx src/data/feedData.ts` will stage the deletion.)

---

### Task 3: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `npx vitest run`
Expected: all tests pass, same count as before this plan (no new test files were added — the plan explicitly has no automated test for `PurchasePage`).

- [ ] **Step 2: Type-check and build**

Run: `npx tsc --noEmit`
Expected: zero errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual golden-path walkthrough**

With `npm run dev` running, in a browser:
- Confirm no page anywhere in the app still links to or mentions `/feed` or "공유" (check `AppLayout.tsx`'s tab list is the only place tab labels are defined, and it's already been updated).
- Repeat Task 2's manual trace once more end-to-end.
- Confirm the rest of the app (홈, 랭킹, 가족, 컬렉션, 아이템 상세, 알림) is completely unaffected — this plan only touches the share/purchase tab.

- [ ] **Step 4: Commit final state (only if fixes were needed)**

If Steps 1-3 required any fixes, commit them now with a descriptive message. If everything passed as-is, no commit is needed for this task.
