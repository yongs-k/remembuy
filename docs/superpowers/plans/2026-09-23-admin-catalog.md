# Admin Catalog (Sub-project 4a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-key-gated `/admin` page for editing the values of existing virtual items, boxes, and box-drop-table entries — the tuning knobs sub-project 2 hardcoded as seed data.

**Architecture:** Same server layering as sub-projects 1-2 (`db.js` schema already exists; a new `adminService.js` reads/writes it; a new `adminRoutes.js` is the HTTP layer, gated by a new `adminAuth.js` instead of the existing per-user `X-Device-Id` scheme). A parallel client `adminApi.ts` (its own `request<T>`, `X-Admin-Key` instead of `X-Device-Id`) backs a standalone `AdminPage` route outside the consumer app's `<AppLayout>` tab shell.

**Tech Stack:** Node 24 `node:sqlite`, `node:test` (server); React + TypeScript + Vitest + `@testing-library/react` (client). No new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-23-admin-catalog-design.md`.
- Server code: plain ESM JavaScript, 2-space indent, `node:sqlite` `DatabaseSync`, every multi-row write inside `transaction(db, fn)` from `./db.js`, rows copied with `{ ...row }` before crossing a function boundary (`node:sqlite` rows have a null prototype) — same conventions as `server/game/itemService.js`.
- Admin auth is NOT the existing `X-Device-Id` scheme. `checkAdminAuth(req)` returns `'unconfigured' | 'unauthorized' | 'ok'` (a refinement of the spec's boolean sketch, needed so the route layer doesn't re-read `process.env.ADMIN_KEY` itself just to pick a status code): `'unconfigured'` → 503, `'unauthorized'` → 401, `'ok'` → proceed.
- Editable fields only: `virtual_items` (`name`, `fragments_required`, `active`), `boxes` (`name`, `cost_points`, `active`), `box_drop_entries` (`weight`, `active`). No create/delete of any row. `grade`, `box_id`, `item_id`, `result_type` are never editable.
- Client: Tailwind font-size scale classes are `text-display-lg|display-sm|headline-lg|headline-md|body-lg|body-md|body-sm|label-lg|label-md|label-sm|stat-counter`, spacing tokens `space-xs|sm|md|lg|xl`/`gutter`/`margin` — but `AdminPage` and its row components are an internal tool with NO Stitch mockup to match, so plain Tailwind utility classes (`p-2`, `border`, `text-sm`, etc.) are fine here; the design-token scale is not required for this feature.
- `/admin` is a standalone top-level route (sibling of the `<AppLayout>` route group in `src/App.tsx`), not nested inside it — no admin link anywhere in the consumer UI.
- `npx tsc --noEmit` clean and `npx vitest run` green after every client task (93 tests before this plan); `npm run test:server` green after every server task (36 tests before this plan, but see Task 3 — the script itself is missing two existing test files, fixed there).
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## File Structure

```
server/game/adminAuth.js               # Create
server/game/adminAuth.test.mjs         # Create
server/game/adminService.js            # Create
server/game/adminService.test.mjs      # Create
server/game/adminRoutes.js             # Create
server/game/adminRoutes.test.mjs       # Create
server/index.js                        # Modify: mount handleAdminRequest
package.json                           # Modify: test:server script
src/lib/adminApi.ts                    # Create
src/lib/adminApi.test.ts               # Create
src/components/admin/AdminItemRow.tsx      # Create
src/components/admin/AdminItemRow.test.tsx # Create
src/components/admin/AdminBoxRow.tsx       # Create
src/components/admin/AdminBoxRow.test.tsx  # Create
src/components/admin/AdminDropEntryRow.tsx      # Create
src/components/admin/AdminDropEntryRow.test.tsx # Create
src/pages/AdminPage.tsx                # Create
src/pages/AdminPage.test.tsx           # Create
src/App.tsx                            # Modify: add /admin route
```

---

### Task 1: Admin auth helper

**Files:**
- Create: `server/game/adminAuth.js`, `server/game/adminAuth.test.mjs`

**Interfaces:**
- Produces: `checkAdminAuth(req)` -> `'unconfigured' | 'unauthorized' | 'ok'`. Reads `process.env.ADMIN_KEY` and the request's `x-admin-key` header.

- [ ] **Step 1: Write the failing test**

Create `server/game/adminAuth.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { checkAdminAuth } from './adminAuth.js'

function reqWithHeader(headerValue) {
  return { headers: headerValue === undefined ? {} : { 'x-admin-key': headerValue } }
}

test('checkAdminAuth returns "unconfigured" when ADMIN_KEY is unset', () => {
  const original = process.env.ADMIN_KEY
  delete process.env.ADMIN_KEY
  try {
    assert.equal(checkAdminAuth(reqWithHeader('anything')), 'unconfigured')
    assert.equal(checkAdminAuth(reqWithHeader(undefined)), 'unconfigured')
  } finally {
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})

test('checkAdminAuth returns "unauthorized" for a missing or wrong key when ADMIN_KEY is set', () => {
  const original = process.env.ADMIN_KEY
  process.env.ADMIN_KEY = 'secret123'
  try {
    assert.equal(checkAdminAuth(reqWithHeader(undefined)), 'unauthorized')
    assert.equal(checkAdminAuth(reqWithHeader('wrong')), 'unauthorized')
  } finally {
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})

test('checkAdminAuth returns "ok" for the exact matching key', () => {
  const original = process.env.ADMIN_KEY
  process.env.ADMIN_KEY = 'secret123'
  try {
    assert.equal(checkAdminAuth(reqWithHeader('secret123')), 'ok')
  } finally {
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test server/game/adminAuth.test.mjs`
Expected: FAIL (cannot find module `./adminAuth.js`).

- [ ] **Step 3: Implement `server/game/adminAuth.js`**

```js
export function checkAdminAuth(req) {
  const configured = process.env.ADMIN_KEY
  if (!configured) return 'unconfigured'
  const provided = req.headers['x-admin-key']
  if (typeof provided !== 'string' || provided !== configured) return 'unauthorized'
  return 'ok'
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test server/game/adminAuth.test.mjs` — expected PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/game/adminAuth.js server/game/adminAuth.test.mjs
git commit -m "feat: add admin key auth check"
```

---

### Task 2: Admin service (list/update items, boxes, drop entries)

**Files:**
- Create: `server/game/adminService.js`, `server/game/adminService.test.mjs`

**Interfaces:**
- Consumes: `transaction` (`./db.js`), `openDb` (test only).
- Produces:
  - `adminListItems(db)` -> `Array<{ id, name, grade, fragmentsRequired, active }>` (ALL rows, including inactive — unlike `itemService.js`'s `getDex`).
  - `adminUpdateItem(db, id, patch)` -> the updated row (same shape); throws `Error('item not found')` for an unknown id. `patch` may include any of `name`, `fragmentsRequired`, `active`; only given fields change.
  - `adminListBoxes(db)` -> `Array<{ id, name, costPoints, active }>` (ALL rows).
  - `adminUpdateBox(db, id, patch)` -> the updated row; throws `Error('box not found')`. `patch` may include `name`, `costPoints`, `active`.
  - `adminListDropEntries(db)` -> `Array<{ id, boxId, itemId, itemName, resultType, weight, active }>` (ALL rows, item name joined in).
  - `adminUpdateDropEntry(db, id, patch)` -> the updated row; throws `Error('drop entry not found')`. `patch` may include `weight`, `active`.

- [ ] **Step 1: Write the failing tests**

Create `server/game/adminService.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { openDb } from './db.js'
import {
  adminListItems,
  adminUpdateItem,
  adminListBoxes,
  adminUpdateBox,
  adminListDropEntries,
  adminUpdateDropEntry,
} from './adminService.js'

test('adminListItems returns every item including inactive ones', () => {
  const db = openDb(':memory:')
  db.prepare("UPDATE virtual_items SET active = 0 WHERE id = 'item-basin-basic'").run()
  const items = adminListItems(db)
  assert.equal(items.length, 14)
  const basin = items.find((i) => i.id === 'item-basin-basic')
  assert.equal(basin.active, false)
  assert.deepEqual(Object.keys(basin).sort(), ['active', 'fragmentsRequired', 'grade', 'id', 'name'].sort())
})

test('adminUpdateItem applies only the given fields and returns the updated row', () => {
  const db = openDb(':memory:')
  const updated = adminUpdateItem(db, 'item-basin-basic', { name: '새 이름' })
  assert.equal(updated.name, '새 이름')
  assert.equal(updated.fragmentsRequired, 10)
  assert.equal(updated.active, true)

  const updated2 = adminUpdateItem(db, 'item-basin-basic', { fragmentsRequired: 5, active: false })
  assert.equal(updated2.name, '새 이름')
  assert.equal(updated2.fragmentsRequired, 5)
  assert.equal(updated2.active, false)
})

test('adminUpdateItem throws for an unknown id', () => {
  const db = openDb(':memory:')
  assert.throws(() => adminUpdateItem(db, 'no-such-item', { name: 'x' }), /item not found/)
})

test('adminListBoxes returns every box including inactive ones', () => {
  const db = openDb(':memory:')
  db.prepare("UPDATE boxes SET active = 0 WHERE id = 'box-starter'").run()
  const boxes = adminListBoxes(db)
  assert.equal(boxes.length, 1)
  assert.equal(boxes[0].active, false)
})

test('adminUpdateBox applies only the given fields and returns the updated row', () => {
  const db = openDb(':memory:')
  const updated = adminUpdateBox(db, 'box-starter', { costPoints: 700 })
  assert.equal(updated.costPoints, 700)
  assert.equal(updated.name, '시작 상자')
})

test('adminUpdateBox throws for an unknown id', () => {
  const db = openDb(':memory:')
  assert.throws(() => adminUpdateBox(db, 'no-such-box', { costPoints: 1 }), /box not found/)
})

test('adminListDropEntries returns every entry with the item name joined', () => {
  const db = openDb(':memory:')
  const entries = adminListDropEntries(db)
  assert.equal(entries.length, 28)
  const first = entries[0]
  assert.deepEqual(
    Object.keys(first).sort(),
    ['active', 'boxId', 'id', 'itemId', 'itemName', 'resultType', 'weight'].sort()
  )
  assert.ok(entries.every((e) => typeof e.itemName === 'string' && e.itemName.length > 0))
})

test('adminUpdateDropEntry applies only the given fields and returns the updated row', () => {
  const db = openDb(':memory:')
  const [first] = adminListDropEntries(db)
  const updated = adminUpdateDropEntry(db, first.id, { weight: 999 })
  assert.equal(updated.weight, 999)
  assert.equal(updated.active, true)
})

test('adminUpdateDropEntry throws for an unknown id', () => {
  const db = openDb(':memory:')
  assert.throws(() => adminUpdateDropEntry(db, 999999, { weight: 1 }), /drop entry not found/)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test server/game/adminService.test.mjs`
Expected: FAIL (cannot find module `./adminService.js`).

- [ ] **Step 3: Implement `server/game/adminService.js`**

```js
import { transaction } from './db.js'

const plain = (rows) => rows.map((row) => ({ ...row }))

export function adminListItems(db) {
  return plain(
    db
      .prepare('SELECT id, name, grade, fragments_required, active FROM virtual_items ORDER BY grade, id')
      .all()
  ).map((row) => ({
    id: row.id,
    name: row.name,
    grade: row.grade,
    fragmentsRequired: row.fragments_required,
    active: row.active === 1,
  }))
}

export function adminUpdateItem(db, id, patch) {
  return transaction(db, () => {
    const existing = db.prepare('SELECT id FROM virtual_items WHERE id = ?').get(id)
    if (!existing) throw new Error('item not found')
    if (patch.name !== undefined) {
      db.prepare('UPDATE virtual_items SET name = ? WHERE id = ?').run(patch.name, id)
    }
    if (patch.fragmentsRequired !== undefined) {
      db.prepare('UPDATE virtual_items SET fragments_required = ? WHERE id = ?').run(
        patch.fragmentsRequired,
        id
      )
    }
    if (patch.active !== undefined) {
      db.prepare('UPDATE virtual_items SET active = ? WHERE id = ?').run(patch.active ? 1 : 0, id)
    }
    return adminListItems(db).find((item) => item.id === id)
  })
}

export function adminListBoxes(db) {
  return plain(db.prepare('SELECT id, name, cost_points, active FROM boxes ORDER BY id').all()).map(
    (row) => ({ id: row.id, name: row.name, costPoints: row.cost_points, active: row.active === 1 })
  )
}

export function adminUpdateBox(db, id, patch) {
  return transaction(db, () => {
    const existing = db.prepare('SELECT id FROM boxes WHERE id = ?').get(id)
    if (!existing) throw new Error('box not found')
    if (patch.name !== undefined) {
      db.prepare('UPDATE boxes SET name = ? WHERE id = ?').run(patch.name, id)
    }
    if (patch.costPoints !== undefined) {
      db.prepare('UPDATE boxes SET cost_points = ? WHERE id = ?').run(patch.costPoints, id)
    }
    if (patch.active !== undefined) {
      db.prepare('UPDATE boxes SET active = ? WHERE id = ?').run(patch.active ? 1 : 0, id)
    }
    return adminListBoxes(db).find((box) => box.id === id)
  })
}

export function adminListDropEntries(db) {
  return plain(
    db
      .prepare(
        `SELECT e.id AS id, e.box_id AS box_id, e.item_id AS item_id, i.name AS item_name,
                e.result_type AS result_type, e.weight AS weight, e.active AS active
         FROM box_drop_entries e
         JOIN virtual_items i ON i.id = e.item_id
         ORDER BY e.box_id, i.grade, i.id, e.result_type`
      )
      .all()
  ).map((row) => ({
    id: row.id,
    boxId: row.box_id,
    itemId: row.item_id,
    itemName: row.item_name,
    resultType: row.result_type,
    weight: row.weight,
    active: row.active === 1,
  }))
}

export function adminUpdateDropEntry(db, id, patch) {
  return transaction(db, () => {
    const existing = db.prepare('SELECT id FROM box_drop_entries WHERE id = ?').get(id)
    if (!existing) throw new Error('drop entry not found')
    if (patch.weight !== undefined) {
      db.prepare('UPDATE box_drop_entries SET weight = ? WHERE id = ?').run(patch.weight, id)
    }
    if (patch.active !== undefined) {
      db.prepare('UPDATE box_drop_entries SET active = ? WHERE id = ?').run(
        patch.active ? 1 : 0,
        id
      )
    }
    return adminListDropEntries(db).find((entry) => entry.id === id)
  })
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test server/game/adminService.test.mjs` — expected PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add server/game/adminService.js server/game/adminService.test.mjs
git commit -m "feat: add admin service (list/update items, boxes, drop entries)"
```

---

### Task 3: Admin HTTP routes, server mounting, and test:server script fix

**Files:**
- Create: `server/game/adminRoutes.js`, `server/game/adminRoutes.test.mjs`
- Modify: `server/index.js`, `package.json`

**Interfaces:**
- Consumes: `checkAdminAuth` (Task 1), `adminListItems`/`adminUpdateItem`/`adminListBoxes`/`adminUpdateBox`/`adminListDropEntries`/`adminUpdateDropEntry` (Task 2).
- Produces: `handleAdminRequest(req, res, db)`, mounted in `server/index.js` under the `/api/admin/` prefix.

**Note on `package.json`'s `test:server` script:** it currently lists
`server/podium.test.mjs server/linkAnalysis.test.mjs server/game/db.test.mjs
server/game/rules.test.mjs server/game/service.test.mjs
server/game/routes.test.mjs` — six files, 36 tests. It is missing
`server/game/itemRules.test.mjs` (3 tests) and `server/game/itemService.test.mjs`
(9 tests), added in sub-project 2 but never wired into this script (they
were run directly with `node --test <file>` during that implementation,
not via `npm run test:server`). This step fixes that gap and adds this
task's two new test files in the same edit, so `npm run test:server`
actually covers every server test file going forward.

- [ ] **Step 1: Write the failing tests**

Create `server/game/adminRoutes.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { openDb } from './db.js'
import { handleAdminRequest } from './adminRoutes.js'

const ADMIN_KEY = 'test-admin-key-123'

async function start() {
  const db = openDb(':memory:')
  const server = createServer((req, res) => {
    handleAdminRequest(req, res, db)
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

function call(base, path, { key = ADMIN_KEY, method = 'GET', body } = {}) {
  return fetch(base + path, {
    method,
    headers: { ...(key !== undefined ? { 'X-Admin-Key': key } : {}), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
}

test('every route returns 503 when ADMIN_KEY is unset', async () => {
  const original = process.env.ADMIN_KEY
  delete process.env.ADMIN_KEY
  const { base, close } = await start()
  try {
    assert.equal((await call(base, '/api/admin/items')).status, 503)
    assert.equal((await call(base, '/api/admin/boxes')).status, 503)
    assert.equal((await call(base, '/api/admin/drop-entries')).status, 503)
  } finally {
    await close()
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})

test('a missing or wrong key is rejected with 401 when ADMIN_KEY is set', async () => {
  const original = process.env.ADMIN_KEY
  process.env.ADMIN_KEY = ADMIN_KEY
  const { base, close } = await start()
  try {
    assert.equal((await call(base, '/api/admin/items', { key: undefined })).status, 401)
    assert.equal((await call(base, '/api/admin/items', { key: 'wrong' })).status, 401)
  } finally {
    await close()
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})

test('items: list and patch round-trip with the right key', async () => {
  const original = process.env.ADMIN_KEY
  process.env.ADMIN_KEY = ADMIN_KEY
  const { base, close } = await start()
  try {
    const list = await (await call(base, '/api/admin/items')).json()
    assert.equal(list.items.length, 14)
    const target = list.items[0]
    const res = await call(base, `/api/admin/items/${target.id}`, {
      method: 'PATCH',
      body: { name: '수정된 이름' },
    })
    assert.equal(res.status, 200)
    const updated = await res.json()
    assert.equal(updated.name, '수정된 이름')
  } finally {
    await close()
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})

test('boxes: list and patch round-trip with the right key', async () => {
  const original = process.env.ADMIN_KEY
  process.env.ADMIN_KEY = ADMIN_KEY
  const { base, close } = await start()
  try {
    const list = await (await call(base, '/api/admin/boxes')).json()
    assert.equal(list.boxes.length, 1)
    const res = await call(base, `/api/admin/boxes/${list.boxes[0].id}`, {
      method: 'PATCH',
      body: { costPoints: 999 },
    })
    assert.equal(res.status, 200)
    const updated = await res.json()
    assert.equal(updated.costPoints, 999)
  } finally {
    await close()
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})

test('drop-entries: list and patch round-trip with the right key', async () => {
  const original = process.env.ADMIN_KEY
  process.env.ADMIN_KEY = ADMIN_KEY
  const { base, close } = await start()
  try {
    const list = await (await call(base, '/api/admin/drop-entries')).json()
    assert.equal(list.entries.length, 28)
    const target = list.entries[0]
    const res = await call(base, `/api/admin/drop-entries/${target.id}`, {
      method: 'PATCH',
      body: { weight: 77 },
    })
    assert.equal(res.status, 200)
    const updated = await res.json()
    assert.equal(updated.weight, 77)
  } finally {
    await close()
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})

test('invalid patch bodies return 400', async () => {
  const original = process.env.ADMIN_KEY
  process.env.ADMIN_KEY = ADMIN_KEY
  const { base, close } = await start()
  try {
    const list = await (await call(base, '/api/admin/items')).json()
    const id = list.items[0].id
    for (const body of [{}, { fragmentsRequired: -1 }, { name: '' }, { active: 'yes' }]) {
      const res = await call(base, `/api/admin/items/${id}`, { method: 'PATCH', body })
      assert.equal(res.status, 400, JSON.stringify(body))
    }
  } finally {
    await close()
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})

test('a PATCH to an unknown id returns 404', async () => {
  const original = process.env.ADMIN_KEY
  process.env.ADMIN_KEY = ADMIN_KEY
  const { base, close } = await start()
  try {
    const res = await call(base, '/api/admin/items/no-such-item', {
      method: 'PATCH',
      body: { name: 'x' },
    })
    assert.equal(res.status, 404)
  } finally {
    await close()
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})

test('unknown routes return 404', async () => {
  const original = process.env.ADMIN_KEY
  process.env.ADMIN_KEY = ADMIN_KEY
  const { base, close } = await start()
  try {
    assert.equal((await call(base, '/api/admin/nope')).status, 404)
  } finally {
    await close()
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test server/game/adminRoutes.test.mjs`
Expected: FAIL (cannot find module `./adminRoutes.js`).

- [ ] **Step 3: Implement `server/game/adminRoutes.js`**

```js
import {
  adminListItems,
  adminUpdateItem,
  adminListBoxes,
  adminUpdateBox,
  adminListDropEntries,
  adminUpdateDropEntry,
} from './adminService.js'
import { checkAdminAuth } from './adminAuth.js'

const MAX_BODY_BYTES = 64 * 1024

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let tooLarge = false
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        tooLarge = true
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(tooLarge ? null : Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

const invalid = { error: 'invalid payload' }

function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0
}

function parseItemPatch(body) {
  const patch = {}
  if (body?.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) return null
    patch.name = body.name
  }
  if (body?.fragmentsRequired !== undefined) {
    if (!isPositiveInt(body.fragmentsRequired)) return null
    patch.fragmentsRequired = body.fragmentsRequired
  }
  if (body?.active !== undefined) {
    if (typeof body.active !== 'boolean') return null
    patch.active = body.active
  }
  if (Object.keys(patch).length === 0) return null
  return patch
}

function parseBoxPatch(body) {
  const patch = {}
  if (body?.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) return null
    patch.name = body.name
  }
  if (body?.costPoints !== undefined) {
    if (!isPositiveInt(body.costPoints)) return null
    patch.costPoints = body.costPoints
  }
  if (body?.active !== undefined) {
    if (typeof body.active !== 'boolean') return null
    patch.active = body.active
  }
  if (Object.keys(patch).length === 0) return null
  return patch
}

function parseDropEntryPatch(body) {
  const patch = {}
  if (body?.weight !== undefined) {
    if (!Number.isInteger(body.weight) || body.weight < 0) return null
    patch.weight = body.weight
  }
  if (body?.active !== undefined) {
    if (typeof body.active !== 'boolean') return null
    patch.active = body.active
  }
  if (Object.keys(patch).length === 0) return null
  return patch
}

export async function handleAdminRequest(req, res, db) {
  try {
    const auth = checkAdminAuth(req)
    if (auth === 'unconfigured') {
      sendJson(res, 503, { error: 'admin not configured' })
      return
    }
    if (auth === 'unauthorized') {
      sendJson(res, 401, { error: 'unauthorized' })
      return
    }

    const url = new URL(req.url, 'http://localhost')
    const route = `${req.method} ${url.pathname}`

    if (route === 'GET /api/admin/items') {
      sendJson(res, 200, { items: adminListItems(db) })
      return
    }

    const itemMatch = url.pathname.match(/^\/api\/admin\/items\/([^/]+)$/)
    if (req.method === 'PATCH' && itemMatch) {
      const raw = await readBody(req)
      let body
      try {
        body = JSON.parse(raw ?? '')
      } catch {
        sendJson(res, 400, invalid)
        return
      }
      const patch = parseItemPatch(body)
      if (!patch) {
        sendJson(res, 400, invalid)
        return
      }
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

    if (route === 'GET /api/admin/boxes') {
      sendJson(res, 200, { boxes: adminListBoxes(db) })
      return
    }

    const boxMatch = url.pathname.match(/^\/api\/admin\/boxes\/([^/]+)$/)
    if (req.method === 'PATCH' && boxMatch) {
      const raw = await readBody(req)
      let body
      try {
        body = JSON.parse(raw ?? '')
      } catch {
        sendJson(res, 400, invalid)
        return
      }
      const patch = parseBoxPatch(body)
      if (!patch) {
        sendJson(res, 400, invalid)
        return
      }
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

    if (route === 'GET /api/admin/drop-entries') {
      sendJson(res, 200, { entries: adminListDropEntries(db) })
      return
    }

    const dropEntryMatch = url.pathname.match(/^\/api\/admin\/drop-entries\/(\d+)$/)
    if (req.method === 'PATCH' && dropEntryMatch) {
      const raw = await readBody(req)
      let body
      try {
        body = JSON.parse(raw ?? '')
      } catch {
        sendJson(res, 400, invalid)
        return
      }
      const patch = parseDropEntryPatch(body)
      if (!patch) {
        sendJson(res, 400, invalid)
        return
      }
      try {
        sendJson(res, 200, adminUpdateDropEntry(db, Number(dropEntryMatch[1]), patch))
      } catch (error) {
        if (error.message === 'drop entry not found') {
          sendJson(res, 404, { error: error.message })
        } else {
          throw error
        }
      }
      return
    }

    sendJson(res, 404, { error: 'not found' })
  } catch {
    sendJson(res, 500, { error: 'server error' })
  }
}
```

- [ ] **Step 4: Mount in `server/index.js`**

Find:

```js
import { openDb } from './game/db.js'
import { handleGameRequest } from './game/routes.js'
```

Replace with:

```js
import { openDb } from './game/db.js'
import { handleGameRequest } from './game/routes.js'
import { handleAdminRequest } from './game/adminRoutes.js'
```

Find:

```js
  if (req.url?.startsWith('/api/game/')) {
    handleGameRequest(req, res, db)
    return
  }
```

Replace with:

```js
  if (req.url?.startsWith('/api/game/')) {
    handleGameRequest(req, res, db)
    return
  }

  if (req.url?.startsWith('/api/admin/')) {
    handleAdminRequest(req, res, db)
    return
  }
```

- [ ] **Step 5: Fix `package.json`'s `test:server` script**

Find:

```json
    "test:server": "node --test server/podium.test.mjs server/linkAnalysis.test.mjs server/game/db.test.mjs server/game/rules.test.mjs server/game/service.test.mjs server/game/routes.test.mjs"
```

Replace with:

```json
    "test:server": "node --test server/podium.test.mjs server/linkAnalysis.test.mjs server/game/db.test.mjs server/game/rules.test.mjs server/game/service.test.mjs server/game/routes.test.mjs server/game/itemRules.test.mjs server/game/itemService.test.mjs server/game/adminAuth.test.mjs server/game/adminService.test.mjs server/game/adminRoutes.test.mjs"
```

- [ ] **Step 6: Run to verify everything passes**

Run: `node --test server/game/adminRoutes.test.mjs` — expected PASS (8 tests).
Run: `npm run test:server` — expected PASS. Count should now be 36 (original
six files) + 3 (`itemRules.test.mjs`) + 9 (`itemService.test.mjs`) + 3
(`adminAuth.test.mjs`, Task 1) + 9 (`adminService.test.mjs`, Task 2) + 8
(`adminRoutes.test.mjs`, this task) = 68. Confirm the exact number from the
tool's own summary rather than trusting this arithmetic.

- [ ] **Step 7: Commit**

```bash
git add server/game/adminRoutes.js server/game/adminRoutes.test.mjs server/index.js package.json
git commit -m "feat: add admin HTTP routes; fix test:server to cover all server test files"
```

---

### Task 4: Admin client API

**Files:**
- Create: `src/lib/adminApi.ts`, `src/lib/adminApi.test.ts`

**Interfaces:**
- Produces: `getAdminKey()`, `setAdminKey(key)`, `fetchAdminItems()`,
  `updateAdminItem(id, patch)`, `fetchAdminBoxes()`, `updateAdminBox(id, patch)`,
  `fetchAdminDropEntries()`, `updateAdminDropEntry(id, patch)`, plus types
  `AdminItem`, `AdminBox`, `AdminDropEntry`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/adminApi.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getAdminKey,
  setAdminKey,
  fetchAdminItems,
  updateAdminItem,
  fetchAdminBoxes,
  updateAdminBox,
  fetchAdminDropEntries,
  updateAdminDropEntry,
} from './adminApi'

describe('adminApi', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips the admin key through localStorage', () => {
    expect(getAdminKey()).toBe('')
    setAdminKey('secret123')
    expect(getAdminKey()).toBe('secret123')
  })

  it('sends the admin key header on fetchAdminItems', async () => {
    setAdminKey('secret123')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) })
    vi.stubGlobal('fetch', fetchMock)
    await fetchAdminItems()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/admin/items')
    expect((init.headers as Record<string, string>)['X-Admin-Key']).toBe('secret123')
  })

  it('PATCHes updateAdminItem with the encoded id and patch body', async () => {
    setAdminKey('secret123')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'x' }) })
    vi.stubGlobal('fetch', fetchMock)
    await updateAdminItem('item a', { name: 'New' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/admin/items/item%20a')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ name: 'New' })
  })

  it('fetches boxes and drop entries', async () => {
    setAdminKey('secret123')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ boxes: [] }) })
    vi.stubGlobal('fetch', fetchMock)
    await fetchAdminBoxes()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/boxes')
    await fetchAdminDropEntries()
    expect(fetchMock.mock.calls[1][0]).toBe('/api/admin/drop-entries')
  })

  it('PATCHes updateAdminBox and updateAdminDropEntry', async () => {
    setAdminKey('secret123')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await updateAdminBox('box-starter', { costPoints: 700 })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/boxes/box-starter')
    await updateAdminDropEntry(5, { weight: 10 })
    expect(fetchMock.mock.calls[1][0]).toBe('/api/admin/drop-entries/5')
  })

  it('throws on a non-2xx response', async () => {
    setAdminKey('secret123')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    await expect(fetchAdminItems()).rejects.toThrow('admin api 401')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/adminApi.test.ts`
Expected: FAIL (cannot find module `./adminApi`).

- [ ] **Step 3: Implement `src/lib/adminApi.ts`**

```ts
export type AdminItem = { id: string; name: string; grade: string; fragmentsRequired: number; active: boolean }
export type AdminBox = { id: string; name: string; costPoints: number; active: boolean }
export type AdminDropEntry = {
  id: number
  boxId: string
  itemId: string
  itemName: string
  resultType: 'FRAGMENT' | 'FULL_ITEM'
  weight: number
  active: boolean
}

const KEY_STORAGE = 'remembuy:adminKey'

export function getAdminKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

export function setAdminKey(key: string) {
  try {
    localStorage.setItem(KEY_STORAGE, key)
  } catch {
    // storage unavailable (private browsing etc.) — request headers still
    // use the in-memory value read back via getAdminKey() for this call
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': getAdminKey(),
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) throw new Error(`admin api ${res.status}`)
  return (await res.json()) as T
}

export const fetchAdminItems = () => request<{ items: AdminItem[] }>('/api/admin/items')
export const updateAdminItem = (
  id: string,
  patch: Partial<Pick<AdminItem, 'name' | 'fragmentsRequired' | 'active'>>
) => request<AdminItem>(`/api/admin/items/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) })

export const fetchAdminBoxes = () => request<{ boxes: AdminBox[] }>('/api/admin/boxes')
export const updateAdminBox = (
  id: string,
  patch: Partial<Pick<AdminBox, 'name' | 'costPoints' | 'active'>>
) => request<AdminBox>(`/api/admin/boxes/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) })

export const fetchAdminDropEntries = () => request<{ entries: AdminDropEntry[] }>('/api/admin/drop-entries')
export const updateAdminDropEntry = (
  id: number,
  patch: Partial<Pick<AdminDropEntry, 'weight' | 'active'>>
) => request<AdminDropEntry>(`/api/admin/drop-entries/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsc --noEmit` (clean) and `npx vitest run src/lib/adminApi.test.ts` — expected PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/adminApi.ts src/lib/adminApi.test.ts
git commit -m "feat: add admin client API"
```

---

### Task 5: Admin row components

**Files:**
- Create: `src/components/admin/AdminItemRow.tsx`, `src/components/admin/AdminItemRow.test.tsx`
- Create: `src/components/admin/AdminBoxRow.tsx`, `src/components/admin/AdminBoxRow.test.tsx`
- Create: `src/components/admin/AdminDropEntryRow.tsx`, `src/components/admin/AdminDropEntryRow.test.tsx`

**Interfaces:**
- Consumes: `AdminItem`/`AdminBox`/`AdminDropEntry` types (Task 4).
- Produces: `AdminItemRow({ item, onSave })`, `AdminBoxRow({ box, onSave })`,
  `AdminDropEntryRow({ entry, onSave })` — each `onSave` is
  `(id, patch) => Promise<void>`. Each row holds local editable copies of
  its fields, computes a diff against the original prop object on save,
  and calls `onSave` with ONLY the changed fields (an unchanged save is a
  no-op — `onSave` is not called at all). Each row shows an inline "저장
  실패" message if `onSave` rejects.

- [ ] **Step 1: Write the failing tests**

Create `src/components/admin/AdminItemRow.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminItemRow } from './AdminItemRow'
import type { AdminItem } from '../../lib/adminApi'

const ITEM: AdminItem = { id: 'item-a', name: '기본 세면대', grade: 'COMMON', fragmentsRequired: 10, active: true }

function renderRow(onSave = vi.fn().mockResolvedValue(undefined)) {
  render(
    <table>
      <tbody>
        <AdminItemRow item={ITEM} onSave={onSave} />
      </tbody>
    </table>
  )
  return { onSave }
}

describe('AdminItemRow', () => {
  it('renders the current values', () => {
    renderRow()
    expect(screen.getByDisplayValue('기본 세면대')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('does not call onSave when nothing changed', () => {
    const { onSave } = renderRow()
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onSave with only the changed field', async () => {
    const { onSave } = renderRow()
    fireEvent.change(screen.getByDisplayValue('기본 세면대'), { target: { value: '새 이름' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('item-a', { name: '새 이름' }))
  })

  it('shows an inline error when onSave rejects', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('fail'))
    renderRow(onSave)
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(screen.getByText('저장 실패')).toBeInTheDocument())
  })
})
```

Create `src/components/admin/AdminBoxRow.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminBoxRow } from './AdminBoxRow'
import type { AdminBox } from '../../lib/adminApi'

const BOX: AdminBox = { id: 'box-starter', name: '시작 상자', costPoints: 500, active: true }

function renderRow(onSave = vi.fn().mockResolvedValue(undefined)) {
  render(
    <table>
      <tbody>
        <AdminBoxRow box={BOX} onSave={onSave} />
      </tbody>
    </table>
  )
  return { onSave }
}

describe('AdminBoxRow', () => {
  it('renders the current values', () => {
    renderRow()
    expect(screen.getByDisplayValue('시작 상자')).toBeInTheDocument()
    expect(screen.getByDisplayValue('500')).toBeInTheDocument()
  })

  it('does not call onSave when nothing changed', () => {
    const { onSave } = renderRow()
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onSave with only the changed field', async () => {
    const { onSave } = renderRow()
    fireEvent.change(screen.getByDisplayValue('500'), { target: { value: '700' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('box-starter', { costPoints: 700 }))
  })
})
```

Create `src/components/admin/AdminDropEntryRow.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminDropEntryRow } from './AdminDropEntryRow'
import type { AdminDropEntry } from '../../lib/adminApi'

const ENTRY: AdminDropEntry = {
  id: 1,
  boxId: 'box-starter',
  itemId: 'item-a',
  itemName: '기본 세면대',
  resultType: 'FRAGMENT',
  weight: 40,
  active: true,
}

function renderRow(onSave = vi.fn().mockResolvedValue(undefined)) {
  render(
    <table>
      <tbody>
        <AdminDropEntryRow entry={ENTRY} onSave={onSave} />
      </tbody>
    </table>
  )
  return { onSave }
}

describe('AdminDropEntryRow', () => {
  it('renders the item name (read-only) and the current weight', () => {
    renderRow()
    expect(screen.getByText('기본 세면대')).toBeInTheDocument()
    expect(screen.getByDisplayValue('40')).toBeInTheDocument()
  })

  it('does not call onSave when nothing changed', () => {
    const { onSave } = renderRow()
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onSave with only the changed weight', async () => {
    const { onSave } = renderRow()
    fireEvent.change(screen.getByDisplayValue('40'), { target: { value: '77' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(1, { weight: 77 }))
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/admin/`
Expected: FAIL (cannot find modules `./AdminItemRow`, `./AdminBoxRow`, `./AdminDropEntryRow`).

- [ ] **Step 3: Implement the three row components**

Create `src/components/admin/AdminItemRow.tsx`:

```tsx
import { useState } from 'react'
import type { AdminItem } from '../../lib/adminApi'

export function AdminItemRow({
  item,
  onSave,
}: {
  item: AdminItem
  onSave: (id: string, patch: Partial<Pick<AdminItem, 'name' | 'fragmentsRequired' | 'active'>>) => Promise<void>
}) {
  const [name, setName] = useState(item.name)
  const [fragmentsRequired, setFragmentsRequired] = useState(item.fragmentsRequired)
  const [active, setActive] = useState(item.active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const patch: Partial<Pick<AdminItem, 'name' | 'fragmentsRequired' | 'active'>> = {}
    if (name !== item.name) patch.name = name
    if (fragmentsRequired !== item.fragmentsRequired) patch.fragmentsRequired = fragmentsRequired
    if (active !== item.active) patch.active = active
    if (Object.keys(patch).length === 0) return
    setSaving(true)
    setError(null)
    try {
      await onSave(item.id, patch)
    } catch {
      setError('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr>
      <td className="border p-1 text-xs">{item.id}</td>
      <td className="border p-1">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border p-1" />
      </td>
      <td className="border p-1">{item.grade}</td>
      <td className="border p-1">
        <input
          type="number"
          value={fragmentsRequired}
          onChange={(e) => setFragmentsRequired(Number(e.target.value))}
          className="w-20 border p-1"
        />
      </td>
      <td className="border p-1 text-center">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
      </td>
      <td className="border p-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-black px-2 py-1 text-xs text-white disabled:opacity-40"
        >
          저장
        </button>
        {error && <span className="ml-1 text-xs text-red-600">{error}</span>}
      </td>
    </tr>
  )
}
```

Create `src/components/admin/AdminBoxRow.tsx`:

```tsx
import { useState } from 'react'
import type { AdminBox } from '../../lib/adminApi'

export function AdminBoxRow({
  box,
  onSave,
}: {
  box: AdminBox
  onSave: (id: string, patch: Partial<Pick<AdminBox, 'name' | 'costPoints' | 'active'>>) => Promise<void>
}) {
  const [name, setName] = useState(box.name)
  const [costPoints, setCostPoints] = useState(box.costPoints)
  const [active, setActive] = useState(box.active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const patch: Partial<Pick<AdminBox, 'name' | 'costPoints' | 'active'>> = {}
    if (name !== box.name) patch.name = name
    if (costPoints !== box.costPoints) patch.costPoints = costPoints
    if (active !== box.active) patch.active = active
    if (Object.keys(patch).length === 0) return
    setSaving(true)
    setError(null)
    try {
      await onSave(box.id, patch)
    } catch {
      setError('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr>
      <td className="border p-1 text-xs">{box.id}</td>
      <td className="border p-1">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border p-1" />
      </td>
      <td className="border p-1">
        <input
          type="number"
          value={costPoints}
          onChange={(e) => setCostPoints(Number(e.target.value))}
          className="w-24 border p-1"
        />
      </td>
      <td className="border p-1 text-center">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
      </td>
      <td className="border p-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-black px-2 py-1 text-xs text-white disabled:opacity-40"
        >
          저장
        </button>
        {error && <span className="ml-1 text-xs text-red-600">{error}</span>}
      </td>
    </tr>
  )
}
```

Create `src/components/admin/AdminDropEntryRow.tsx`:

```tsx
import { useState } from 'react'
import type { AdminDropEntry } from '../../lib/adminApi'

export function AdminDropEntryRow({
  entry,
  onSave,
}: {
  entry: AdminDropEntry
  onSave: (id: number, patch: Partial<Pick<AdminDropEntry, 'weight' | 'active'>>) => Promise<void>
}) {
  const [weight, setWeight] = useState(entry.weight)
  const [active, setActive] = useState(entry.active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const patch: Partial<Pick<AdminDropEntry, 'weight' | 'active'>> = {}
    if (weight !== entry.weight) patch.weight = weight
    if (active !== entry.active) patch.active = active
    if (Object.keys(patch).length === 0) return
    setSaving(true)
    setError(null)
    try {
      await onSave(entry.id, patch)
    } catch {
      setError('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr>
      <td className="border p-1 text-xs">{entry.boxId}</td>
      <td className="border p-1">{entry.itemName}</td>
      <td className="border p-1">{entry.resultType}</td>
      <td className="border p-1">
        <input
          type="number"
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          className="w-20 border p-1"
        />
      </td>
      <td className="border p-1 text-center">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
      </td>
      <td className="border p-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-black px-2 py-1 text-xs text-white disabled:opacity-40"
        >
          저장
        </button>
        {error && <span className="ml-1 text-xs text-red-600">{error}</span>}
      </td>
    </tr>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsc --noEmit` (clean) and `npx vitest run src/components/admin/` — expected PASS (10 tests: 4 + 3 + 3).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/
git commit -m "feat: add admin row components (item, box, drop entry)"
```

---

### Task 6: AdminPage (key gate + tables)

**Files:**
- Create: `src/pages/AdminPage.tsx`, `src/pages/AdminPage.test.tsx`

**Interfaces:**
- Consumes: `getAdminKey`/`setAdminKey`/`fetchAdminItems`/`updateAdminItem`/
  `fetchAdminBoxes`/`updateAdminBox`/`fetchAdminDropEntries`/
  `updateAdminDropEntry` (Task 4); `AdminItemRow`/`AdminBoxRow`/
  `AdminDropEntryRow` (Task 5).
- Produces: `AdminPage` (default export) — no props.

- [ ] **Step 1: Write the failing test**

Create `src/pages/AdminPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminPage from './AdminPage'
import * as adminApi from '../lib/adminApi'

vi.mock('../lib/adminApi')

const ITEM: adminApi.AdminItem = { id: 'item-a', name: '기본 세면대', grade: 'COMMON', fragmentsRequired: 10, active: true }
const BOX: adminApi.AdminBox = { id: 'box-starter', name: '시작 상자', costPoints: 500, active: true }
const ENTRY: adminApi.AdminDropEntry = {
  id: 1,
  boxId: 'box-starter',
  itemId: 'item-a',
  itemName: '기본 세면대',
  resultType: 'FRAGMENT',
  weight: 40,
  active: true,
}

describe('AdminPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.resetAllMocks()
    vi.mocked(adminApi.getAdminKey).mockReturnValue('')
    vi.mocked(adminApi.fetchAdminBoxes).mockResolvedValue({ boxes: [BOX] })
    vi.mocked(adminApi.fetchAdminDropEntries).mockResolvedValue({ entries: [ENTRY] })
  })

  it('shows the key gate when no key is stored', () => {
    render(<AdminPage />)
    expect(screen.getByPlaceholderText('관리자 키')).toBeInTheDocument()
  })

  it('shows an inline error and stays on the gate for a wrong key', async () => {
    vi.mocked(adminApi.fetchAdminItems).mockRejectedValue(new Error('admin api 401'))
    render(<AdminPage />)
    fireEvent.change(screen.getByPlaceholderText('관리자 키'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: '입장' }))
    await waitFor(() => expect(screen.getByText('키가 올바르지 않습니다')).toBeInTheDocument())
    expect(adminApi.setAdminKey).toHaveBeenLastCalledWith('')
  })

  it('loads and renders all three tables for the right key', async () => {
    vi.mocked(adminApi.fetchAdminItems).mockResolvedValue({ items: [ITEM] })
    render(<AdminPage />)
    fireEvent.change(screen.getByPlaceholderText('관리자 키'), { target: { value: 'right' } })
    fireEvent.click(screen.getByRole('button', { name: '입장' }))
    await waitFor(() => expect(screen.getByDisplayValue('기본 세면대')).toBeInTheDocument())
    expect(screen.getByDisplayValue('시작 상자')).toBeInTheDocument()
    expect(screen.getByText('기본 세면대', { selector: 'td' })).toBeInTheDocument()
  })

  it('already-unlocked (stored key) loads tables on mount without the gate', async () => {
    vi.mocked(adminApi.getAdminKey).mockReturnValue('stored-key')
    vi.mocked(adminApi.fetchAdminItems).mockResolvedValue({ items: [ITEM] })
    render(<AdminPage />)
    expect(screen.queryByPlaceholderText('관리자 키')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByDisplayValue('기본 세면대')).toBeInTheDocument())
  })

  it('a 401 during a later save clears the key and returns to the gate', async () => {
    vi.mocked(adminApi.getAdminKey).mockReturnValue('stored-key')
    vi.mocked(adminApi.fetchAdminItems).mockResolvedValue({ items: [ITEM] })
    vi.mocked(adminApi.updateAdminItem).mockRejectedValue(new Error('admin api 401'))
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByDisplayValue('기본 세면대')).toBeInTheDocument())
    fireEvent.change(screen.getByDisplayValue('기본 세면대'), { target: { value: '변경' } })
    fireEvent.click(screen.getAllByRole('button', { name: '저장' })[0])
    await waitFor(() => expect(screen.getByPlaceholderText('관리자 키')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/AdminPage.test.tsx`
Expected: FAIL (cannot find module `./AdminPage`).

- [ ] **Step 3: Implement `src/pages/AdminPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import {
  getAdminKey,
  setAdminKey,
  fetchAdminItems,
  updateAdminItem,
  fetchAdminBoxes,
  updateAdminBox,
  fetchAdminDropEntries,
  updateAdminDropEntry,
  type AdminItem,
  type AdminBox,
  type AdminDropEntry,
} from '../lib/adminApi'
import { AdminItemRow } from '../components/admin/AdminItemRow'
import { AdminBoxRow } from '../components/admin/AdminBoxRow'
import { AdminDropEntryRow } from '../components/admin/AdminDropEntryRow'

function isUnauthorized(error: unknown): boolean {
  return error instanceof Error && error.message === 'admin api 401'
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(() => getAdminKey() !== '')
  const [keyInput, setKeyInput] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [items, setItems] = useState<AdminItem[]>([])
  const [boxes, setBoxes] = useState<AdminBox[]>([])
  const [entries, setEntries] = useState<AdminDropEntry[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  function handleUnauthorized() {
    setAdminKey('')
    setUnlocked(false)
    setAuthError('키가 올바르지 않습니다')
  }

  async function loadAll() {
    try {
      const [itemsRes, boxesRes, entriesRes] = await Promise.all([
        fetchAdminItems(),
        fetchAdminBoxes(),
        fetchAdminDropEntries(),
      ])
      setItems(itemsRes.items)
      setBoxes(boxesRes.boxes)
      setEntries(entriesRes.entries)
      setLoadError(null)
    } catch (error) {
      if (isUnauthorized(error)) {
        handleUnauthorized()
      } else {
        setLoadError('데이터를 불러오지 못했어요')
      }
    }
  }

  useEffect(() => {
    if (unlocked) void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked])

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

  async function saveItem(id: string, patch: Partial<Pick<AdminItem, 'name' | 'fragmentsRequired' | 'active'>>) {
    try {
      const updated = await updateAdminItem(id, patch)
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)))
    } catch (error) {
      if (isUnauthorized(error)) handleUnauthorized()
      throw error
    }
  }

  async function saveBox(id: string, patch: Partial<Pick<AdminBox, 'name' | 'costPoints' | 'active'>>) {
    try {
      const updated = await updateAdminBox(id, patch)
      setBoxes((prev) => prev.map((b) => (b.id === id ? updated : b)))
    } catch (error) {
      if (isUnauthorized(error)) handleUnauthorized()
      throw error
    }
  }

  async function saveDropEntry(id: number, patch: Partial<Pick<AdminDropEntry, 'weight' | 'active'>>) {
    try {
      const updated = await updateAdminDropEntry(id, patch)
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)))
    } catch (error) {
      if (isUnauthorized(error)) handleUnauthorized()
      throw error
    }
  }

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-sm space-y-3 p-6">
        <h1 className="text-lg font-bold">관리자 로그인</h1>
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder="관리자 키"
          className="w-full rounded border p-2"
        />
        {authError && <p className="text-sm text-red-600">{authError}</p>}
        <button type="button" onClick={handleUnlockSubmit} className="w-full rounded bg-black p-2 text-white">
          입장
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-lg font-bold">관리자</h1>
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      <section>
        <h2 className="mb-2 font-bold">아이템</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-1">ID</th>
              <th className="border p-1">이름</th>
              <th className="border p-1">등급</th>
              <th className="border p-1">필요 조각</th>
              <th className="border p-1">활성</th>
              <th className="border p-1" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <AdminItemRow key={item.id} item={item} onSave={saveItem} />
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 font-bold">상자</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-1">ID</th>
              <th className="border p-1">이름</th>
              <th className="border p-1">가격</th>
              <th className="border p-1">활성</th>
              <th className="border p-1" />
            </tr>
          </thead>
          <tbody>
            {boxes.map((box) => (
              <AdminBoxRow key={box.id} box={box} onSave={saveBox} />
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 font-bold">드롭 테이블</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-1">상자</th>
              <th className="border p-1">아이템</th>
              <th className="border p-1">타입</th>
              <th className="border p-1">weight</th>
              <th className="border p-1">활성</th>
              <th className="border p-1" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <AdminDropEntryRow key={entry.id} entry={entry} onSave={saveDropEntry} />
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsc --noEmit` (clean) and `npx vitest run src/pages/AdminPage.test.tsx` — expected PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdminPage.tsx src/pages/AdminPage.test.tsx
git commit -m "feat: add AdminPage (key gate + item/box/drop-entry tables)"
```

---

### Task 7: Wire `/admin` route and final verification

**Files:**
- Modify: `src/App.tsx`

**Interfaces:** none new — wires together Tasks 4-6.

- [ ] **Step 1: Add the route**

Find:

```tsx
import CollectionPage from './pages/CollectionPage'
import StorePage from './pages/StorePage'
import DexPage from './pages/DexPage'

export default function App() {
  return (
    <LockerProvider>
      <GameProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/item/:id" element={<ItemDetailPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/purchase" element={<PurchasePage />} />
          <Route path="/family" element={<FamilyPage />} />
          <Route path="/new" element={<NewItemPage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/dex" element={<DexPage />} />
        </Route>
      </Routes>
      </GameProvider>
    </LockerProvider>
  )
}
```

Replace with:

```tsx
import CollectionPage from './pages/CollectionPage'
import StorePage from './pages/StorePage'
import DexPage from './pages/DexPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <LockerProvider>
      <GameProvider>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/item/:id" element={<ItemDetailPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/purchase" element={<PurchasePage />} />
          <Route path="/family" element={<FamilyPage />} />
          <Route path="/new" element={<NewItemPage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/dex" element={<DexPage />} />
        </Route>
      </Routes>
      </GameProvider>
    </LockerProvider>
  )
}
```

(`/admin` is a sibling of the `<AppLayout>` group, not nested inside it —
no admin link in the consumer tab shell. It stays inside `<LockerProvider>`/
`<GameProvider>` since splitting those out for one route is a larger
structural change than this task's scope; those providers' effects run
regardless of route today already, e.g. on `/item/:id`, `/ranking`, etc.)

- [ ] **Step 2: Full verification**

Run, in order:
1. `npx tsc --noEmit` — expect clean.
2. `npx vitest run` — expect all tests green (93 existing + 6 from Task 4 +
   10 from Task 5 + 5 from Task 6 = 114 total; confirm the exact number
   from the tool's own summary rather than trusting this arithmetic).
3. `npm run build` — expect success.
4. `npm run test:server` — expect the count from Task 3 Step 6 (68),
   confirmed unchanged by this task.

- [ ] **Step 3: Manual smoke test**

Start the server with an admin key set and confirm the full auth/edit
round-trip against a real running instance (do not touch a port another
running instance might be using — check first):

```bash
ADMIN_KEY=test123 node server/index.js &
curl -s http://localhost:8787/api/admin/items
# expect: {"error":"unauthorized"} (401, no key header)
curl -s http://localhost:8787/api/admin/items -H "X-Admin-Key: test123"
# expect: 200 with { items: [...14 items] }
curl -s -X PATCH http://localhost:8787/api/admin/items/item-basin-basic \
  -H "X-Admin-Key: test123" -H "Content-Type: application/json" \
  -d '{"fragmentsRequired": 12}'
# expect: 200 with the updated item, fragmentsRequired: 12
```

Stop the background server afterward. Revert the `fragmentsRequired` value
back to `10` via another `PATCH` if this ran against a database file that
persists between runs (it does — `server/data/game.sqlite` — the `:memory:`
databases are test-only).

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire /admin route"
```
