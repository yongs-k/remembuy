# Collection Game — Sub-project 4a: Admin (Items, Boxes, Drop Table) — Design Spec

Date: 2026-09-23

## Context

Continues the roadmap from `docs/superpowers/specs/2026-09-22-game-core-design.md`,
which lists sub-project 4 as: "Admin: config editing API + UI protected by
an admin key (slots, title conditions, benefit %, items, grades, fragments,
boxes, prices, probabilities, point grant/revoke, event periods)." That is
a large surface. This project takes the first, narrowest slice: editing the
values that `docs/superpowers/specs/2026-09-22-virtual-items-design.md`
itself flagged as tuning knobs — virtual item names/fragment requirements,
box prices, and drop-table weights — all currently hardcoded in
`server/game/db.js`'s seed data with no way to change them short of editing
code and wiping the database.

Decisions confirmed with the user:
- Scope: edit existing rows of `virtual_items`, `boxes`, `box_drop_entries`
  only. No create/delete of any row, no slot/title/benefit/event editing, no
  point grant/revoke — all of that is later sub-project 4 work, not this one.
- Auth: a single fixed key via `process.env.ADMIN_KEY` (same env-var
  pattern already used for `GEMINI_API_KEY` in `server/linkAnalysis.js`), no
  login system, no accounts — consistent with this project's standing
  "no login" architecture decision. If `ADMIN_KEY` is unset on the server,
  every admin route responds 503 rather than silently accepting any key.
- No dedicated login endpoint: the frontend's key-entry screen validates by
  attempting `GET /api/admin/items` with the entered key; 200 means the key
  is good (store it), 401 means it's wrong (show an error). This doubles as
  the first real data fetch, avoiding a separate verify-only endpoint.
- The entered key persists in the browser via `localStorage` so the admin
  doesn't retype it every visit.
- `/admin` is a standalone top-level route, NOT nested inside the existing
  `<AppLayout>` (the 5-tab consumer shell) — no admin link appears anywhere
  in the consumer UI; it's reached only by typing the URL.
- Out of scope for this project, explicitly: new item/box/drop-entry rows,
  deletion of any row, audit/change history, optimistic-locking or any
  concurrent-edit conflict handling (last write wins), point grant/revoke,
  slot/title-tier/benefit/event-period editing, grade re-classification of
  an existing item (grade is not in the editable field list below).

## Server: auth

New file `server/game/adminAuth.js`:

- `requireAdminKey(req)` -> `boolean`. Reads `process.env.ADMIN_KEY`; if
  unset, returns `false` unconditionally (misconfigured server never lets
  a request through). Otherwise compares it against the `X-Admin-Key`
  request header for exact string equality.

Every route in `adminRoutes.js` (below) calls this first; on `false` it
distinguishes the two failure reasons the design spec above requires:
- `ADMIN_KEY` unset server-side -> `503 { error: 'admin not configured' }`
- `ADMIN_KEY` set but header missing/wrong -> `401 { error: 'unauthorized' }`

## Server: admin service (`server/game/adminService.js`)

Same conventions as `server/game/itemService.js`: a local `plain(rows)`
helper (`rows.map((row) => ({ ...row }))`, needed because `node:sqlite`
rows have a null prototype and must be copied before crossing a function
boundary), snake_case DB columns mapped to camelCase JS fields, writes
wrapped in `transaction(db, fn)` from `./db.js`.

Unlike `itemService.js`'s `getDex`/`getBoxes` (which filter
`WHERE active = 1` for the consumer-facing dex/store), every admin list
function returns ALL rows regardless of `active`, because toggling `active`
is itself one of the things an admin edits.

```js
import { transaction } from './db.js'

const plain = (rows) => rows.map((row) => ({ ...row }))

export function adminListItems(db) {
  return plain(
    db
      .prepare(
        'SELECT id, name, grade, fragments_required, active FROM virtual_items ORDER BY grade, id'
      )
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
  return plain(
    db.prepare('SELECT id, name, cost_points, active FROM boxes ORDER BY id').all()
  ).map((row) => ({ id: row.id, name: row.name, costPoints: row.cost_points, active: row.active === 1 }))
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

Validation the route layer must enforce before calling these (service
functions assume already-validated input, matching `itemService.js`'s own
division of labor with `routes.js`): `fragmentsRequired`/`costPoints`/
`weight` are positive integers when present; `name` is a non-empty string
when present; `active` is a boolean when present; every `PATCH` body must
include at least one recognized field.

## Server: HTTP API (`server/game/adminRoutes.js`)

New file, mounted independently of `handleGameRequest` (no `X-Device-Id`
requirement — admin auth replaces it entirely):

```
GET   /api/admin/items                -> { items: AdminItem[] }
PATCH /api/admin/items/:id            -> AdminItem (the updated row)
GET   /api/admin/boxes                -> { boxes: AdminBox[] }
PATCH /api/admin/boxes/:id            -> AdminBox (the updated row)
GET   /api/admin/drop-entries         -> { entries: AdminDropEntry[] }
PATCH /api/admin/drop-entries/:id     -> AdminDropEntry (the updated row)
```

Every route: `requireAdminKey(req)` first (503 if `ADMIN_KEY` unset, 401 if
wrong/missing key), then behaves like `routes.js`'s existing routes (same
`sendJson`/`readBody` local helpers duplicated here, matching this
codebase's existing per-module style rather than extracting a shared
module — `server/index.js` and `server/game/routes.js` already each keep
their own copies). `PATCH` with an invalid body (no recognized field, wrong
type, non-positive number) -> `400 { error: 'invalid payload' }`. `PATCH`
for a nonexistent id -> the service throws `Error('item not found')` /
`'box not found'` / `'drop entry not found'`; the route catches this
specific message and returns `404 { error: <message> }`; any other thrown
error -> `500 { error: 'server error' }`, matching `routes.js`'s existing
catch-all convention.

`server/index.js` gains one dispatch line, mirroring the existing
`/api/game/` one:

```js
import { handleAdminRequest } from './game/adminRoutes.js'
// ...
  if (req.url?.startsWith('/api/admin/')) {
    handleAdminRequest(req, res, db)
    return
  }
```

placed immediately after the existing `/api/game/` block. No change to
`vite.config.ts` — its `/api` proxy already covers `/api/admin/*`.

## Client (`src/lib/adminApi.ts`, `src/pages/AdminPage.tsx`)

New file `src/lib/adminApi.ts`, deliberately NOT reusing `src/lib/gameApi.ts`'s
`request<T>` helper (that helper hardcodes the `X-Device-Id` header via
`getDeviceId()`, which has no meaning for admin requests) — a small parallel
`request<T>` with the same shape but an `X-Admin-Key` header instead:

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
    // storage unavailable (private browsing etc.) — key still works for this
    // session via the in-memory value the caller already holds
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
export const updateAdminItem = (id: string, patch: Partial<Pick<AdminItem, 'name' | 'fragmentsRequired' | 'active'>>) =>
  request<AdminItem>(`/api/admin/items/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) })

export const fetchAdminBoxes = () => request<{ boxes: AdminBox[] }>('/api/admin/boxes')
export const updateAdminBox = (id: string, patch: Partial<Pick<AdminBox, 'name' | 'costPoints' | 'active'>>) =>
  request<AdminBox>(`/api/admin/boxes/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) })

export const fetchAdminDropEntries = () => request<{ entries: AdminDropEntry[] }>('/api/admin/drop-entries')
export const updateAdminDropEntry = (id: number, patch: Partial<Pick<AdminDropEntry, 'weight' | 'active'>>) =>
  request<AdminDropEntry>(`/api/admin/drop-entries/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
```

`src/pages/AdminPage.tsx` (new), added to `src/App.tsx` as a sibling of the
`<AppLayout>` route group, not inside it:

```tsx
<Routes>
  <Route path="/admin" element={<AdminPage />} />
  <Route element={<AppLayout />}>
    {/* existing 10 routes unchanged */}
  </Route>
</Routes>
```

`AdminPage` owns two states:
1. **Key gate** (shown when `getAdminKey()` is empty, or after a 401):
   plain form, one password-type input, one submit button. On submit,
   calls `fetchAdminItems()` with the typed key held in local state (NOT
   yet persisted) by temporarily calling `setAdminKey(typedKey)` then
   attempting the fetch; on success, key stays stored and the view
   switches to the dashboard; on 401, calls `setAdminKey('')` (clear the
   bad key) and shows an inline "키가 올바르지 않습니다" error, staying on
   the gate.
2. **Dashboard**: three plain tables (items, boxes, drop entries), each
   loaded via its own `fetchAdmin*()` call on mount. Each row renders its
   editable fields as inline inputs (text for name, number for
   fragmentsRequired/costPoints/weight, checkbox for active) plus a **저장**
   button per row that calls the matching `updateAdmin*()` and replaces
   that row's data with the response on success, or shows an inline
   per-row error on failure (any non-2xx, including a stale key going bad
   mid-session — a 401 here also triggers the same "clear key, show gate"
   handling as the initial gate check, since the key may have been rotated
   or `ADMIN_KEY` changed server-side).

No shared design-system polish is required here (no Stitch mockup exists
for an admin screen, and none should be sourced — this is an internal
tool): plain HTML table markup, the existing `bg-surface`/`text-on-surface`
base tokens for readability, no card elevation/shadow treatment, no
`Icon` component usage beyond what's trivially available. Function over
form.

## Testing

Server (`node:test`, in-memory SQLite, same layout as `itemService.test.mjs`):
- `server/game/adminService.test.mjs`: each `adminList*` returns inactive
  rows too (unlike `getDex`/`getBoxes`); each `adminUpdate*` applies a
  partial patch (only the given fields change), returns the updated row,
  and throws the exact `'<noun> not found'` message for an unknown id.
- `server/game/adminRoutes.test.mjs`: 503 when `ADMIN_KEY` is unset — save
  `process.env.ADMIN_KEY`'s original value at the top of the test file,
  `delete process.env.ADMIN_KEY` only inside the one test that needs it,
  and restore the saved value immediately after that test's assertions
  (not in a shared `afterEach`, since every other test in the file needs
  `ADMIN_KEY` set) — no other test file in this codebase currently touches
  `process.env`, so there is no existing convention to match, only to
  avoid leaking global state past this one test. Also cover: 401 with a
  wrong key, 200 with the right key for every GET, a PATCH round-trip for
  each of the three resources, 400 for an invalid patch body (empty
  object, negative number, wrong type), 404 for a PATCH to an unknown id.

Frontend (Vitest + RTL, following `StorePage.test.tsx`'s
`vi.mock('../lib/...')` pattern applied to the new `adminApi.ts` module):
- `src/lib/adminApi.test.ts`: `getAdminKey`/`setAdminKey` round-trip
  through `localStorage`; each fetch/update function sends the
  `X-Admin-Key` header and hits the right path/method.
- `src/pages/AdminPage.test.tsx`: key gate shown when no stored key; wrong
  key shows the inline error and does not switch views; correct key loads
  and renders all three tables; editing a field and clicking 저장 calls
  the right `updateAdmin*` with only the changed field(s) and updates the
  displayed row; a 401 during a later edit clears the key and returns to
  the gate.

Manual: start the server with `ADMIN_KEY=test123` set, `curl` each GET
route with and without the header to confirm 401/503/200 behavior, then
`PATCH` one row of each resource and re-`GET` to confirm persistence.

## Out of scope

Everything listed in Context's "Decisions confirmed with the user" above:
row creation/deletion, audit history, concurrent-edit conflict handling,
point grant/revoke, slot/title-tier/benefit/event editing, item grade
re-classification. Also: rate-limiting or brute-force protection on the
admin key (a single fixed key with no lockout is an accepted risk for an
internal tool behind whatever network boundary hosts this app — revisit if
this ever faces the public internet directly), HTTPS/transport concerns
(deployment-level, not application-level), and any visual/UX polish beyond
a functional table editor.
