# Global Podium Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user completes a category's podium (1st/2nd/3rd all assigned), auto-submit it to a small new backend, and show an aggregated "전체 유저 인기 랭킹" (global popularity ranking) for that category inside `RankingPage`'s existing product-list view.

**Architecture:** A pure `getCompletedPodium` selector detects completion client-side; a `deviceId` (random UUID in localStorage) identifies the anonymous submitter; a small standalone Node HTTP server (no framework, no DB — a JSON file) stores submissions and serves a Borda-count aggregation; `RankingPage` submits on completion and fetches/renders the aggregate.

**Tech Stack:** React + TypeScript + Vite + Tailwind (frontend, existing stack); plain Node.js `http`/`fs` modules + Node's built-in `node:test` runner (backend — no new dependencies at all, frontend or backend).

## Global Constraints

- No login/accounts — identity is a random `crypto.randomUUID()` persisted in `localStorage['remembuy:deviceId']`, generated once and reused.
- Auto-submit only: the moment `setPodiumRank` results in all three ranks (1/2/3) being assigned within a category, that category's podium is POSTed to the backend automatically. No user-facing "share" action.
- Aggregation key: `masterItemId` when an item has one (this app's seeded master items use fixed ids shared across every install — see `src/data/locations.ts` — so this alone produces correct cross-user matching with no fuzzy logic); otherwise the trimmed, lowercased `name`.
- Scoring: Borda count — rank 1 = 3 points, rank 2 = 2 points, rank 3 = 1 point, summed across all submitters; top 3 groups by score returned.
- A user re-submitting (changing their podium later) REPLACES their own prior submission for that category — never accumulates duplicate rows for the same `(deviceId, categoryId)`.
- No new npm dependencies, frontend or backend. Storage is a single git-ignored JSON file (`server/data/podiums.json`), not a database.
- No automated test for `RankingPage`'s fetch/submit wiring or the server's HTTP layer — consistent with this branch's precedent of verifying page-level/glue code via manual trace. The pure logic (`getCompletedPodium`, the server's aggregation function) DOES get automated tests.
- This plan does not implement any account/login/migration system — `deviceId` is designed to make that possible later, not to build it now.

## File Structure

```
src/
  lib/
    deviceId.ts                  # Create: getDeviceId() — random UUID persisted in localStorage
  state/
    selectors.ts                  # Modify: add getCompletedPodium
    selectors.test.ts             # Modify: add getCompletedPodium tests
  pages/
    RankingPage.tsx               # Modify: submit-on-complete + fetch/render global ranking
server/
  podium.js                       # Create: upsert/read submissions (JSON file) + aggregateRanking (pure)
  podium.test.mjs                 # Create: node:test tests for aggregateRanking
  index.js                        # Create: HTTP server wiring the two endpoints
  data/                           # Create (git-ignored): podiums.json written at runtime
vite.config.ts                    # Modify: add /api dev proxy to the Node server
package.json                      # Modify: add dev:server and test:server scripts
.gitignore                        # Modify: ignore server/data/
```

---

### Task 1: `getCompletedPodium` selector

**Files:**
- Modify: `src/state/selectors.ts`
- Modify: `src/state/selectors.test.ts`

**Interfaces:**
- Produces: `getCompletedPodium(items: Item[], categoryId: string): { rank: 1 | 2 | 3; item: Item }[] | null`

- [ ] **Step 1: Write the failing tests in `src/state/selectors.test.ts`**

Add `getCompletedPodium` to the existing import from `./selectors`:

```ts
import {
  getCategoryCompletion,
  getLocationCompletion,
  getMissingMasterItems,
  getRankingForCategory,
  getUpcomingNotifications,
  getLocationsRankedByItemCount,
  getCategoriesRankedByItemCount,
  getCompletedPodium,
} from './selectors'
```

Add these tests (using this file's existing `Item`-literal style — build minimal `Item` objects inline):

```ts
describe('getCompletedPodium', () => {
  const baseItem = (overrides: Partial<Item>): Item => ({
    id: 'x',
    name: '테스트',
    locationId: 'loc-1',
    categoryId: 'cat-1',
    createdAt: '2026-09-16',
    ...overrides,
  })

  it('returns null when no ranks are assigned', () => {
    const items = [baseItem({ id: 'a' }), baseItem({ id: 'b' })]
    expect(getCompletedPodium(items, 'cat-1')).toBeNull()
  })

  it('returns null when only some ranks are assigned', () => {
    const items = [
      baseItem({ id: 'a', podiumRank: 1 }),
      baseItem({ id: 'b', podiumRank: 2 }),
      baseItem({ id: 'c' }),
    ]
    expect(getCompletedPodium(items, 'cat-1')).toBeNull()
  })

  it('returns the three entries sorted by rank when the podium is complete', () => {
    const items = [
      baseItem({ id: 'a', podiumRank: 2 }),
      baseItem({ id: 'b', podiumRank: 1 }),
      baseItem({ id: 'c', podiumRank: 3 }),
      baseItem({ id: 'd', categoryId: 'other-cat', podiumRank: 1 }),
    ]
    const result = getCompletedPodium(items, 'cat-1')
    expect(result).not.toBeNull()
    expect(result?.map((e) => e.rank)).toEqual([1, 2, 3])
    expect(result?.map((e) => e.item.id)).toEqual(['b', 'a', 'c'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/state/selectors.test.ts`
Expected: FAIL — `getCompletedPodium` is not exported from `./selectors`.

- [ ] **Step 3: Implement `getCompletedPodium` in `src/state/selectors.ts`**

Add at the end of the file:

```ts
export function getCompletedPodium(
  items: Item[],
  categoryId: string
): { rank: 1 | 2 | 3; item: Item }[] | null {
  const categoryItems = items.filter((i) => i.categoryId === categoryId)
  const entries: { rank: 1 | 2 | 3; item: Item }[] = []
  for (const rank of [1, 2, 3] as const) {
    const item = categoryItems.find((i) => i.podiumRank === rank)
    if (!item) return null
    entries.push({ rank, item })
  }
  return entries
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/state/selectors.test.ts`
Expected: PASS, all tests in the file green.

- [ ] **Step 5: Commit**

```bash
git add src/state/selectors.ts src/state/selectors.test.ts
git commit -m "feat: add getCompletedPodium selector for per-category podium completion"
```

---

### Task 2: `deviceId` utility

**Files:**
- Create: `src/lib/deviceId.ts`

**Interfaces:**
- Produces: `getDeviceId(): string`

- [ ] **Step 1: Create `src/lib/deviceId.ts`**

```ts
const DEVICE_ID_KEY = 'remembuy:deviceId'

export function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem(DEVICE_ID_KEY, id)
  return id
}
```

No automated test for this file — it's a trivial one-liner wrapper around `localStorage`/`crypto.randomUUID()`, both of which are browser/jsdom built-ins with no logic of this project's own to verify.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/deviceId.ts
git commit -m "feat: add getDeviceId anonymous-identity helper"
```

---

### Task 3: Backend server

**Files:**
- Create: `server/podium.js`
- Create: `server/podium.test.mjs`
- Create: `server/index.js`
- Modify: `vite.config.ts`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces (from `server/podium.js`, ESM exports): `readSubmissions(): Promise<Submission[]>`, `writeSubmissions(submissions: Submission[]): Promise<void>`, `upsertSubmission(deviceId: string, categoryId: string, items: SubmissionItem[]): Promise<void>`, `aggregateRanking(submissions: Submission[], categoryId: string): RankingEntry[]`, where:
  - `type SubmissionItem = { rank: 1 | 2 | 3; masterItemId: string | null; name: string }`
  - `type Submission = { deviceId: string; categoryId: string; items: SubmissionItem[] }`
  - `type RankingEntry = { name: string; masterItemId: string | null; score: number; voters: number }`
  - (This is a plain JS server — these are documented shapes, not TypeScript types, since `server/` is not part of the Vite/TS build.)

- [ ] **Step 1: Create `server/podium.js`**

```js
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, 'data', 'podiums.json')

export async function readSubmissions() {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export async function writeSubmissions(submissions) {
  await mkdir(path.dirname(DATA_FILE), { recursive: true })
  await writeFile(DATA_FILE, JSON.stringify(submissions, null, 2))
}

export async function upsertSubmission(deviceId, categoryId, items) {
  const submissions = await readSubmissions()
  const filtered = submissions.filter(
    (s) => !(s.deviceId === deviceId && s.categoryId === categoryId)
  )
  filtered.push({ deviceId, categoryId, items })
  await writeSubmissions(filtered)
}

const RANK_SCORE = { 1: 3, 2: 2, 3: 1 }

export function aggregateRanking(submissions, categoryId) {
  const scoreByKey = new Map()
  for (const submission of submissions) {
    if (submission.categoryId !== categoryId) continue
    for (const entry of submission.items) {
      const key = entry.masterItemId ?? entry.name.trim().toLowerCase()
      const current = scoreByKey.get(key) ?? {
        name: entry.name,
        masterItemId: entry.masterItemId,
        score: 0,
        voters: 0,
      }
      current.score += RANK_SCORE[entry.rank] ?? 0
      current.voters += 1
      scoreByKey.set(key, current)
    }
  }
  return Array.from(scoreByKey.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}
```

- [ ] **Step 2: Create `server/podium.test.mjs`**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { aggregateRanking } from './podium.js'

test('aggregateRanking scores rank 1/2/3 as 3/2/1 points and sorts by score descending', () => {
  const submissions = [
    {
      deviceId: 'a',
      categoryId: 'cat-1',
      items: [
        { rank: 1, masterItemId: 'm1', name: 'A' },
        { rank: 2, masterItemId: 'm2', name: 'B' },
        { rank: 3, masterItemId: 'm3', name: 'C' },
      ],
    },
    {
      deviceId: 'b',
      categoryId: 'cat-1',
      items: [
        { rank: 1, masterItemId: 'm2', name: 'B' },
        { rank: 2, masterItemId: 'm1', name: 'A' },
        { rank: 3, masterItemId: 'm3', name: 'C' },
      ],
    },
  ]
  const ranking = aggregateRanking(submissions, 'cat-1')
  assert.equal(ranking.length, 3)
  // A: 3+2=5, B: 2+3=5, C: 1+1=2
  const byId = Object.fromEntries(ranking.map((r) => [r.masterItemId, r.score]))
  assert.equal(byId.m1, 5)
  assert.equal(byId.m2, 5)
  assert.equal(byId.m3, 2)
  assert.equal(ranking[2].masterItemId, 'm3')
})

test('aggregateRanking groups items without masterItemId by normalized name', () => {
  const submissions = [
    { deviceId: 'a', categoryId: 'cat-2', items: [{ rank: 1, masterItemId: null, name: 'Custom Item' }] },
    { deviceId: 'b', categoryId: 'cat-2', items: [{ rank: 1, masterItemId: null, name: 'custom item' }] },
  ]
  const ranking = aggregateRanking(submissions, 'cat-2')
  assert.equal(ranking.length, 1)
  assert.equal(ranking[0].score, 6)
  assert.equal(ranking[0].voters, 2)
})

test('aggregateRanking ignores submissions for other categories', () => {
  const submissions = [
    { deviceId: 'a', categoryId: 'other', items: [{ rank: 1, masterItemId: 'm1', name: 'A' }] },
  ]
  const ranking = aggregateRanking(submissions, 'cat-3')
  assert.equal(ranking.length, 0)
})

test('aggregateRanking returns at most 3 entries even with more distinct items', () => {
  const submissions = [
    {
      deviceId: 'a',
      categoryId: 'cat-4',
      items: [
        { rank: 1, masterItemId: 'm1', name: 'A' },
        { rank: 2, masterItemId: 'm2', name: 'B' },
        { rank: 3, masterItemId: 'm3', name: 'C' },
      ],
    },
    {
      deviceId: 'b',
      categoryId: 'cat-4',
      items: [
        { rank: 1, masterItemId: 'm4', name: 'D' },
        { rank: 2, masterItemId: 'm5', name: 'E' },
        { rank: 3, masterItemId: 'm6', name: 'F' },
      ],
    },
  ]
  const ranking = aggregateRanking(submissions, 'cat-4')
  assert.equal(ranking.length, 3)
})
```

- [ ] **Step 3: Run the server tests**

Run: `node --test server/`
Expected: PASS, all 4 tests green.

- [ ] **Step 4: Create `server/index.js`**

```js
import { createServer } from 'node:http'
import { upsertSubmission, readSubmissions, aggregateRanking } from './podium.js'

const PORT = 8787

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/podium-submissions') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', async () => {
      try {
        const { deviceId, categoryId, items } = JSON.parse(body)
        if (!deviceId || !categoryId || !Array.isArray(items)) {
          sendJson(res, 400, { error: 'invalid payload' })
          return
        }
        await upsertSubmission(deviceId, categoryId, items)
        res.writeHead(204)
        res.end()
      } catch {
        sendJson(res, 500, { error: 'server error' })
      }
    })
    return
  }

  if (req.method === 'GET' && req.url?.startsWith('/api/podium-rankings/')) {
    const categoryId = decodeURIComponent(req.url.replace('/api/podium-rankings/', ''))
    readSubmissions()
      .then((submissions) => {
        const ranking = aggregateRanking(submissions, categoryId)
        sendJson(res, 200, { categoryId, ranking })
      })
      .catch(() => sendJson(res, 500, { error: 'server error' }))
    return
  }

  sendJson(res, 404, { error: 'not found' })
})

server.listen(PORT, () => {
  console.log(`podium server listening on http://localhost:${PORT}`)
})
```

- [ ] **Step 5: Wire the Vite dev proxy**

In `vite.config.ts`, change:

```ts
  server: {
    port: 7777,
    strictPort: true,
  },
```

to:

```ts
  server: {
    port: 7777,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
```

- [ ] **Step 6: Add scripts to `package.json`**

In the `"scripts"` object, add two entries (alongside the existing `dev`/`build`/`preview`/`test`/`test:watch`):

```json
    "dev:server": "node server/index.js",
    "test:server": "node --test server/"
```

- [ ] **Step 7: Ignore the runtime data file**

Add to `.gitignore`:

```
server/data/
```

- [ ] **Step 8: Manual verification trace**

Run `npm run dev:server` in one terminal. In another terminal:

```bash
curl -X POST http://localhost:8787/api/podium-submissions \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device","categoryId":"bathroom-skincare","items":[{"rank":1,"masterItemId":"bathroom-skincare-sunscreen","name":"톤업 선크림"},{"rank":2,"masterItemId":null,"name":"테스트 세럼"},{"rank":3,"masterItemId":"bathroom-skincare-toner","name":"토너"}]}'
```

Expected: no output, HTTP 204 (check with `curl -i` if you want to see the status line).

```bash
curl http://localhost:8787/api/podium-rankings/bathroom-skincare
```

Expected: JSON with `"categoryId":"bathroom-skincare"` and a `ranking` array containing the three submitted items with `score`/`voters` fields. Confirm `server/data/podiums.json` now exists and contains the submission.

- [ ] **Step 9: Commit**

```bash
git add server/podium.js server/podium.test.mjs server/index.js vite.config.ts package.json .gitignore
git commit -m "feat: add podium-ranking backend (Node HTTP server, JSON storage, Borda-count aggregation)"
```

---

### Task 4: `RankingPage` — submit on completion, show global ranking

**Files:**
- Modify: `src/pages/RankingPage.tsx`

**Interfaces:**
- Consumes: `getCompletedPodium` (Task 1), `getDeviceId` (Task 2), the `/api/podium-submissions` and `/api/podium-rankings/:categoryId` endpoints (Task 3).

- [ ] **Step 1: Add imports and new state/refs**

Change the top imports from:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import {
  getLocationsRankedByItemCount,
  getCategoriesRankedByItemCount,
  getRankingForCategory,
} from '../state/selectors'
import { RecommendationBadge } from '../components/RecommendationBadge'
import { Badge } from '../components/Badge'
```

to:

```tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import {
  getLocationsRankedByItemCount,
  getCategoriesRankedByItemCount,
  getRankingForCategory,
  getCompletedPodium,
} from '../state/selectors'
import { RecommendationBadge } from '../components/RecommendationBadge'
import { Badge } from '../components/Badge'
import { getDeviceId } from '../lib/deviceId'

type GlobalRankingEntry = { name: string; masterItemId: string | null; score: number; voters: number }
```

- [ ] **Step 2: Add the submit-on-completion and fetch-on-view effects**

Right after the existing `const [drill, setDrill] = useState<DrillLevel>({ level: 'locations' })` line, add:

```tsx
  const lastSubmittedRef = useRef<string | null>(null)
  const [globalRanking, setGlobalRanking] = useState<GlobalRankingEntry[] | null>(null)

  useEffect(() => {
    if (drill.level !== 'products') return
    const completed = getCompletedPodium(items, drill.categoryId)
    if (!completed) return
    const signature = completed.map((e) => `${e.rank}:${e.item.id}`).join(',')
    if (lastSubmittedRef.current === signature) return
    lastSubmittedRef.current = signature
    fetch('/api/podium-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: getDeviceId(),
        categoryId: drill.categoryId,
        items: completed.map((e) => ({
          rank: e.rank,
          masterItemId: e.item.masterItemId ?? null,
          name: e.item.name,
        })),
      }),
    }).catch(() => {})
  }, [items, drill])

  useEffect(() => {
    if (drill.level !== 'products') return
    let cancelled = false
    setGlobalRanking(null)
    fetch(`/api/podium-rankings/${encodeURIComponent(drill.categoryId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setGlobalRanking(data?.ranking ?? [])
      })
      .catch(() => {
        if (!cancelled) setGlobalRanking([])
      })
    return () => {
      cancelled = true
    }
  }, [drill])
```

(Both effects run on every render regardless of `drill.level` — per React's rules of hooks, they must be declared unconditionally before any early return. Each effect internally checks `drill.level !== 'products'` and no-ops otherwise. `drill` as a dependency covers both `drill.level` changing away from `'products'` and `drill.categoryId` changing between two different product views.)

- [ ] **Step 3: Render the global ranking section**

Find the end of the products-level return statement:

```tsx
      {ranking.length === 0 ? (
        <p className="text-sm text-ink/50">이 카테고리에는 기록된 상품이 없습니다.</p>
      ) : (
        <ol className="space-y-2">
          {ranking.map((item, index) => (
            /* ...existing <li> unchanged... */
          ))}
        </ol>
      )}
    </div>
  )
}
```

Add the new section directly before the closing `</div>` (after the `ranking.length === 0 ? ... : ...` block, still inside the same outer `<div className="space-y-4 p-4">`):

```tsx
      <div className="space-y-2 border-t border-ink/10 pt-4">
        <h2 className="text-sm font-medium text-ink/70">🌍 전체 유저 인기 랭킹</h2>
        {globalRanking === null ? (
          <p className="text-sm text-ink/40">불러오는 중...</p>
        ) : globalRanking.length === 0 ? (
          <p className="text-sm text-ink/40">아직 데이터가 부족해요.</p>
        ) : (
          <ol className="space-y-1">
            {globalRanking.map((entry, i) => (
              <li
                key={`${entry.masterItemId ?? entry.name}-${i}`}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {i + 1}. {entry.name}
                </span>
                <span className="text-ink/40">{entry.voters}명 선택</span>
              </li>
            ))}
          </ol>
        )}
      </div>
```

Do not modify the `ranking.map((item, index) => ...)` `<li>` block itself (the personal ranked list with medal buttons) — only add the new section after it.

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 5: Manual verification trace**

With `npm run dev:server` running in one terminal and `npm run dev` in another:
- Navigate to `/ranking` → drill into a category with at least one item → confirm the new "🌍 전체 유저 인기 랭킹" section appears below the personal list, initially showing "불러오는 중..." then "아직 데이터가 부족해요" (assuming no prior submissions for this category from Task 3's manual trace — if you ran that trace against `bathroom-skincare`, drill into that exact category instead and confirm the section shows the previously-submitted ranking).
- Assign 🥇🥈🥉 to three different items in a category that has at least 3 recorded items (add more via `/new` if needed), completing its podium. Check `server/data/podiums.json` — confirm a new row appears for your `deviceId` (check `localStorage['remembuy:deviceId']` in devtools) and that category.
- Reload the page, drill back into that same category — confirm "🌍 전체 유저 인기 랭킹" now shows your submitted picks (with "1명 선택" per item, assuming no other submissions yet).
- Change one of the medal assignments (e.g. swap 1st and 2nd) — confirm `server/data/podiums.json` still has only ONE row for your `deviceId`+that category (updated, not duplicated).

- [ ] **Step 6: Commit**

```bash
git add src/pages/RankingPage.tsx
git commit -m "feat: auto-submit completed podiums and show global popularity ranking"
```

---

### Task 5: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full frontend automated test suite**

Run: `npx vitest run`
Expected: all tests pass, count = the branch's prior total (47) + 3 new `getCompletedPodium` tests = 50.

- [ ] **Step 2: Run the backend test suite**

Run: `node --test server/`
Expected: all 4 tests pass.

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit`
Expected: zero errors.

Run: `npm run build`
Expected: build succeeds (the `server/` directory is plain Node JS, untouched by the Vite/TS build).

- [ ] **Step 4: Manual golden-path walkthrough**

With both `npm run dev:server` and `npm run dev` running:
- Repeat Task 4's manual trace once more end-to-end.
- Confirm that navigating between different categories under `/ranking` correctly fetches a fresh global ranking each time (no stale data from a previously-viewed category lingering).
- Confirm that leaving the products view (clicking "← 카테고리 목록") and coming back doesn't cause any console errors from the effects (the `cancelled` flag in the fetch effect should prevent a late-arriving response from setting state after the component has moved to a different view).
- Confirm `npm run build` output is unaffected in size/behavior by the new `server/` directory (it should not appear in `dist/` at all — it's a separate Node process, not bundled by Vite).

- [ ] **Step 5: Commit final state (only if fixes were needed)**

If Steps 1-4 required any fixes, commit them now with a descriptive message. If everything passed as-is, no commit is needed for this task.
