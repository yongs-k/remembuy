# Manual-Entry Item Image Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a manually-entered item (no link/photo-analysis prefill) search for a representative product image via Gemini, preview it, and confirm-to-save it as `Item.imageUrl` — displayed on `ItemCard`/`ItemDetailPage` with a broken-link fallback.

**Architecture:** A new Gemini-backed server route (`server/imageSearch.js` + `server/imageSearchRoute.js`, mirroring `linkAnalysis.js`/`analyzeLinkRoute.js`'s split) returns a best-effort image URL or `null` — never a fabricated guess. The client adds one form field to `NewItemPage.tsx` (search → preview → explicit confirm, never auto-applied) and one new `Item` field, displayed with an `onError`-driven fallback to the existing icon placeholder everywhere it's shown.

**Tech Stack:** Node `node:test`/`node:http` (server, no new dependency); React + TypeScript (client, no new dependency).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-28-item-image-search-design.md`.
- Server code: plain ESM JavaScript, 2-space indent, `node:test` pattern matching `server/analyzeLinkRoute.js`/`.test.mjs`.
- Reuses `GEMINI_API_KEY`/`GEMINI_MODEL` from `server/.env` — no new env var, no new dependency, no new external service.
- The Gemini prompt must explicitly instruct the model to return `null` rather than guess/fabricate a URL when unsure.
- Every image render (form preview and both display components) has an `onError` fallback to the existing icon placeholder — a broken URL must never show a broken-image icon.
- The "이미지 찾기" UI only appears when `isManualEntry` (`!existing && !prefill`) is true — never for edits or link/photo-analysis-prefilled entries.
- The found image is never auto-applied — the user must click a separate "이 이미지 쓰기" confirm action before it affects form state, and nothing is persisted until the form itself is submitted.
- `Item.imageUrl` is `string | null | undefined` (same optionality convention as `restockCycle`/`affiliateUrl`).
- `npx tsc --noEmit` clean and `npx vitest run` green after every client task (123 tests before this plan; no new test file — none of `NewItemPage.tsx`/`ItemCard.tsx`/`ItemDetailPage.tsx` have one today). `npm run test:server` green after every server task (83 tests before this plan).
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## File Structure

```
server/imageSearch.js                  # Create
server/imageSearch.test.mjs            # Create
server/imageSearchRoute.js             # Create
server/imageSearchRoute.test.mjs       # Create
server/index.js                        # Modify: mount handleImageSearchRequest
package.json                           # Modify: test:server script
src/types.ts                           # Modify: add Item.imageUrl
src/lib/imageSearchApi.ts              # Create
src/pages/NewItemPage.tsx              # Modify: search/preview/confirm UI + submit
src/components/ItemCard.tsx            # Modify: image display + fallback
src/pages/ItemDetailPage.tsx           # Modify: image display + fallback
```

---

### Task 1: Image search backend

**Files:**
- Create: `server/imageSearch.js`, `server/imageSearch.test.mjs`, `server/imageSearchRoute.js`, `server/imageSearchRoute.test.mjs`
- Modify: `server/index.js`, `package.json`

**Interfaces:**
- Produces: `buildImageSearchPrompt(name: string, categoryName?: string) => string`; `callGeminiImageSearch(prompt: string) => Promise<{ imageUrl: string | null }>`; `searchProductImage(name: string, categoryName?: string) => Promise<{ imageUrl: string | null }>` — all from `server/imageSearch.js`. `handleImageSearchRequest(req, res)` from `server/imageSearchRoute.js`, mounted at `POST /api/search-image`.

- [ ] **Step 1: Write the failing tests**

Create `server/imageSearch.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildImageSearchPrompt } from './imageSearch.js'

test('buildImageSearchPrompt includes the product name', () => {
  const prompt = buildImageSearchPrompt('톤업 선크림')
  assert.match(prompt, /톤업 선크림/)
})

test('buildImageSearchPrompt includes the category name when given', () => {
  const prompt = buildImageSearchPrompt('톤업 선크림', '스킨케어')
  assert.match(prompt, /스킨케어/)
})

test('buildImageSearchPrompt instructs the model never to invent a URL', () => {
  const prompt = buildImageSearchPrompt('톤업 선크림')
  assert.match(prompt, /null/i)
  assert.match(prompt, /never/i)
})
```

Create `server/imageSearchRoute.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { handleImageSearchRequest } from './imageSearchRoute.js'

async function start() {
  const server = createServer((req, res) => {
    handleImageSearchRequest(req, res)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  return {
    base,
    close: () => {
      server.closeAllConnections()
      return new Promise((resolve) => server.close(resolve))
    },
  }
}

function call(base, body) {
  return fetch(`${base}/api/search-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

test('rejects malformed JSON with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, '{not json')
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})

test('rejects a missing name with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, { categoryName: '스킨케어' })
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})

test('rejects an empty name with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, { name: '   ' })
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})

test('rejects a wrong-typed categoryName with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, { name: '톤업 선크림', categoryName: 123 })
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})
```

None of these four cases reach `searchProductImage` — all fail validation first — so no `GEMINI_API_KEY` or network access is required to run this file, consistent with every other Gemini-route test in this codebase.

- [ ] **Step 2: Run to verify both fail**

Run: `node --test server/imageSearch.test.mjs server/imageSearchRoute.test.mjs`
Expected: FAIL (cannot find modules `./imageSearch.js`/`./imageSearchRoute.js`).

- [ ] **Step 3: Implement `server/imageSearch.js`**

```js
const DEFAULT_MODEL = 'gemini-3.6-flash'

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    imageUrl: { type: 'STRING', nullable: true },
  },
  required: ['imageUrl'],
}

export function buildImageSearchPrompt(name, categoryName) {
  return `Find a single, direct, publicly-accessible image URL (ending in a common image extension like .jpg/.jpeg/.png/.webp, from a real, stable, well-known source such as a major retailer or manufacturer product page) that best represents this household product: "${name}"${categoryName ? ` (category: ${categoryName})` : ''}. Return null for imageUrl if you cannot confidently identify a specific, direct image URL — never invent or guess a URL.`
}

export async function callGeminiImageSearch(prompt) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(15000),
    }
  )
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Gemini request failed: ${res.status} ${errText}`)
  }
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini response missing content')
  return JSON.parse(text)
}

export async function searchProductImage(name, categoryName) {
  const prompt = buildImageSearchPrompt(name, categoryName)
  return callGeminiImageSearch(prompt)
}
```

- [ ] **Step 4: Implement `server/imageSearchRoute.js`**

```js
import { searchProductImage } from './imageSearch.js'

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

export function handleImageSearchRequest(req, res) {
  const chunks = []
  req.on('data', (chunk) => {
    chunks.push(chunk)
  })
  req.on('end', async () => {
    const body = Buffer.concat(chunks).toString('utf-8')
    let parsed
    try {
      parsed = JSON.parse(body)
    } catch {
      sendJson(res, 400, { error: 'invalid payload' })
      return
    }
    if (typeof parsed !== 'object' || parsed === null) {
      sendJson(res, 400, { error: 'invalid payload' })
      return
    }
    const { name, categoryName } = parsed
    if (typeof name !== 'string' || name.trim().length === 0) {
      sendJson(res, 400, { error: 'invalid payload' })
      return
    }
    if (categoryName !== undefined && typeof categoryName !== 'string') {
      sendJson(res, 400, { error: 'invalid payload' })
      return
    }
    try {
      const result = await searchProductImage(name, categoryName)
      sendJson(res, 200, result)
    } catch {
      sendJson(res, 502, { error: 'image search failed' })
    }
  })
}
```

- [ ] **Step 5: Run to verify both pass**

Run: `node --test server/imageSearch.test.mjs` — expected PASS (3 tests).
Run: `node --test server/imageSearchRoute.test.mjs` — expected PASS (4 tests).

- [ ] **Step 6: Mount in `server/index.js` and fix `package.json`'s `test:server` script**

Find:

```js
import { handlePhotoRequest } from './photoRoutes.js'
```

Replace with:

```js
import { handlePhotoRequest } from './photoRoutes.js'
import { handleImageSearchRequest } from './imageSearchRoute.js'
```

Find:

```js
  if (req.method === 'POST' && req.url === '/api/analyze-photo') {
    handlePhotoRequest(req, res)
    return
  }
```

Replace with:

```js
  if (req.method === 'POST' && req.url === '/api/analyze-photo') {
    handlePhotoRequest(req, res)
    return
  }

  if (req.method === 'POST' && req.url === '/api/search-image') {
    handleImageSearchRequest(req, res)
    return
  }
```

Find (in `package.json`):

```json
    "test:server": "node --test server/podium.test.mjs server/linkAnalysis.test.mjs server/analyzeLinkRoute.test.mjs server/photoAnalysis.test.mjs server/photoRoutes.test.mjs server/game/db.test.mjs server/game/rules.test.mjs server/game/service.test.mjs server/game/routes.test.mjs server/game/itemRules.test.mjs server/game/itemService.test.mjs server/game/adminAuth.test.mjs server/game/adminService.test.mjs server/game/adminRoutes.test.mjs"
```

Replace with:

```json
    "test:server": "node --test server/podium.test.mjs server/linkAnalysis.test.mjs server/analyzeLinkRoute.test.mjs server/photoAnalysis.test.mjs server/photoRoutes.test.mjs server/imageSearch.test.mjs server/imageSearchRoute.test.mjs server/game/db.test.mjs server/game/rules.test.mjs server/game/service.test.mjs server/game/routes.test.mjs server/game/itemRules.test.mjs server/game/itemService.test.mjs server/game/adminAuth.test.mjs server/game/adminService.test.mjs server/game/adminRoutes.test.mjs"
```

- [ ] **Step 7: Run the full server suite to verify everything passes**

Run: `npm run test:server` — expected PASS. Count should now be 83
(prior) + 3 (`imageSearch.test.mjs`) + 4 (`imageSearchRoute.test.mjs`)
= 90. Confirm the exact number from the tool's own summary rather than
trusting this arithmetic.

- [ ] **Step 8: Commit**

```bash
git add server/imageSearch.js server/imageSearch.test.mjs server/imageSearchRoute.js server/imageSearchRoute.test.mjs server/index.js package.json
git commit -m "feat: add Gemini-backed product image search endpoint"
```

---

### Task 2: Manual-entry search UI + image display

**Files:**
- Modify: `src/types.ts`, `src/pages/NewItemPage.tsx`, `src/components/ItemCard.tsx`, `src/pages/ItemDetailPage.tsx`
- Create: `src/lib/imageSearchApi.ts`

**Interfaces:**
- Consumes: `POST /api/search-image` (Task 1).
- Produces: `searchProductImage(name: string, categoryName?: string) => Promise<{ imageUrl: string | null }>` from `src/lib/imageSearchApi.ts`.

None of the four touched/created frontend files have an existing test
file (confirmed absent from `src/pages/*.test.tsx` /
`src/components/*.test.tsx`) — this task is verified by `tsc` + the
full `vitest` suite staying green, not by new failing tests.

- [ ] **Step 1: Add `Item.imageUrl` to `src/types.ts`**

Find:

```ts
  restockCycle?: string | null
  affiliateUrl?: string | null
  createdAt: string
```

Replace with:

```ts
  restockCycle?: string | null
  affiliateUrl?: string | null
  imageUrl?: string | null
  createdAt: string
```

- [ ] **Step 2: Create `src/lib/imageSearchApi.ts`**

```ts
export type ImageSearchResult = { imageUrl: string | null }

export async function searchProductImage(
  name: string,
  categoryName?: string
): Promise<ImageSearchResult> {
  const res = await fetch('/api/search-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, categoryName }),
  })
  if (!res.ok) throw new Error(`image search failed: ${res.status}`)
  return res.json()
}
```

- [ ] **Step 3: Wire the search/preview/confirm UI into `src/pages/NewItemPage.tsx`**

Find (the imports):

```tsx
import { getCompletionGain, getRemainingDays } from '../state/selectors'
```

Replace with:

```tsx
import { getCompletionGain, getRemainingDays } from '../state/selectors'
import { searchProductImage } from '../lib/imageSearchApi'
```

Find (right after the `prefill`/`prefillLocation`/`prefillCategory`/`prefillMasterItemId` block, before the first `useState`):

```tsx
  const [name, setName] = useState(existing?.name ?? prefill?.name ?? '')
```

Replace with:

```tsx
  const isManualEntry = !existing && !prefill

  const [name, setName] = useState(existing?.name ?? prefill?.name ?? '')
```

Find:

```tsx
  const [note, setNote] = useState(existing?.note ?? '')
```

Replace with:

```tsx
  const [note, setNote] = useState(existing?.note ?? '')
  const [imageUrl, setImageUrl] = useState<string | null>(existing?.imageUrl ?? null)
  const [imageCandidate, setImageCandidate] = useState<string | null>(null)
  const [imageSearchStatus, setImageSearchStatus] = useState<'idle' | 'loading' | 'not-found' | 'broken'>(
    'idle'
  )
```

Find (right after `handleAddCategory`'s closing brace, before `handleSubmit`):

```tsx
  function handleAddCategory() {
    if (!newCategoryName.trim() || !locationId) return
    const created = addCategory(locationId, newCategoryName.trim())
    setNewCategoryName('')
    setCategoryId(created.id)
  }
```

Replace with:

```tsx
  function handleAddCategory() {
    if (!newCategoryName.trim() || !locationId) return
    const created = addCategory(locationId, newCategoryName.trim())
    setNewCategoryName('')
    setCategoryId(created.id)
  }

  async function handleSearchImage() {
    if (!name.trim()) return
    setImageSearchStatus('loading')
    setImageCandidate(null)
    try {
      const result = await searchProductImage(name, selectedCategory?.name)
      if (result.imageUrl) {
        setImageCandidate(result.imageUrl)
        setImageSearchStatus('idle')
      } else {
        setImageSearchStatus('not-found')
      }
    } catch {
      setImageSearchStatus('not-found')
    }
  }
```

Find (inside `handleSubmit`'s `item: Item = {...}` object literal):

```tsx
      restockCycle: restockCycle || null,
      note: note || undefined,
```

Replace with:

```tsx
      restockCycle: restockCycle || null,
      imageUrl,
      note: note || undefined,
```

Find (the name field in the JSX):

```tsx
        <label className={labelCls}>
          이름
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </label>
```

Replace with:

```tsx
        <label className={labelCls}>
          이름
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </label>

        {isManualEntry && (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={handleSearchImage}
              disabled={!name.trim() || imageSearchStatus === 'loading'}
              className="flex items-center gap-1.5 rounded-lg bg-surface-container-high px-3 py-1.5 text-label-md text-on-surface disabled:opacity-40"
            >
              <Icon name="image_search" className="text-[16px]" />
              {imageSearchStatus === 'loading' ? '이미지 찾는 중...' : '이미지 찾기'}
            </button>
            {imageSearchStatus === 'not-found' && (
              <p className="text-body-sm text-on-surface-variant">이미지를 찾지 못했어요</p>
            )}
            {imageCandidate && (
              <div className="flex items-center gap-2 rounded-xl bg-surface-container-low p-space-sm">
                <img
                  src={imageCandidate}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover"
                  onError={() => {
                    setImageCandidate(null)
                    setImageSearchStatus('broken')
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl(imageCandidate)
                    setImageCandidate(null)
                  }}
                  className="rounded-lg bg-primary px-3 py-1.5 text-label-md text-on-primary"
                >
                  이 이미지 쓰기
                </button>
              </div>
            )}
            {imageSearchStatus === 'broken' && (
              <p className="text-body-sm text-on-surface-variant">이미지를 불러올 수 없어요</p>
            )}
            {imageUrl && (
              <p className="flex items-center gap-1 text-label-sm text-secondary">
                <Icon name="check_circle" className="text-[14px]" />
                이미지가 선택됐어요
              </p>
            )}
          </div>
        )}
```

- [ ] **Step 4: Display the image (with fallback) in `src/components/ItemCard.tsx`**

Find:

```tsx
import type { Item } from '../types'
import { Icon } from '../data/materialIcons'
import { RecommendationBadge } from './RecommendationBadge'
import { getRemainingDays, formatDday } from '../state/selectors'

export function ItemCard({ item, onClick }: { item: Item; onClick: () => void }) {
  const remaining = getRemainingDays(item)
  const urgent = remaining !== undefined && remaining <= 7
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl bg-surface-container-lowest p-space-md text-left shadow-[0_3px_0px_#eae0de]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
        <Icon name="inventory_2" className="text-[24px]" />
      </div>
```

Replace with:

```tsx
import { useState } from 'react'
import type { Item } from '../types'
import { Icon } from '../data/materialIcons'
import { RecommendationBadge } from './RecommendationBadge'
import { getRemainingDays, formatDday } from '../state/selectors'

export function ItemCard({ item, onClick }: { item: Item; onClick: () => void }) {
  const remaining = getRemainingDays(item)
  const urgent = remaining !== undefined && remaining <= 7
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(item.imageUrl) && !imageFailed
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl bg-surface-container-lowest p-space-md text-left shadow-[0_3px_0px_#eae0de]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container-low text-on-surface-variant">
        {showImage ? (
          <img
            src={item.imageUrl ?? undefined}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Icon name="inventory_2" className="text-[24px]" />
        )}
      </div>
```

- [ ] **Step 5: Display the image (with fallback) in `src/pages/ItemDetailPage.tsx`**

Find:

```tsx
import { useNavigate, useParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { RecommendationToggle } from '../components/RecommendationToggle'
import { ItemCard } from '../components/ItemCard'
import { Icon } from '../data/materialIcons'
import { getRemainingDays, formatDday } from '../state/selectors'
```

Replace with:

```tsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { RecommendationToggle } from '../components/RecommendationToggle'
import { ItemCard } from '../components/ItemCard'
import { Icon } from '../data/materialIcons'
import { getRemainingDays, formatDday } from '../state/selectors'
```

Find:

```tsx
  const remaining = getRemainingDays(item)
  const urgent = remaining !== undefined && remaining <= 7

  return (
```

Replace with:

```tsx
  const remaining = getRemainingDays(item)
  const urgent = remaining !== undefined && remaining <= 7
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(item.imageUrl) && !imageFailed

  return (
```

Find:

```tsx
          <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
            <Icon name="inventory_2" className="text-[36px]" />
          </div>
```

Replace with:

```tsx
          <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container-low text-on-surface-variant">
            {showImage ? (
              <img
                src={item.imageUrl ?? undefined}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <Icon name="inventory_2" className="text-[36px]" />
            )}
          </div>
```

(Note: `useState` inside `ItemDetailPage` is only reachable after the
component's early `if (!item) return ...` guard — React's Rules of
Hooks require all hooks to run unconditionally on every render, in the
same order. `useState` is declared with the other hooks/derived values
near the top of the component body, alongside `getRemainingDays`,
*before* that early return — confirm this ordering matches the actual
current file rather than assuming the find/replace above landed after
the guard; the plan's Find blocks above are anchored on content that,
in the current file, already sits before the `if (!item)` check, so
this is naturally satisfied, but double-check during implementation.)

- [ ] **Step 6: Run to verify it compiles and the suite stays green**

Run: `npx tsc --noEmit` — expected clean.
Run: `npx vitest run` — expected PASS, 123/123 (unchanged — no new test
files touch these four files).

- [ ] **Step 7: Manual trace**

With `npm run dev` and `npm run dev:server` running (**restart the dev
server fully after this task**, not just relying on HMR — no Tailwind
config changed this time, so this is likely unnecessary, but confirm
the new route responds: `curl -s -X POST http://localhost:8787/api/search-image -H "Content-Type: application/json" -d '{"name":""}' ` should return 400):

1. Start a brand-new item via "직접 입력" (no prefill) — confirm the
   "이미지 찾기" button appears after typing a name.
2. Click it with a real, findable product name — confirm a preview
   appears, "이 이미지 쓰기" applies it, and "이미지가 선택됐어요" shows.
3. Save the item and confirm the image now renders on `ItemCard` (home
   screen) and `ItemDetailPage` instead of the generic icon.
4. Try a name Gemini can't identify — confirm "이미지를 찾지 못했어요"
   with no preview.
5. Edit an existing item (`existing` is set) — confirm the "이미지 찾기"
   button does NOT appear (not manual entry).
6. If feasible, manually corrupt a saved `imageUrl` (e.g. via
   localStorage devtools) and reload — confirm the icon placeholder
   shows instead of a broken-image icon.

- [ ] **Step 8: Commit**

```bash
git add src/types.ts src/lib/imageSearchApi.ts src/pages/NewItemPage.tsx src/components/ItemCard.tsx src/pages/ItemDetailPage.tsx
git commit -m "feat: search and display a product image for manually-entered items"
```

---

Related: `docs/superpowers/specs/2026-09-28-item-image-search-design.md`.