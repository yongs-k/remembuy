# Minor Issue Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three independent, previously-deferred Minor findings from the admin-catalog and photo-analysis final reviews: `AdminPage`'s key-submit error message misreports every failure as "wrong key", `adminRoutes.js` crashes to 500 on a malformed URI-encoded id, and `/api/analyze-link` returns 502 instead of 400 for a malformed request body.

**Architecture:** Three unrelated one-file-ish fixes, one task each. Task 3 also extracts `/api/analyze-link`'s inline handler out of `server/index.js` into its own module (`server/analyzeLinkRoute.js`), mirroring `server/photoRoutes.js`'s already-proven shape — this is a deviation from the design spec's suggestion of keeping it as a local function inside `index.js`: `index.js` has top-level side effects (`server.listen(...)`, `openDb(...)`) that fire on import, so a test file cannot `import` anything from it without starting a real server on the real port and opening the real sqlite file. A separate side-effect-free module is the only way to unit-test this route the same way `photoRoutes.test.mjs` already does — same reasoning `photoRoutes.js` and `server/game/adminRoutes.js` were split out for, now applied consistently to the last inline-in-`index.js` AI route.

**Tech Stack:** Plain ESM JavaScript (server), React + TypeScript + Vitest (client). No new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-28-minor-cleanup-design.md`.
- Server code: 2-space indent, `node:test` pattern matching `server/game/adminRoutes.test.mjs`/`server/photoRoutes.test.mjs`'s http.Server-spinning style.
- No behavior change beyond what each fix specifically describes — these are targeted bug fixes, not refactors of surrounding code.
- `npx tsc --noEmit` clean and `npx vitest run` green after every client task (114 tests before this plan, all files already exist — Task 1 adds 2 tests to the *existing* `src/pages/AdminPage.test.tsx`, bringing the total to 116). `npm run test:server` green after every server task (78 tests before this plan).
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## File Structure

```
src/pages/AdminPage.tsx            # Modify: add isUnconfigured helper, branch handleUnlockSubmit 3 ways
src/pages/AdminPage.test.tsx       # Modify: add 2 tests for the new branches
server/game/adminRoutes.js         # Modify: decode item/box id before the update call, not inside its try
server/game/adminRoutes.test.mjs   # Modify: add 1 test for a malformed %-escape
server/analyzeLinkRoute.js         # Create: handleAnalyzeLinkRequest(req, res), extracted from index.js
server/analyzeLinkRoute.test.mjs   # Create
server/index.js                    # Modify: replace inline analyze-link handler with a call to the above
package.json                       # Modify: test:server script
```

---

### Task 1: AdminPage key-submit error branching

**Files:**
- Modify: `src/pages/AdminPage.tsx`, `src/pages/AdminPage.test.tsx`

**Interfaces:**
- Produces: `isUnconfigured(error: unknown): boolean` (module-private, alongside the existing `isUnauthorized`).

- [ ] **Step 1: Write the two failing tests**

`src/pages/AdminPage.test.tsx` already has (unchanged, do not touch) a test
at roughly line 34 — `'shows an inline error and stays on the gate for a
wrong key'` — that mocks `fetchAdminItems` rejecting with
`new Error('admin api 401')` and expects `'키가 올바르지 않습니다'`. Add
these two NEW tests directly after it, inside the same
`describe('AdminPage', ...)` block:

```tsx
  it('shows a distinct message and keeps the typed key when the server has no ADMIN_KEY configured', async () => {
    vi.mocked(adminApi.fetchAdminItems).mockRejectedValue(new Error('admin api 503'))
    render(<AdminPage />)
    fireEvent.change(screen.getByPlaceholderText('관리자 키'), { target: { value: 'maybe-right' } })
    fireEvent.click(screen.getByRole('button', { name: '입장' }))
    await waitFor(() =>
      expect(screen.getByText('관리자 기능이 아직 설정되지 않았어요')).toBeInTheDocument()
    )
    expect(adminApi.setAdminKey).not.toHaveBeenLastCalledWith('')
  })

  it('shows a distinct message and keeps the typed key on a network/server error', async () => {
    vi.mocked(adminApi.fetchAdminItems).mockRejectedValue(new Error('admin api 500'))
    render(<AdminPage />)
    fireEvent.change(screen.getByPlaceholderText('관리자 키'), { target: { value: 'maybe-right' } })
    fireEvent.click(screen.getByRole('button', { name: '입장' }))
    await waitFor(() => expect(screen.getByText('서버에 연결하지 못했어요')).toBeInTheDocument())
    expect(adminApi.setAdminKey).not.toHaveBeenLastCalledWith('')
  })
```

- [ ] **Step 2: Run to verify both fail**

Run: `npx vitest run src/pages/AdminPage.test.tsx`
Expected: the two new tests FAIL (the current code always shows "키가
올바르지 않습니다" and always clears the key — `setAdminKey` gets called
with `''`), the pre-existing 5 tests still PASS.

- [ ] **Step 3: Implement the fix in `AdminPage.tsx`**

Find (around line 19):

```tsx
function isUnauthorized(error: unknown): boolean {
  return error instanceof Error && error.message === 'admin api 401'
}
```

Replace with:

```tsx
function isUnauthorized(error: unknown): boolean {
  return error instanceof Error && error.message === 'admin api 401'
}

function isUnconfigured(error: unknown): boolean {
  return error instanceof Error && error.message === 'admin api 503'
}
```

Find (around line 63):

```tsx
  async function handleUnlockSubmit() {
    setAuthError(null)
    setAdminKey(keyInput)
    try {
      const res = await fetchAdminItems()
      setItems(res.items)
      setUnlocked(true)
    } catch {
      setAdminKey('')
      setAuthError('키가 올바르지 않습니다')
    }
  }
```

Replace with:

```tsx
  async function handleUnlockSubmit() {
    setAuthError(null)
    setAdminKey(keyInput)
    try {
      const res = await fetchAdminItems()
      setItems(res.items)
      setUnlocked(true)
    } catch (error) {
      if (isUnauthorized(error)) {
        setAdminKey('')
        setAuthError('키가 올바르지 않습니다')
      } else if (isUnconfigured(error)) {
        setAuthError('관리자 기능이 아직 설정되지 않았어요')
      } else {
        setAuthError('서버에 연결하지 못했어요')
      }
    }
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/pages/AdminPage.test.tsx` — expected PASS (7/7:
the pre-existing 5 plus these 2 new ones).
Run: `npx tsc --noEmit` — expected clean.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdminPage.tsx src/pages/AdminPage.test.tsx
git commit -m "fix: distinguish unconfigured-server and network errors from a wrong admin key"
```

---

### Task 2: adminRoutes.js decode-before-dispatch

**Files:**
- Modify: `server/game/adminRoutes.js`, `server/game/adminRoutes.test.mjs`

**Interfaces:** None new — this is an internal restructure of
`handleAdminRequest`'s existing PATCH branches; no signature changes.

- [ ] **Step 1: Write the failing test**

Add this test to `server/game/adminRoutes.test.mjs`, anywhere after the
existing `call()` helper definition (it needs `ADMIN_KEY` set, same
setup/teardown pattern as the file's other tests):

```js
test('a malformed %-escape in an item id returns 400, not 500', async () => {
  const original = process.env.ADMIN_KEY
  process.env.ADMIN_KEY = ADMIN_KEY
  const { base, close } = await start()
  try {
    const res = await call(base, '/api/admin/items/%', { method: 'PATCH', body: { name: 'x' } })
    assert.equal(res.status, 400)
  } finally {
    await close()
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test server/game/adminRoutes.test.mjs`
Expected: FAIL — the new test gets 500 (uncaught `URIError` from
`decodeURIComponent('%')`, since a lone `%` isn't followed by two hex
digits), not the expected 400.

- [ ] **Step 3: Implement the fix in `adminRoutes.js`**

Find (the item-PATCH branch):

```js
      try {
        sendJson(res, 200, adminUpdateItem(db, decodeURIComponent(itemMatch[1]), patch))
      } catch (error) {
        if (error.message === 'item not found') {
          sendJson(res, 404, { error: error.message })
        } else {
          throw error
        }
      }
      return
    }
```

Replace with:

```js
      let itemId
      try {
        itemId = decodeURIComponent(itemMatch[1])
      } catch {
        sendJson(res, 400, invalid)
        return
      }
      try {
        sendJson(res, 200, adminUpdateItem(db, itemId, patch))
      } catch (error) {
        if (error.message === 'item not found') {
          sendJson(res, 404, { error: error.message })
        } else {
          throw error
        }
      }
      return
    }
```

Find (the box-PATCH branch):

```js
      try {
        sendJson(res, 200, adminUpdateBox(db, decodeURIComponent(boxMatch[1]), patch))
      } catch (error) {
        if (error.message === 'box not found') {
          sendJson(res, 404, { error: error.message })
        } else {
          throw error
        }
      }
      return
    }
```

Replace with:

```js
      let boxId
      try {
        boxId = decodeURIComponent(boxMatch[1])
      } catch {
        sendJson(res, 400, invalid)
        return
      }
      try {
        sendJson(res, 200, adminUpdateBox(db, boxId, patch))
      } catch (error) {
        if (error.message === 'box not found') {
          sendJson(res, 404, { error: error.message })
        } else {
          throw error
        }
      }
      return
    }
```

(The drop-entry PATCH branch matches its id with `(\d+)` — digits only —
so it can never receive a malformed `%`-escape; it needs no change.)

- [ ] **Step 4: Run to verify it passes**

Run: `node --test server/game/adminRoutes.test.mjs` — expected PASS (9/9:
the pre-existing 8 plus this new one).

- [ ] **Step 5: Commit**

```bash
git add server/game/adminRoutes.js server/game/adminRoutes.test.mjs
git commit -m "fix: return 400 instead of 500 for a malformed admin item/box id"
```

---

### Task 3: analyze-link route restructure (extract + fix status codes)

**Files:**
- Create: `server/analyzeLinkRoute.js`, `server/analyzeLinkRoute.test.mjs`
- Modify: `server/index.js`, `package.json`

**Interfaces:**
- Consumes: `analyzeLink` (`server/linkAnalysis.js`, unchanged).
- Produces: `handleAnalyzeLinkRequest(req, res)`, handling `POST
  /api/analyze-link`'s full body-read-parse-validate-analyze flow.

- [ ] **Step 1: Write the failing tests**

Create `server/analyzeLinkRoute.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { handleAnalyzeLinkRequest } from './analyzeLinkRoute.js'

async function start() {
  const server = createServer((req, res) => {
    handleAnalyzeLinkRequest(req, res)
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
  return fetch(`${base}/api/analyze-link`, {
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

test('rejects a null JSON body with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, 'null')
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})

test('rejects a payload missing required fields with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, { url: 'https://example.com' })
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})

test('rejects wrong-typed fields with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, { url: 123, locations: [], categories: [] })
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})
```

None of these four cases reach `analyzeLink` — all fail validation
first — so no `GEMINI_API_KEY` or network access is required to run this
file, consistent with `photoRoutes.test.mjs`'s policy.

- [ ] **Step 2: Run to verify it fails**

Run: `node --test server/analyzeLinkRoute.test.mjs`
Expected: FAIL (cannot find module `./analyzeLinkRoute.js`).

- [ ] **Step 3: Implement `server/analyzeLinkRoute.js`**

```js
import { analyzeLink } from './linkAnalysis.js'

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

export function handleAnalyzeLinkRequest(req, res) {
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
    const { url, locations, categories } = parsed
    if (typeof url !== 'string' || !Array.isArray(locations) || !Array.isArray(categories)) {
      sendJson(res, 400, { error: 'invalid payload' })
      return
    }
    try {
      const result = await analyzeLink(url, locations, categories)
      sendJson(res, 200, result)
    } catch {
      sendJson(res, 502, { error: 'analysis failed' })
    }
  })
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test server/analyzeLinkRoute.test.mjs` — expected PASS
(4 tests).

- [ ] **Step 5: Wire it into `server/index.js`, removing the old inline handler**

Find:

```js
import { upsertSubmission, readSubmissions, aggregateRanking } from './podium.js'
import { analyzeLink } from './linkAnalysis.js'
import { openDb } from './game/db.js'
```

Replace with:

```js
import { upsertSubmission, readSubmissions, aggregateRanking } from './podium.js'
import { handleAnalyzeLinkRequest } from './analyzeLinkRoute.js'
import { openDb } from './game/db.js'
```

Find:

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

Replace with:

```js
  if (req.method === 'POST' && req.url === '/api/analyze-link') {
    handleAnalyzeLinkRequest(req, res)
    return
  }
```

- [ ] **Step 6: Fix `package.json`'s `test:server` script**

Find:

```json
    "test:server": "node --test server/podium.test.mjs server/linkAnalysis.test.mjs server/photoAnalysis.test.mjs server/photoRoutes.test.mjs server/game/db.test.mjs server/game/rules.test.mjs server/game/service.test.mjs server/game/routes.test.mjs server/game/itemRules.test.mjs server/game/itemService.test.mjs server/game/adminAuth.test.mjs server/game/adminService.test.mjs server/game/adminRoutes.test.mjs"
```

Replace with:

```json
    "test:server": "node --test server/podium.test.mjs server/linkAnalysis.test.mjs server/analyzeLinkRoute.test.mjs server/photoAnalysis.test.mjs server/photoRoutes.test.mjs server/game/db.test.mjs server/game/rules.test.mjs server/game/service.test.mjs server/game/routes.test.mjs server/game/itemRules.test.mjs server/game/itemService.test.mjs server/game/adminAuth.test.mjs server/game/adminService.test.mjs server/game/adminRoutes.test.mjs"
```

- [ ] **Step 7: Run the full server suite to verify everything passes**

Run: `npm run test:server` — expected PASS. Count should now be 78
(prior, already including Task 2's +1) + 4 (`analyzeLinkRoute.test.mjs`)
= 82. Confirm the exact number from the tool's own summary rather than
trusting this arithmetic — and confirm it reflects Task 2's adminRoutes
addition too, since these tasks are independent and may run in either
order.

- [ ] **Step 8: Commit**

```bash
git add server/analyzeLinkRoute.js server/analyzeLinkRoute.test.mjs server/index.js package.json
git commit -m "fix: return 400 (not 502) for a malformed analyze-link request body"
```

---

### Task 4: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Full server test suite**

Run: `npm run test:server` — expected PASS, 82/82 (see Task 3 Step 7's
arithmetic; confirm the actual reported count).

- [ ] **Step 2: Full client test suite**

Run: `npx vitest run` — expected PASS, 116/116 (114 prior + Task 1's 2
new tests).

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit` — expected clean.

- [ ] **Step 4: Production build**

Run: `npm run build` — expected to succeed.

- [ ] **Step 5: Commit** (only if Step 1-4 required any fix; skip if everything was already green — this task is verification-only and should produce no diff in the normal case)

---

Related: `docs/superpowers/specs/2026-09-28-minor-cleanup-design.md`,
[[admin-catalog]], [[photo-analysis]].
