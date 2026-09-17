# Link Analysis Auto-Fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user paste a product URL in the home screen's record sheet and have the app call Gemini (via the existing small Node backend) to auto-fill the new-item form's fields.

**Architecture:** A new `server/linkAnalysis.js` module (HTML text extraction, prompt building, Gemini call) plugs into the existing `server/index.js` dispatcher as one more route; `HomePage.tsx`'s record sheet gains an inline URL-input state that calls it and hands the result to `NewItemPage.tsx` via React Router's route state.

**Tech Stack:** Node's built-in `fetch`/`http` (backend, no new dependencies), React + TypeScript + React Router (frontend, no new dependencies).

## Global Constraints

- No new npm dependencies, frontend or backend — Gemini is called via `fetch` against its REST API directly, not the `@google/generative-ai` SDK.
- `GEMINI_API_KEY` is read from `server/.env` (already created, git-ignored) via `process.env.GEMINI_API_KEY`. Never hardcode it, never log it, never include it in any committed file.
- No location or category is ever auto-created from the AI's suggestion — a suggested new name only pre-fills the existing "새 장소 이름"/"새 카테고리 이름" text inputs in `NewItemPage`; the user must still click the existing "추가" buttons themselves.
- The pasted URL always becomes the new item's `affiliateUrl` — it IS the purchase link.
- On any failure (fetch timeout, non-2xx from the target page, Gemini error, malformed response), the backend returns `{ error: string }` with a 4xx/5xx status, never a partial/malformed 200; the frontend shows an inline error plus a "직접 입력하기" fallback to plain manual entry.
- No automated test for the real Gemini network call, the HTTP route wiring, or `NewItemPage`'s prefill-seeding — consistent with this branch's established precedent for glue code / page-level components (verified via manual trace instead). The pure text-extraction and prompt-building functions DO get automated tests.

## File Structure

```
server/
  linkAnalysis.js         # Create: extractText, fetchPageText, buildPrompt, callGemini, analyzeLink
  linkAnalysis.test.mjs   # Create: node:test tests for extractText and buildPrompt
  index.js                # Modify: add POST /api/analyze-link route
src/
  pages/
    HomePage.tsx           # Modify: record sheet gains inline URL-input flow
    NewItemPage.tsx         # Modify: seed form state from route-state prefill
```

---

### Task 1: `extractText` and `buildPrompt` (pure, testable)

**Files:**
- Create: `server/linkAnalysis.js` (partial — this task only adds `extractText` and `buildPrompt`; Task 2 adds the rest)
- Create: `server/linkAnalysis.test.mjs`

**Interfaces:**
- Produces: `extractText(html: string): string`, `buildPrompt(pageText: string, locations: Array<{id, name}>, categories: Array<{id, locationId, name, masterItems: Array<{id, name}>}>): string`

- [ ] **Step 1: Write the failing tests in `server/linkAnalysis.test.mjs`**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { extractText, buildPrompt } from './linkAnalysis.js'

test('extractText pulls title, og:title, og:description, and stripped body text', () => {
  const html = `
    <html><head>
      <title>테스트 상품 - 쇼핑몰</title>
      <meta property="og:title" content="테스트 상품" />
      <meta property="og:description" content="아주 좋은 상품입니다" />
      <script>console.log('should be stripped')</script>
    </head><body>
      <div>가격: 12,000원 <span>재고 있음</span></div>
    </body></html>
  `
  const result = extractText(html)
  assert.match(result, /테스트 상품 - 쇼핑몰/)
  assert.match(result, /OG Title: 테스트 상품/)
  assert.match(result, /OG Description: 아주 좋은 상품입니다/)
  assert.match(result, /가격: 12,000원/)
  assert.doesNotMatch(result, /console\.log/)
})

test('extractText truncates body text to 4000 characters', () => {
  const longBody = 'a'.repeat(5000)
  const html = `<html><body>${longBody}</body></html>`
  const result = extractText(html)
  const bodyLine = result.split('\n').find((line) => line.startsWith('Body:'))
  assert.ok(bodyLine.length <= 4000 + 'Body: '.length)
})

test('buildPrompt includes the page text and the location/category names', () => {
  const locations = [{ id: 'bathroom', name: '욕실' }]
  const categories = [
    {
      id: 'bathroom-skincare',
      locationId: 'bathroom',
      name: '스킨케어',
      masterItems: [{ id: 'bathroom-skincare-sunscreen', name: '선크림' }],
    },
  ]
  const prompt = buildPrompt('Title: 테스트 선크림', locations, categories)
  assert.match(prompt, /테스트 선크림/)
  assert.match(prompt, /욕실/)
  assert.match(prompt, /스킨케어/)
  assert.match(prompt, /선크림/)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test server/linkAnalysis.test.mjs`
Expected: FAIL — `server/linkAnalysis.js` doesn't exist yet.

- [ ] **Step 3: Create `server/linkAnalysis.js` with `extractText` and `buildPrompt`**

```js
export function extractText(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const ogTitleMatch = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i
  )
  const ogDescMatch = html.match(
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i
  )
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  const bodyText = (bodyMatch ? bodyMatch[1] : html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000)

  const parts = []
  if (titleMatch) parts.push(`Title: ${titleMatch[1].trim()}`)
  if (ogTitleMatch) parts.push(`OG Title: ${ogTitleMatch[1].trim()}`)
  if (ogDescMatch) parts.push(`OG Description: ${ogDescMatch[1].trim()}`)
  parts.push(`Body: ${bodyText}`)
  return parts.join('\n')
}

export function buildPrompt(pageText, locations, categories) {
  const locationList = locations.map((l) => `- ${l.id}: ${l.name}`).join('\n')
  const categoryList = categories
    .map((c) => {
      const items = c.masterItems.map((m) => `${m.id}:${m.name}`).join(', ')
      return `- ${c.id} (in ${c.locationId}): ${c.name}${items ? ` [items: ${items}]` : ''}`
    })
    .join('\n')

  return `You are extracting structured shopping info from a product page's text, to prefill a household-inventory app's "add item" form.

Existing locations:
${locationList}

Existing categories (with their standard items):
${categoryList}

Page content:
${pageText}

Extract: the product name, a matching locationId/categoryId/masterItemId from the lists above if one clearly fits (else null and a suggested new name), the purchase price as a plain number (no currency symbols), the place of purchase (site/brand name), and a plausible restock cycle description in Korean (e.g. "약 2개월마다") based on the product type — or null if you can't reasonably guess any field.`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test server/linkAnalysis.test.mjs`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add server/linkAnalysis.js server/linkAnalysis.test.mjs
git commit -m "feat: add HTML text extraction and prompt building for link analysis"
```

---

### Task 2: `callGemini`, `analyzeLink`, and the `/api/analyze-link` route

**Files:**
- Modify: `server/linkAnalysis.js` (add `fetchPageText`, `callGemini`, `analyzeLink`)
- Modify: `server/index.js` (add the route)

**Interfaces:**
- Consumes: `extractText`, `buildPrompt` (Task 1).
- Produces: `fetchPageText(url: string): Promise<string>`, `callGemini(prompt: string): Promise<object>`, `analyzeLink(url: string, locations, categories): Promise<object>` (the `LinkAnalysisResult` shape documented in the design spec).

- [ ] **Step 1: Add `fetchPageText`, `callGemini`, and `analyzeLink` to `server/linkAnalysis.js`**

Append to the existing file (after `buildPrompt`):

```js
export async function fetchPageText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`fetch failed with status ${res.status}`)
  const html = await res.text()
  return extractText(html.slice(0, 200_000))
}

const DEFAULT_MODEL = 'gemini-2.5-flash'

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', nullable: true },
    locationId: { type: 'STRING', nullable: true },
    suggestedLocationName: { type: 'STRING', nullable: true },
    categoryId: { type: 'STRING', nullable: true },
    suggestedCategoryName: { type: 'STRING', nullable: true },
    masterItemId: { type: 'STRING', nullable: true },
    place: { type: 'STRING', nullable: true },
    price: { type: 'NUMBER', nullable: true },
    restockCycle: { type: 'STRING', nullable: true },
  },
  required: [
    'name',
    'locationId',
    'suggestedLocationName',
    'categoryId',
    'suggestedCategoryName',
    'masterItemId',
    'place',
    'price',
    'restockCycle',
  ],
}

export async function callGemini(prompt) {
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

export async function analyzeLink(url, locations, categories) {
  const pageText = await fetchPageText(url)
  const prompt = buildPrompt(pageText, locations, categories)
  return callGemini(prompt)
}
```

Note: `process.env.GEMINI_API_KEY` requires `server/.env` to actually be loaded into `process.env`. Check whether `server/index.js` (or a new small loader) already reads `.env` — if this project has no `.env`-loading step yet, add one. The simplest option with zero new dependencies: Node 20.6+ supports `--env-file` natively. Update the `dev:server` script in `package.json` to load it:

```json
    "dev:server": "node --env-file=server/.env server/index.js",
```

If `node --env-file` is unavailable (older Node), read the file manually at the top of `server/index.js` instead — but try `--env-file` first since it requires no code.

- [ ] **Step 2: Add the route to `server/index.js`**

Add the import at the top:

```js
import { analyzeLink } from './linkAnalysis.js'
```

Add this route inside the request handler, alongside the two existing `if` blocks (before the final `sendJson(res, 404, ...)` fallback):

```js
  if (req.method === 'POST' && req.url === '/api/analyze-link') {
    const chunks = []
    req.on('data', (chunk) => {
      chunks.push(chunk)
    })
    req.on('end', async () => {
      try {
        const body = Buffer.concat(chunks).toString('utf-8')
        const { url, locations, categories } = JSON.parse(body)
        if (typeof url !== 'string' || !Array.isArray(locations) || !Array.isArray(categories)) {
          sendJson(res, 400, { error: 'invalid payload' })
          return
        }
        const result = await analyzeLink(url, locations, categories)
        sendJson(res, 200, result)
      } catch {
        sendJson(res, 502, { error: 'analysis failed' })
      }
    })
    return
  }
```

(Reuses the same buffer-then-decode-once body-reading pattern as the existing `/api/podium-submissions` route, for the same UTF-8-safety reason.)

- [ ] **Step 3: Verify the pure-function tests still pass**

Run: `node --test server/linkAnalysis.test.mjs`
Expected: PASS, same 3 tests as Task 1 (this task added network-calling functions that aren't unit-tested, per the Global Constraints).

- [ ] **Step 4: Manual verification trace**

With a real `GEMINI_API_KEY` in `server/.env`:

```bash
npm run dev:server
```

In another terminal:

```bash
curl -X POST http://localhost:8787/api/analyze-link \
  -H "Content-Type: application/json" \
  --data-binary @- <<'EOF'
{"url":"https://example.com","locations":[{"id":"bathroom","name":"욕실"}],"categories":[{"id":"bathroom-skincare","locationId":"bathroom","name":"스킨케어","masterItems":[{"id":"bathroom-skincare-sunscreen","name":"선크림"}]}]}
EOF
```

(Use `--data-binary @-` with a heredoc rather than inline `-d '...'` — this session's earlier work with this same server found that some shells mangle inline non-ASCII/JSON text passed via `-d`.)

Expected: a 200 response with a JSON body matching the `LinkAnalysisResult` shape (fields may be `null` since `example.com` has almost no real content — that's fine, it confirms the round-trip works end-to-end including a real Gemini call). If you have a real product URL handy, try that too and confirm the extracted `name`/`price` are plausible.

Try a deliberately-bad URL (e.g. `"url":"https://this-domain-does-not-exist-xyz123.com"`) and confirm you get a 502 with `{"error":"analysis failed"}`, not a hang or a crash.

- [ ] **Step 5: Commit**

```bash
git add server/linkAnalysis.js server/index.js package.json
git commit -m "feat: add Gemini-backed link analysis endpoint (POST /api/analyze-link)"
```

---

### Task 3: `HomePage.tsx` — inline link-input flow

**Files:**
- Modify: `src/pages/HomePage.tsx`

**Interfaces:**
- Consumes: `POST /api/analyze-link` (Task 2).
- Produces: navigates to `/new` with `location.state.prefill` matching `LinkAnalysisResult & { sourceUrl: string }`, consumed by Task 4.

- [ ] **Step 1: Add new state**

Find:

```tsx
  const [showRecordOptions, setShowRecordOptions] = useState(false)
```

Change to:

```tsx
  const [showRecordOptions, setShowRecordOptions] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
```

- [ ] **Step 2: Add the analyze handler**

Add this function near the other handlers (e.g. right after `handleBack`):

```tsx
  async function handleAnalyzeLink() {
    setIsAnalyzing(true)
    setAnalyzeError(null)
    try {
      const res = await fetch('/api/analyze-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl, locations, categories }),
      })
      if (!res.ok) throw new Error('analyze failed')
      const result = await res.json()
      navigate('/new', { state: { prefill: { ...result, sourceUrl: linkUrl } } })
    } catch {
      setAnalyzeError('페이지를 분석하지 못했어요.')
    } finally {
      setIsAnalyzing(false)
    }
  }
```

- [ ] **Step 3: Replace the sheet's content with a two-mode view**

Find the entire sheet block:

```tsx
      {showRecordOptions && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowRecordOptions(false)}
        >
          <div
            className="w-full max-w-md space-y-2 rounded-t-2xl bg-card p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="pb-1 text-center text-sm text-ink/50">어떻게 기록할까요?</p>
            <button
              type="button"
              onClick={() => navigate('/new')}
              className="flex w-full items-center gap-3 rounded-lg border border-ink/10 p-3 text-left"
            >
              <span className="text-xl">📷</span>
              <span>카메라로 촬영</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/new')}
              className="flex w-full items-center gap-3 rounded-lg border border-ink/10 p-3 text-left"
            >
              <span className="text-xl">🖼️</span>
              <span>사진 선택</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/new')}
              className="flex w-full items-center gap-3 rounded-lg border border-ink/10 p-3 text-left"
            >
              <span className="text-xl">🔗</span>
              <span>링크로 가져오기</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/new')}
              className="flex w-full items-center gap-3 rounded-lg border border-ink/10 p-3 text-left"
            >
              <span className="text-xl">✏️</span>
              <span>직접 입력</span>
            </button>
            <button
              type="button"
              onClick={() => setShowRecordOptions(false)}
              className="w-full pt-2 text-center text-sm text-ink/50"
            >
              취소
            </button>
          </div>
        </div>
      )}
```

Replace it with:

```tsx
      {showRecordOptions && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowRecordOptions(false)}
        >
          <div
            className="w-full max-w-md space-y-2 rounded-t-2xl bg-card p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            {!showLinkInput ? (
              <>
                <p className="pb-1 text-center text-sm text-ink/50">어떻게 기록할까요?</p>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="flex w-full items-center gap-3 rounded-lg border border-ink/10 p-3 text-left"
                >
                  <span className="text-xl">📷</span>
                  <span>카메라로 촬영</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="flex w-full items-center gap-3 rounded-lg border border-ink/10 p-3 text-left"
                >
                  <span className="text-xl">🖼️</span>
                  <span>사진 선택</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLinkInput(true)}
                  className="flex w-full items-center gap-3 rounded-lg border border-ink/10 p-3 text-left"
                >
                  <span className="text-xl">🔗</span>
                  <span>링크로 가져오기</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="flex w-full items-center gap-3 rounded-lg border border-ink/10 p-3 text-left"
                >
                  <span className="text-xl">✏️</span>
                  <span>직접 입력</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecordOptions(false)}
                  className="w-full pt-2 text-center text-sm text-ink/50"
                >
                  취소
                </button>
              </>
            ) : (
              <>
                <p className="pb-1 text-center text-sm text-ink/50">상품 링크를 붙여넣어주세요</p>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-ink/20 bg-paper p-2 text-sm"
                  disabled={isAnalyzing}
                />
                {analyzeError && <p className="text-sm text-stamp">{analyzeError}</p>}
                <button
                  type="button"
                  onClick={handleAnalyzeLink}
                  disabled={isAnalyzing || !linkUrl.trim()}
                  className="w-full rounded-lg bg-stamp py-2 text-sm text-white disabled:opacity-40"
                >
                  {isAnalyzing ? '분석 중...' : '분석하기'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="w-full pt-1 text-center text-sm text-accent underline"
                >
                  직접 입력하기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkInput(false)
                    setAnalyzeError(null)
                  }}
                  className="w-full pt-1 text-center text-sm text-ink/50"
                >
                  뒤로
                </button>
              </>
            )}
          </div>
        </div>
      )}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 5: Manual verification trace**

With both `npm run dev` and `npm run dev:server` running:
- Click "+" → click "🔗 링크로 가져오기" → confirm the sheet swaps to the URL-input view (other 3 buttons and the original prompt text are gone).
- Click "뒤로" → confirm it swaps back to the 4-option view.
- Paste a real product URL, click "분석하기" → confirm the button shows "분석 중..." and is disabled while in flight, then either navigates to `/new` (success) or shows the error message + fallback button (failure) — don't worry yet about whether `/new` is actually prefilled, that's Task 4.
- With the URL field empty, confirm "분석하기" stays disabled.

- [ ] **Step 6: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: add inline link-input flow to home record sheet"
```

---

### Task 4: `NewItemPage.tsx` — seed form from the analyzed link

**Files:**
- Modify: `src/pages/NewItemPage.tsx`

**Interfaces:**
- Consumes: `location.state.prefill` shaped as `LinkAnalysisResult & { sourceUrl: string }` (Task 3).

- [ ] **Step 1: Add the prefill type and `useLocation`**

Change the top imports from:

```tsx
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { RecommendationToggle } from '../components/RecommendationToggle'
import type { Item } from '../types'

type ProgressMode = 'recommendation' | 'daysUntilEmpty'
```

to:

```tsx
import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { RecommendationToggle } from '../components/RecommendationToggle'
import type { Item } from '../types'

type ProgressMode = 'recommendation' | 'daysUntilEmpty'

type LinkAnalysisPrefill = {
  name: string | null
  locationId: string | null
  suggestedLocationName: string | null
  categoryId: string | null
  suggestedCategoryName: string | null
  masterItemId: string | null
  place: string | null
  price: number | null
  restockCycle: string | null
  sourceUrl: string
}
```

- [ ] **Step 2: Read the prefill and thread it through the `useState` initializers**

Find:

```tsx
export default function NewItemPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('editId')
  const { items, locations, categories, addItem, updateItem, addLocation, addCategory } =
    useLocker()
  const existing = editId ? items.find((i) => i.id === editId) : undefined

  const [name, setName] = useState(existing?.name ?? '')
  const [locationId, setLocationId] = useState(existing?.locationId ?? locations[0].id)
  const categoriesForLocation = useMemo(
    () => categories.filter((c) => c.locationId === locationId),
    [categories, locationId]
  )
  const [categoryId, setCategoryId] = useState(
    existing?.categoryId ?? categoriesForLocation[0]?.id ?? ''
  )
  const [masterItemId, setMasterItemId] = useState(existing?.masterItemId ?? '')
  const [place, setPlace] = useState(existing?.place ?? '')
  const [restockCycle, setRestockCycle] = useState(existing?.restockCycle ?? '')
  const [progressMode, setProgressMode] = useState<ProgressMode>(
    existing?.daysUntilEmpty !== undefined ? 'daysUntilEmpty' : 'recommendation'
  )
  const [recommendation, setRecommendation] = useState<'recommend' | 'notRecommend'>(
    existing?.recommendation ?? 'recommend'
  )
  const [daysUntilEmpty, setDaysUntilEmpty] = useState(existing?.daysUntilEmpty ?? 30)
  const [price, setPrice] = useState<number | ''>(existing?.price ?? '')
  const [affiliateUrl, setAffiliateUrl] = useState(existing?.affiliateUrl ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [newLocationName, setNewLocationName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
```

Replace with:

```tsx
export default function NewItemPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('editId')
  const { items, locations, categories, addItem, updateItem, addLocation, addCategory } =
    useLocker()
  const existing = editId ? items.find((i) => i.id === editId) : undefined
  const prefill = !existing
    ? (location.state as { prefill?: LinkAnalysisPrefill } | null)?.prefill
    : undefined

  const [name, setName] = useState(existing?.name ?? prefill?.name ?? '')
  const [locationId, setLocationId] = useState(
    existing?.locationId ?? prefill?.locationId ?? locations[0].id
  )
  const categoriesForLocation = useMemo(
    () => categories.filter((c) => c.locationId === locationId),
    [categories, locationId]
  )
  const [categoryId, setCategoryId] = useState(
    existing?.categoryId ?? prefill?.categoryId ?? categoriesForLocation[0]?.id ?? ''
  )
  const [masterItemId, setMasterItemId] = useState(
    existing?.masterItemId ?? prefill?.masterItemId ?? ''
  )
  const [place, setPlace] = useState(existing?.place ?? prefill?.place ?? '')
  const [restockCycle, setRestockCycle] = useState(
    existing?.restockCycle ?? prefill?.restockCycle ?? ''
  )
  const [progressMode, setProgressMode] = useState<ProgressMode>(
    existing?.daysUntilEmpty !== undefined ? 'daysUntilEmpty' : 'recommendation'
  )
  const [recommendation, setRecommendation] = useState<'recommend' | 'notRecommend'>(
    existing?.recommendation ?? 'recommend'
  )
  const [daysUntilEmpty, setDaysUntilEmpty] = useState(existing?.daysUntilEmpty ?? 30)
  const [price, setPrice] = useState<number | ''>(existing?.price ?? prefill?.price ?? '')
  const [affiliateUrl, setAffiliateUrl] = useState(
    existing?.affiliateUrl ?? prefill?.sourceUrl ?? ''
  )
  const [note, setNote] = useState(existing?.note ?? '')
  const [newLocationName, setNewLocationName] = useState(prefill?.suggestedLocationName ?? '')
  const [newCategoryName, setNewCategoryName] = useState(prefill?.suggestedCategoryName ?? '')
```

Note: `masterItemId`, when the prefill supplies one, refers to an id inside `categoriesForLocation`'s matching category's `masterItems` — this only renders correctly in the "표준 품목과 연결" dropdown if `categoryId` was also resolved to that same category. Since both come from the same `prefill` object (the backend only returns a `masterItemId` when it also resolved a `categoryId`), this is consistent by construction — no extra logic needed here.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 4: Run the existing test suite**

Run: `npx vitest run`
Expected: all existing tests still pass (no test file renders `NewItemPage`, so nothing should need updating).

- [ ] **Step 5: Manual verification trace**

With both `npm run dev` and `npm run dev:server` running, and a working `GEMINI_API_KEY`:
- Complete Task 3's flow with a real product URL that Gemini can extract a name/price from. Confirm `/new` opens with: the product name filled in, the matched (or first-default) location/category selected, the price filled in, "구매 링크" filled in with the pasted URL, and — if the AI didn't find a matching category — the "새 카테고리 이름" input pre-filled with its suggestion (not yet created; you'd still need to click "카테고리 추가").
- Confirm editing an EXISTING item (`/new?editId=seed-1`) is completely unaffected — `prefill` must be `undefined` whenever `existing` is defined, regardless of any stale `location.state` from browser history.
- Confirm plain manual entry (`/new` with no state at all, e.g. via the "✏️ 직접 입력" sheet option) still opens a blank form as before.

- [ ] **Step 6: Commit**

```bash
git add src/pages/NewItemPage.tsx
git commit -m "feat: prefill new-item form from analyzed link data"
```

---

### Task 5: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full frontend automated test suite**

Run: `npx vitest run`
Expected: all tests pass, same count as before this plan (no new frontend test files were added).

- [ ] **Step 2: Run the backend test suite**

Run: `npm run test:server`
Expected: the 4 existing `podium.test.mjs` tests plus this plan's 3 new `linkAnalysis.test.mjs` tests all pass. If `test:server`'s script only points at `podium.test.mjs` (from the earlier plan's fix), update it to run both files, e.g.:

```json
    "test:server": "node --test server/podium.test.mjs server/linkAnalysis.test.mjs"
```

Commit this script update if it was needed.

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit`
Expected: zero errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual golden-path walkthrough**

With `npm run dev`, `npm run dev:server` (loading `server/.env`), and a real `GEMINI_API_KEY`:
- Repeat Task 3 and Task 4's manual traces once more end-to-end with at least one real product URL.
- Confirm the failure path (a bad/unreachable URL) shows the inline error and that "직접 입력하기" still gets you to a working blank form.
- Confirm the other three record-sheet options (카메라로 촬영, 사진 선택, 직접 입력) are unaffected — still navigate straight to a blank `/new` as before.
- Confirm nothing else in the app changed — this plan only touches `server/linkAnalysis.js`, `server/index.js`, `HomePage.tsx`, `NewItemPage.tsx`, and (possibly) `package.json`'s `test:server` script.

- [ ] **Step 5: Commit final state (only if fixes were needed)**

If Steps 1-4 required any fixes, commit them now with a descriptive message. If everything passed as-is, no commit is needed for this task.
