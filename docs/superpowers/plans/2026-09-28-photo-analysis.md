# Photo Analysis Auto-Fill (Sub-project 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home screen's "카메라로 촬영" and "사진 선택" buttons (currently stubs that just navigate to `/new`) actually analyze a single product photo via Gemini Vision and prefill the new-item form, the same way the existing "링크로 가져오기" flow does for URLs.

**Architecture:** A new `server/photoAnalysis.js` mirrors `server/linkAnalysis.js`'s shape (pure prompt-building function + a Gemini call, but with an image `inlineData` part instead of page text), reusing the same `RESPONSE_SCHEMA`. A new `server/photoRoutes.js` (following the `adminRoutes.js`/`game/routes.js` mounted-module pattern, not the older inline-in-`index.js` style `analyze-link` uses) validates the request (size cap, mime-type allowlist) before calling `analyzePhoto`, so those validation paths are testable without a real Gemini call. On the client, a new `src/lib/imageResize.ts` downsizes the photo via Canvas before upload; `HomePage.tsx` wires the two buttons to hidden file inputs that trigger this pipeline immediately on selection, reusing (and lightly generalizing) the existing `AnalyzingOverlay` component; `NewItemPage.tsx` needs no logic changes, only a type update since a photo-sourced prefill has no `sourceUrl`.

**Tech Stack:** Node 24 `node:test`, `node:http` (server, no new dependency); React + TypeScript + Vitest (client, no new dependency — resize uses native Canvas/Image/FileReader APIs).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-28-photo-analysis-design.md`.
- Server code: plain ESM JavaScript, 2-space indent, `node:test` test pattern matching `server/linkAnalysis.test.mjs` and `server/game/adminRoutes.test.mjs`.
- Reuses `GEMINI_API_KEY`/`GEMINI_MODEL` from `server/.env` and the same Gemini endpoint/model-default pattern as `linkAnalysis.js`'s `callGemini` — no new env vars, no new dependency.
- `/api/analyze-photo` request body cap: 8 MB (`8 * 1024 * 1024`), distinct from `adminRoutes.js`'s unrelated 64KB admin-payload cap. Exceeding it returns 413, not 400.
- Allowed image mime types: exactly `image/jpeg`, `image/png`, `image/webp`. Anything else is a 400.
- The photo is never persisted — not to disk, not to the sqlite db, not to any `Item` field. It exists only as a base64 string for the duration of one Gemini call.
- Client image resize: long side capped at 1280px (no upscaling), re-encoded as JPEG quality 0.8, using only native `Canvas`/`Image`/`FileReader` — no new dependency.
- Result shape is intentionally identical to `LinkAnalysisResult`'s 9 fields (minus any URL-specific field) — no new prefill type, `NewItemPage.tsx`'s existing prefill-seeding `useState` initializers are reused unchanged.
- No auto-creation of locations/categories from AI suggestions — same explicit rule as link-analysis; suggestions only pre-fill the existing manual "add" text inputs.
- `npx tsc --noEmit` clean and `npx vitest run` green after every client task (114 tests before this plan); `npm run test:server` green after every server task (68 tests before this plan).
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## File Structure

```
server/linkAnalysis.js                 # Modify: export RESPONSE_SCHEMA
server/photoAnalysis.js                # Create
server/photoAnalysis.test.mjs          # Create
server/photoRoutes.js                  # Create
server/photoRoutes.test.mjs            # Create
server/index.js                        # Modify: mount handlePhotoRequest
package.json                           # Modify: test:server script
src/lib/imageResize.ts                 # Create
src/components/AnalyzingOverlay.tsx    # Modify: generalize props for reuse
src/pages/NewItemPage.tsx              # Modify: generalize prefill type
src/pages/HomePage.tsx                 # Modify: wire photo buttons
```

---

### Task 1: Photo analysis service (prompt builder, mime-type check, Gemini vision call)

**Files:**
- Modify: `server/linkAnalysis.js`
- Create: `server/photoAnalysis.js`, `server/photoAnalysis.test.mjs`

**Interfaces:**
- Consumes: nothing new from prior tasks.
- Produces: `buildPhotoPrompt(locations, categories)` -> `string`; `isAllowedImageMimeType(mimeType)` -> `boolean`; `callGeminiVision(prompt, imageBase64, mimeType)` -> `Promise<object>`; `analyzePhoto(imageBase64, mimeType, locations, categories)` -> `Promise<object>` (same 9-field shape as `LinkAnalysisResult`, minus any URL field). Also makes `RESPONSE_SCHEMA` importable from `linkAnalysis.js`.

- [ ] **Step 1: Export `RESPONSE_SCHEMA` from `linkAnalysis.js`**

In `server/linkAnalysis.js`, find (around line 69):

```js
const RESPONSE_SCHEMA = {
```

Replace with:

```js
export const RESPONSE_SCHEMA = {
```

No other change to that file. Run `node --test server/linkAnalysis.test.mjs` — expected PASS (4 tests, unchanged), confirming the export didn't break anything.

- [ ] **Step 2: Write the failing tests**

Create `server/photoAnalysis.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPhotoPrompt, isAllowedImageMimeType } from './photoAnalysis.js'

test('buildPhotoPrompt includes the location/category names', () => {
  const locations = [{ id: 'bathroom', name: '욕실' }]
  const categories = [
    {
      id: 'bathroom-skincare',
      locationId: 'bathroom',
      name: '스킨케어',
      masterItems: [{ id: 'bathroom-skincare-sunscreen', name: '선크림' }],
    },
  ]
  const prompt = buildPhotoPrompt(locations, categories)
  assert.match(prompt, /욕실/)
  assert.match(prompt, /스킨케어/)
  assert.match(prompt, /선크림/)
})

test('buildPhotoPrompt does not embed any image data (the image travels separately as inlineData)', () => {
  const prompt = buildPhotoPrompt([], [])
  assert.doesNotMatch(prompt, /base64/i)
  assert.doesNotMatch(prompt, /data:image/i)
})

test('isAllowedImageMimeType accepts jpeg, png, and webp', () => {
  assert.equal(isAllowedImageMimeType('image/jpeg'), true)
  assert.equal(isAllowedImageMimeType('image/png'), true)
  assert.equal(isAllowedImageMimeType('image/webp'), true)
})

test('isAllowedImageMimeType rejects anything else', () => {
  assert.equal(isAllowedImageMimeType('image/gif'), false)
  assert.equal(isAllowedImageMimeType('application/pdf'), false)
  assert.equal(isAllowedImageMimeType(''), false)
  assert.equal(isAllowedImageMimeType(undefined), false)
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `node --test server/photoAnalysis.test.mjs`
Expected: FAIL (cannot find module `./photoAnalysis.js`).

- [ ] **Step 4: Implement `server/photoAnalysis.js`**

```js
import { RESPONSE_SCHEMA } from './linkAnalysis.js'

const DEFAULT_MODEL = 'gemini-3.6-flash'
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function isAllowedImageMimeType(mimeType) {
  return ALLOWED_MIME_TYPES.includes(mimeType)
}

export function buildPhotoPrompt(locations, categories) {
  const locationList = locations.map((l) => `- ${l.id}: ${l.name}`).join('\n')
  const categoryList = categories
    .map((c) => {
      const items = c.masterItems.map((m) => `${m.id}:${m.name}`).join(', ')
      return `- ${c.id} (in ${c.locationId}): ${c.name}${items ? ` [items: ${items}]` : ''}`
    })
    .join('\n')

  return `You are identifying a household product from a photo, to prefill a household-inventory app's "add item" form.

Existing locations:
${locationList}

Existing categories (with their standard items):
${categoryList}

Look at the attached photo and extract: the product name, a matching locationId/categoryId/masterItemId from the lists above if one clearly fits (else null and a suggested new name), and a plausible restock cycle description in Korean (e.g. "약 2개월마다") based on the product type. The photo shows the product itself, not a receipt or a price tag — only fill "place" (store/brand name) or "price" if you can actually read it in the image (e.g. a visible price sticker or store logo); otherwise return null for those two fields. Return null for any field you cannot reasonably determine — never guess.`
}

export async function callGeminiVision(prompt, imageBase64, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }] }],
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

export async function analyzePhoto(imageBase64, mimeType, locations, categories) {
  const prompt = buildPhotoPrompt(locations, categories)
  return callGeminiVision(prompt, imageBase64, mimeType)
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `node --test server/photoAnalysis.test.mjs` — expected PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add server/linkAnalysis.js server/photoAnalysis.js server/photoAnalysis.test.mjs
git commit -m "feat: add photo analysis service (prompt builder, mime check, Gemini vision call)"
```

---

### Task 2: Photo analysis HTTP route (validation + mounting point)

**Files:**
- Create: `server/photoRoutes.js`, `server/photoRoutes.test.mjs`

**Interfaces:**
- Consumes: `analyzePhoto`, `isAllowedImageMimeType` (Task 1).
- Produces: `handlePhotoRequest(req, res)` — handles `POST /api/analyze-photo` only; any other method/path on this handler returns 404 (the caller, Task 3, only routes matching requests here, but the handler is self-contained for testing).

- [ ] **Step 1: Write the failing tests**

Create `server/photoRoutes.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { handlePhotoRequest } from './photoRoutes.js'

async function start() {
  const server = createServer((req, res) => {
    handlePhotoRequest(req, res)
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
  return fetch(`${base}/api/analyze-photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

test('rejects an unsupported mime type with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, {
      imageBase64: 'aGVsbG8=',
      mimeType: 'image/gif',
      locations: [],
      categories: [],
    })
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})

test('rejects malformed JSON with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, '{not json')
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})

test('rejects a payload missing required fields with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, { mimeType: 'image/jpeg', locations: [], categories: [] })
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})

test('rejects a body over the 8MB cap with 413', async () => {
  const { base, close } = await start()
  try {
    const oversized = 'a'.repeat(9 * 1024 * 1024)
    const res = await call(base, {
      imageBase64: oversized,
      mimeType: 'image/jpeg',
      locations: [],
      categories: [],
    })
    assert.equal(res.status, 413)
  } finally {
    await close()
  }
})

test('unknown routes return 404', async () => {
  const { base, close } = await start()
  try {
    const res = await fetch(`${base}/api/analyze-photo/nope`, { method: 'POST' })
    assert.equal(res.status, 404)
  } finally {
    await close()
  }
})
```

Note: none of these five cases reach `analyzePhoto` (they all fail validation
first), so no `GEMINI_API_KEY` or network access is required to run this
file — consistent with `linkAnalysis.js`'s policy of not testing the real
Gemini call.

- [ ] **Step 2: Run to verify it fails**

Run: `node --test server/photoRoutes.test.mjs`
Expected: FAIL (cannot find module `./photoRoutes.js`).

- [ ] **Step 3: Implement `server/photoRoutes.js`**

```js
import { analyzePhoto, isAllowedImageMimeType } from './photoAnalysis.js'

const MAX_BODY_BYTES = 8 * 1024 * 1024

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

function readLimitedBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let tooLarge = false
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        tooLarge = true
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(tooLarge ? null : Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

export async function handlePhotoRequest(req, res) {
  if (req.method !== 'POST' || req.url !== '/api/analyze-photo') {
    sendJson(res, 404, { error: 'not found' })
    return
  }
  try {
    const raw = await readLimitedBody(req, MAX_BODY_BYTES)
    if (raw === null) {
      sendJson(res, 413, { error: 'image too large' })
      return
    }
    let body
    try {
      body = JSON.parse(raw)
    } catch {
      sendJson(res, 400, { error: 'invalid payload' })
      return
    }
    const { imageBase64, mimeType, locations, categories } = body
    if (
      typeof imageBase64 !== 'string' ||
      imageBase64.length === 0 ||
      typeof mimeType !== 'string' ||
      !Array.isArray(locations) ||
      !Array.isArray(categories)
    ) {
      sendJson(res, 400, { error: 'invalid payload' })
      return
    }
    if (!isAllowedImageMimeType(mimeType)) {
      sendJson(res, 400, { error: 'unsupported image type' })
      return
    }
    const result = await analyzePhoto(imageBase64, mimeType, locations, categories)
    sendJson(res, 200, result)
  } catch {
    sendJson(res, 502, { error: 'analysis failed' })
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test server/photoRoutes.test.mjs` — expected PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add server/photoRoutes.js server/photoRoutes.test.mjs
git commit -m "feat: add photo analysis HTTP route with size/mime validation"
```

---

### Task 3: Mount the route and fix the test:server script

**Files:**
- Modify: `server/index.js`, `package.json`

**Interfaces:**
- Consumes: `handlePhotoRequest` (Task 2).

- [ ] **Step 1: Mount in `server/index.js`**

Find:

```js
import { handleAdminRequest } from './game/adminRoutes.js'
```

Replace with:

```js
import { handleAdminRequest } from './game/adminRoutes.js'
import { handlePhotoRequest } from './photoRoutes.js'
```

Find:

```js
  if (req.method === 'POST' && req.url === '/api/analyze-link') {
```

Replace with:

```js
  if (req.method === 'POST' && req.url === '/api/analyze-photo') {
    handlePhotoRequest(req, res)
    return
  }

  if (req.method === 'POST' && req.url === '/api/analyze-link') {
```

- [ ] **Step 2: Fix `package.json`'s `test:server` script**

Find:

```json
    "test:server": "node --test server/podium.test.mjs server/linkAnalysis.test.mjs server/game/db.test.mjs server/game/rules.test.mjs server/game/service.test.mjs server/game/routes.test.mjs server/game/itemRules.test.mjs server/game/itemService.test.mjs server/game/adminAuth.test.mjs server/game/adminService.test.mjs server/game/adminRoutes.test.mjs"
```

Replace with:

```json
    "test:server": "node --test server/podium.test.mjs server/linkAnalysis.test.mjs server/photoAnalysis.test.mjs server/photoRoutes.test.mjs server/game/db.test.mjs server/game/rules.test.mjs server/game/service.test.mjs server/game/routes.test.mjs server/game/itemRules.test.mjs server/game/itemService.test.mjs server/game/adminAuth.test.mjs server/game/adminService.test.mjs server/game/adminRoutes.test.mjs"
```

- [ ] **Step 3: Run to verify everything passes**

Run: `npm run test:server` — expected PASS, 68 (prior) + 4 (`photoAnalysis.test.mjs`) + 5 (`photoRoutes.test.mjs`) = 77. Confirm the exact number from the tool's own summary rather than trusting this arithmetic.

- [ ] **Step 4: Commit**

```bash
git add server/index.js package.json
git commit -m "feat: mount photo analysis route; add its tests to test:server"
```

---

### Task 4: Client-side image resize helper

**Files:**
- Create: `src/lib/imageResize.ts`

**Interfaces:**
- Produces: `resizeImageToBase64(file: File, maxDimension?: number, quality?: number) => Promise<{ base64: string; mimeType: string }>`. `base64` has no `data:...;base64,` prefix. `mimeType` is always `'image/jpeg'` (the function always re-encodes to JPEG, regardless of the source file's format).

No automated test for this file: per the spec's Testing section, jsdom
(this project's Vitest environment) has no real `<canvas>`/`Image`
decoding pipeline, so a unit test here would either not run at all or
only prove that mocks were called — not that resizing works. Verified
instead via manual trace once Task 6 wires it into the UI (a real photo,
a real browser).

- [ ] **Step 1: Implement `src/lib/imageResize.ts`**

```ts
export async function resizeImageToBase64(
  file: File,
  maxDimension = 1280,
  quality = 0.8
): Promise<{ base64: string; mimeType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('failed to read file'))
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('failed to decode image'))
    image.src = dataUrl
  })

  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
  const width = Math.round(img.width * scale)
  const height = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  ctx.drawImage(img, 0, 0, width, height)

  const resizedDataUrl = canvas.toDataURL('image/jpeg', quality)
  const base64 = resizedDataUrl.split(',')[1]
  return { base64, mimeType: 'image/jpeg' }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit` — expected clean (no output).

- [ ] **Step 3: Commit**

```bash
git add src/lib/imageResize.ts
git commit -m "feat: add client-side image resize helper for photo upload"
```

---

### Task 5: Generalize `NewItemPage`'s prefill type for a photo-sourced prefill

**Files:**
- Modify: `src/pages/NewItemPage.tsx`

**Interfaces:**
- Produces: `RecordPrefill` type (renamed from `LinkAnalysisPrefill`), with `sourceUrl` now optional. No other behavior changes — the existing `useState` initializers that read `prefill?.field` already handle a missing field via `??`.

- [ ] **Step 1: Rename the type and make `sourceUrl` optional**

Find (around line 14):

```ts
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

Replace with:

```ts
type RecordPrefill = {
  name: string | null
  locationId: string | null
  suggestedLocationName: string | null
  categoryId: string | null
  suggestedCategoryName: string | null
  masterItemId: string | null
  place: string | null
  price: number | null
  restockCycle: string | null
  sourceUrl?: string
}
```

Find (around line 54):

```ts
    ? (location.state as { prefill?: LinkAnalysisPrefill } | null)?.prefill
```

Replace with:

```ts
    ? (location.state as { prefill?: RecordPrefill } | null)?.prefill
```

- [ ] **Step 2: Verify it compiles and existing tests still pass**

Run: `npx tsc --noEmit` — expected clean.
Run: `npx vitest run` — expected PASS, 114/114 (no test references the old
type name, since `NewItemPage.tsx` has no test file — confirmed absent
from `src/pages/*.test.tsx`).

- [ ] **Step 3: Commit**

```bash
git add src/pages/NewItemPage.tsx
git commit -m "refactor: generalize NewItemPage prefill type for photo-sourced prefills"
```

---

### Task 6: Generalize `AnalyzingOverlay` and wire the photo buttons in `HomePage`

**Files:**
- Modify: `src/components/AnalyzingOverlay.tsx`, `src/pages/HomePage.tsx`

**Interfaces:**
- Consumes: `resizeImageToBase64` (Task 4); `POST /api/analyze-photo` (Task 3); the generalized `AnalyzingOverlay` props (this task, first half).
- Produces: working "카메라로 촬영" and "사진 선택" buttons that navigate to `/new` with a populated `prefill` route-state field, matching the existing link-import UX pattern.

- [ ] **Step 1: Generalize `AnalyzingOverlay`'s props**

`AnalyzingOverlay` currently hardcodes link-specific copy (`url` prop,
`aria-label="링크 분석 중"`, a hardcoded `link` icon). Generalize it to take
a label, a dialog title, and an icon name, each defaulting to today's
link-flow values so the existing call site keeps working with only the
one required-prop rename below.

Find (around line 19):

```tsx
export function AnalyzingOverlay({
  url,
  entryNumber,
  onCancel,
}: {
  url: string
  entryNumber: number
  onCancel: () => void
}) {
```

Replace with:

```tsx
export function AnalyzingOverlay({
  sourceLabel,
  entryNumber,
  onCancel,
  icon = 'link',
  dialogLabel = '링크 분석 중',
}: {
  sourceLabel: string
  entryNumber: number
  onCancel: () => void
  icon?: string
  dialogLabel?: string
}) {
```

Find (around line 40):

```tsx
      aria-label="링크 분석 중"
```

Replace with:

```tsx
      aria-label={dialogLabel}
```

Find (around lines 75-78):

```tsx
          <div className="mt-space-sm flex items-center gap-2 rounded-xl bg-surface-container-lowest p-space-sm">
            <Icon name="link" className="text-[20px] text-primary" />
            <span className="min-w-0 truncate text-body-sm text-on-surface">{url}</span>
          </div>
```

Replace with:

```tsx
          <div className="mt-space-sm flex items-center gap-2 rounded-xl bg-surface-container-lowest p-space-sm">
            <Icon name={icon} className="text-[20px] text-primary" />
            <span className="min-w-0 truncate text-body-sm text-on-surface">{sourceLabel}</span>
          </div>
```

- [ ] **Step 2: Update `HomePage.tsx`'s existing link-flow call site**

Find (around line 359-365):

```tsx
      {isAnalyzing && (
        <AnalyzingOverlay
          url={linkUrl}
          entryNumber={items.length + 1}
          onCancel={handleCancelAnalyze}
        />
      )}
```

Replace with:

```tsx
      {isAnalyzing && (
        <AnalyzingOverlay
          sourceLabel={linkUrl}
          entryNumber={items.length + 1}
          onCancel={handleCancelAnalyze}
        />
      )}
      {isAnalyzingPhoto && (
        <AnalyzingOverlay
          sourceLabel={photoLabel}
          icon="photo_camera"
          dialogLabel="사진 분석 중"
          entryNumber={items.length + 1}
          onCancel={handleCancelAnalyze}
        />
      )}
```

(`handleCancelAnalyze` is reused as-is for both overlays — it only aborts
`abortRef.current`, and only one analysis flow can be in progress at a
time from this sheet, so one shared abort ref is safe.)

- [ ] **Step 3: Add photo-flow state and imports**

Find (around line 9, the existing imports):

```tsx
import { AnalyzingOverlay } from '../components/AnalyzingOverlay'
```

Replace with:

```tsx
import { AnalyzingOverlay } from '../components/AnalyzingOverlay'
import { resizeImageToBase64 } from '../lib/imageResize'
```

Find (around line 27):

```tsx
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
```

Replace with:

```tsx
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false)
  const [photoLabel, setPhotoLabel] = useState('')
  const abortRef = useRef<AbortController | null>(null)
```

- [ ] **Step 4: Add the photo-file handler**

Find (around line 88, right after `handleAnalyzeLink`'s closing brace):

```tsx
  function handleCancelAnalyze() {
    abortRef.current?.abort()
  }
```

Replace with:

```tsx
  function handleCancelAnalyze() {
    abortRef.current?.abort()
  }

  async function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const controller = new AbortController()
    abortRef.current = controller
    setPhotoLabel(file.name)
    setIsAnalyzingPhoto(true)
    setAnalyzeError(null)
    try {
      const { base64, mimeType } = await resizeImageToBase64(file)
      const res = await fetch('/api/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType, locations, categories }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error('analyze failed')
      const result = await res.json()
      navigate('/new', { state: { prefill: result } })
    } catch {
      if (!controller.signal.aborted) setAnalyzeError('사진을 분석하지 못했어요.')
    } finally {
      setIsAnalyzingPhoto(false)
    }
  }
```

- [ ] **Step 5: Wire the two option buttons to hidden file inputs, and show errors in the options view**

Find (around lines 270-277):

```tsx
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-ink p-3 text-left text-on-surface"
                >
                  <Icon name="photo_camera" className="text-[20px] text-primary" />
                  <span>카메라로 촬영</span>
                </button>
```

Replace with:

```tsx
                <label className="flex w-full items-center gap-3 rounded-xl border-2 border-ink p-3 text-left text-on-surface">
                  <Icon name="photo_camera" className="text-[20px] text-primary" />
                  <span>카메라로 촬영</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    onChange={handlePhotoFile}
                  />
                </label>
```

Find (around lines 278-285):

```tsx
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-ink p-3 text-left text-on-surface"
                >
                  <Icon name="image" className="text-[20px] text-primary" />
                  <span>사진 선택</span>
                </button>
```

Replace with:

```tsx
                <label className="flex w-full items-center gap-3 rounded-xl border-2 border-ink p-3 text-left text-on-surface">
                  <Icon name="image" className="text-[20px] text-primary" />
                  <span>사진 선택</span>
                  <input type="file" accept="image/*" hidden onChange={handlePhotoFile} />
                </label>
```

Find (around lines 294-308, the "직접 입력" button followed by "취소" —
the end of the options sub-view):

```tsx
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-ink p-3 text-left text-on-surface"
                >
                  <Icon name="edit_note" className="text-[20px] text-primary" />
                  <span>직접 입력</span>
                </button>
                <button
                  type="button"
                  onClick={closeRecordSheet}
                  className="w-full pt-2 text-center text-body-sm text-on-surface-variant"
                >
                  취소
                </button>
```

Replace with:

```tsx
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-ink p-3 text-left text-on-surface"
                >
                  <Icon name="edit_note" className="text-[20px] text-primary" />
                  <span>직접 입력</span>
                </button>
                {analyzeError && (
                  <>
                    <p role="alert" className="text-body-sm text-primary">
                      {analyzeError}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/new')}
                      className="w-full pt-1 text-center text-label-md text-primary underline"
                    >
                      직접 입력하기
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={closeRecordSheet}
                  className="w-full pt-2 text-center text-body-sm text-on-surface-variant"
                >
                  취소
                </button>
```

(This error block was previously only reachable from the link-input
sub-view; the photo flow fails from the *options* sub-view — the file
input never switches `showLinkInput` — so the same `analyzeError` state
now needs a visible spot there too. The link-input sub-view's own error
display, further down the file, is unchanged.)

- [ ] **Step 6: Verify it compiles and existing tests still pass**

Run: `npx tsc --noEmit` — expected clean.
Run: `npx vitest run` — expected PASS, 114/114 (`HomePage.tsx` has no test
file — confirmed absent from `src/pages/*.test.tsx` — so this task adds no
new automated frontend coverage, consistent with link-analysis's
precedent for this class of page-level wiring).

- [ ] **Step 7: Commit**

```bash
git add src/components/AnalyzingOverlay.tsx src/pages/HomePage.tsx
git commit -m "feat: wire camera/photo buttons to photo analysis auto-fill"
```

---

### Task 7: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Full server test suite**

Run: `npm run test:server` — expected PASS, 77/77 (see Task 3's arithmetic;
confirm the actual reported count).

- [ ] **Step 2: Full client test suite**

Run: `npx vitest run` — expected PASS, 114/114.

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit` — expected clean.

- [ ] **Step 4: Production build**

Run: `npm run build` — expected to succeed.

- [ ] **Step 5: Document the manual trace that automated tests cannot cover**

Append a short note to this plan's SDD report (or the final review
package) recording that the following was checked manually, with a real
`GEMINI_API_KEY` and both `npm run dev` and `npm run dev:server` running:
select "카메라로 촬영" or "사진 선택" with a real product photo, confirm the
loading overlay appears and then `/new` opens pre-filled with a plausible
name/location/category, and confirm a deliberately-broken flow (e.g. no
`GEMINI_API_KEY` set) shows the inline error + "직접 입력하기" fallback
instead of hanging or crashing. This mirrors `link-analysis`'s existing
precedent of verifying real external-API glue by trace rather than by
automated test — the two flows' validation logic (Tasks 1-2) is
covered by `node:test`; the network-and-browser glue is not.

- [ ] **Step 6: Commit** (only if Step 5's note was written to a tracked file; skip if it only went into an SDD-workspace report, which is git-ignored)

```bash
git add -A
git commit -m "docs: record manual verification notes for photo analysis feature"
```

---

Related: [[link-analysis]], [[admin-catalog]], `docs/superpowers/specs/2026-09-28-photo-analysis-design.md`.
