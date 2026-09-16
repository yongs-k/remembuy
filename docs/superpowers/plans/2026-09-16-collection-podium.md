# Collection Podium (1st/2nd/3rd) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user designate one item per category as 1st/2nd/3rd place ("podium"), assigned from `RankingPage`'s existing per-category product list, replacing the current automatic sort-position-based "다시 살래요" badge with the user's actual 1st-place pick.

**Architecture:** One new optional field on `Item` (`podiumRank`), one new reducer action + context method in `LockerContext` that atomically reassigns a rank away from whichever item held it, and three new medal toggle buttons in `RankingPage`'s product-list rendering.

**Tech Stack:** React + TypeScript, Vitest + Testing Library (existing project stack, no new dependencies).

## Global Constraints

- Per-category scope: each of ranks 1/2/3 can be held by at most one item within a given `categoryId` at a time. Assigning a rank to a new item clears it from whichever item previously held it, atomically (single reducer pass, no intermediate double-holder state).
- No backend, no multi-user data, no cross-category or cross-location aggregation — this is purely a per-item field plus a UI to set it.
- The list's existing sort order (`getRankingForCategory`: recommend > notRecommend > unrated) is unchanged. Podium assignment is independent of and layered on top of that sort — never used to reorder the list.
- The "다시 살래요" badge changes from `index === 0` (automatic, sort-position-based) to `item.podiumRank === 1` (explicit, user-assigned). If no item in a category has `podiumRank === 1` yet, no badge shows anywhere in that category's list.
- No automated test for `RankingPage` itself (this branch's established precedent — verified via `tsc --noEmit` + manual trace). The reducer logic in `LockerContext` DOES get automated tests, following that file's existing test pattern.

## File Structure

```
src/
  types.ts                       # Modify: add Item.podiumRank
  state/
    LockerContext.tsx            # Modify: add SET_PODIUM_RANK action + setPodiumRank method
    LockerContext.test.tsx       # Modify: add podium reassignment tests
  pages/
    RankingPage.tsx               # Modify: medal toggle buttons, badge condition change
```

---

### Task 1: `Item.podiumRank` field + `LockerContext` reducer support

**Files:**
- Modify: `src/types.ts`
- Modify: `src/state/LockerContext.tsx`
- Modify: `src/state/LockerContext.test.tsx`

**Interfaces:**
- Produces: `Item.podiumRank?: 1 | 2 | 3`; `LockerContextValue.setPodiumRank: (itemId: string, categoryId: string, rank: 1 | 2 | 3 | null) => void`.

- [ ] **Step 1: Add the field to `src/types.ts`**

Find the `Item` type:

```ts
export type Item = {
  id: string
  name: string
  locationId: string
  categoryId: string
  masterItemId?: string
  note?: string
  recommendation?: 'recommend' | 'notRecommend' // mutually exclusive with daysUntilEmpty
  daysUntilEmpty?: number
  price?: number
  place?: string
  restockCycle?: string | null
  affiliateUrl?: string | null
  createdAt: string
}
```

Add `podiumRank` after `daysUntilEmpty`:

```ts
export type Item = {
  id: string
  name: string
  locationId: string
  categoryId: string
  masterItemId?: string
  note?: string
  recommendation?: 'recommend' | 'notRecommend' // mutually exclusive with daysUntilEmpty
  daysUntilEmpty?: number
  podiumRank?: 1 | 2 | 3 // per-category: at most one item holds each rank at a time
  price?: number
  place?: string
  restockCycle?: string | null
  affiliateUrl?: string | null
  createdAt: string
}
```

- [ ] **Step 2: Write the failing tests in `src/state/LockerContext.test.tsx`**

Add these three tests inside the existing `describe('LockerContext', ...)` block (after the existing tests, using the same `wrapper`/`renderHook`/`act` pattern already in the file):

```tsx
  it('setPodiumRank assigns a rank to an item', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    act(() => {
      result.current.setPodiumRank('seed-1', 'bathroom-skincare', 1)
    })
    const item = result.current.items.find((i) => i.id === 'seed-1')
    expect(item?.podiumRank).toBe(1)
  })

  it('setPodiumRank reassigns a rank away from whichever item held it in the same category', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    act(() => {
      result.current.addItem({
        id: 'podium-test-2',
        name: '테스트 상품 2',
        locationId: 'bathroom',
        categoryId: 'bathroom-skincare',
        createdAt: '2026-09-16',
      })
    })
    act(() => {
      result.current.setPodiumRank('seed-1', 'bathroom-skincare', 1)
    })
    act(() => {
      result.current.setPodiumRank('podium-test-2', 'bathroom-skincare', 1)
    })
    const first = result.current.items.find((i) => i.id === 'seed-1')
    const second = result.current.items.find((i) => i.id === 'podium-test-2')
    expect(first?.podiumRank).toBeUndefined()
    expect(second?.podiumRank).toBe(1)
  })

  it('setPodiumRank with null unassigns the rank', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    act(() => {
      result.current.setPodiumRank('seed-1', 'bathroom-skincare', 1)
    })
    act(() => {
      result.current.setPodiumRank('seed-1', 'bathroom-skincare', null)
    })
    const item = result.current.items.find((i) => i.id === 'seed-1')
    expect(item?.podiumRank).toBeUndefined()
  })
```

Note: `seed-1` (톤업 선크림) is confirmed in `src/data/seedItems.ts` to have `categoryId: 'bathroom-skincare'` — these exact values are correct as written above, no need to re-derive them.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/state/LockerContext.test.tsx`
Expected: FAIL — `setPodiumRank` does not exist on the type returned by `useLocker()` (TypeScript error) or is `undefined` at runtime.

- [ ] **Step 4: Add the reducer action and context method in `src/state/LockerContext.tsx`**

Add to the `Action` union (after `REMOVE_CATEGORY`):

```ts
  | { type: 'SET_PODIUM_RANK'; itemId: string; categoryId: string; rank: 1 | 2 | 3 | null }
```

Add a case to the `reducer` function's `switch` (before `default`):

```ts
    case 'SET_PODIUM_RANK':
      return {
        ...state,
        items: state.items.map((i) => {
          if (i.categoryId !== action.categoryId) return i
          if (i.id === action.itemId) {
            return { ...i, podiumRank: action.rank ?? undefined }
          }
          if (action.rank !== null && i.podiumRank === action.rank) {
            return { ...i, podiumRank: undefined }
          }
          return i
        }),
      }
```

Add `setPodiumRank` to the `LockerContextValue` type:

```ts
  setPodiumRank: (itemId: string, categoryId: string, rank: 1 | 2 | 3 | null) => void
```

Add its implementation in the `value` object inside `LockerProvider` (alongside the other dispatch wrappers):

```ts
    setPodiumRank: (itemId, categoryId, rank) =>
      dispatch({ type: 'SET_PODIUM_RANK', itemId, categoryId, rank }),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/state/LockerContext.test.tsx`
Expected: PASS, all tests in the file green (existing tests plus the 3 new ones).

- [ ] **Step 6: Run the full suite and type-check**

Run: `npx vitest run`
Expected: PASS, existing test count + 3.

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/state/LockerContext.tsx src/state/LockerContext.test.tsx
git commit -m "feat: add Item.podiumRank and setPodiumRank with per-category exclusivity"
```

---

### Task 2: `RankingPage` medal toggle buttons

**Files:**
- Modify: `src/pages/RankingPage.tsx`

**Interfaces:**
- Consumes: `setPodiumRank` (Task 1) from `useLocker()`.

- [ ] **Step 1: Destructure `setPodiumRank` from `useLocker()`**

Change:

```tsx
  const { items, locations, categories } = useLocker()
```

to:

```tsx
  const { items, locations, categories, setPodiumRank } = useLocker()
```

- [ ] **Step 2: Replace the product-list `<li>` rendering**

Find (in the `drill.level === 'products'` branch):

```tsx
        <ol className="space-y-2">
          {ranking.map((item, index) => (
            <li
              key={item.id}
              onClick={() => navigate(`/item/${item.id}`)}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-ink/10 bg-card p-3"
            >
              <span className="w-6 text-center font-heading text-lg">{index + 1}</span>
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                {item.recommendation !== undefined && (
                  <RecommendationBadge recommendation={item.recommendation} />
                )}
              </div>
              {index === 0 && <Badge>다시 살래요</Badge>}
            </li>
          ))}
        </ol>
```

Replace with:

```tsx
        <ol className="space-y-2">
          {ranking.map((item, index) => (
            <li
              key={item.id}
              onClick={() => navigate(`/item/${item.id}`)}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-ink/10 bg-card p-3"
            >
              <span className="w-6 text-center font-heading text-lg">{index + 1}</span>
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                {item.recommendation !== undefined && (
                  <RecommendationBadge recommendation={item.recommendation} />
                )}
              </div>
              <div className="flex gap-1 text-lg">
                {([1, 2, 3] as const).map((rank) => {
                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
                  const isAssigned = item.podiumRank === rank
                  return (
                    <button
                      key={rank}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPodiumRank(item.id, item.categoryId, isAssigned ? null : rank)
                      }}
                      className={isAssigned ? 'opacity-100' : 'opacity-30'}
                      aria-label={`${rank}등으로 지정`}
                    >
                      {medal}
                    </button>
                  )
                })}
              </div>
              {item.podiumRank === 1 && <Badge>다시 살래요</Badge>}
            </li>
          ))}
        </ol>
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 4: Manual verification trace**

With `npm run dev` running, navigate to `/ranking`, drill into `bathroom` → `bathroom-skincare` (or any category with 2+ recorded items — check `src/data/seedItems.ts` for one, adding a second item via `/new` if needed for this trace):
- Each product row shows 🥇🥈🥉 all dim (30% opacity) initially, no "다시 살래요" badge anywhere.
- Clicking 🥇 on the first item brightens it (100% opacity) and shows "다시 살래요" on that row; the other two medals on that row stay dim.
- Clicking 🥇 on a second item in the same category brightens 🥇 there instead, dims it back on the first item, and moves the "다시 살래요" badge to the second item.
- Clicking the now-bright 🥇 on the second item again dims it and removes the "다시 살래요" badge (no item now holds rank 1).
- Clicking any medal does NOT navigate to `/item/:id` (confirm `e.stopPropagation()` is working) — only clicking elsewhere in the row does.
- The list's sort order itself doesn't change when medals are assigned (recommend/notRecommend/unrated ordering from `getRankingForCategory` stays exactly as before).

- [ ] **Step 5: Commit**

```bash
git add src/pages/RankingPage.tsx
git commit -m "feat: assign per-category 1st/2nd/3rd podium from the ranking product list"
```

---

### Task 3: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `npx vitest run`
Expected: all tests pass, count = the branch's prior total + 3 (the new `LockerContext` tests from Task 1).

- [ ] **Step 2: Type-check and build**

Run: `npx tsc --noEmit`
Expected: zero errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual golden-path walkthrough**

Repeat Task 2's manual trace once more end-to-end after both tasks are committed, and additionally confirm:
- Assigning a podium rank persists across a page reload (since `LockerContext` persists to `localStorage` via the existing `useLocalStorage` hook — no new persistence code was needed, confirm the existing mechanism covers the new field for free).
- `ItemDetailPage` and `ItemCard` (which read other `Item` fields) don't error or behave oddly now that items can carry an extra optional `podiumRank` field they don't consume.

- [ ] **Step 4: Commit final state (only if fixes were needed)**

If Steps 1-3 required any fixes, commit them now with a descriptive message. If everything passed as-is, no commit is needed for this task.
