# Virtual Items, Boxes, Fragments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute in a fresh git worktree (superpowers:using-git-worktrees), not on `master`.

**Goal:** Add a virtual-item catalog, a single starter box with a config-driven drop table, fragment accumulation, and box-opening on top of the sub-project-1 game core; fix the sub-project-1 demo-seed reconciliation issue in the same pass.

**Architecture:** Same layering as sub-project 1: new tables in `server/game/db.js`'s schema/seed, pure functions in `server/game/itemRules.js`, a transactional `server/game/itemService.js`, three new routes appended to `server/game/routes.js`, and thin client additions to `src/lib/gameApi.ts` / `src/state/GameContext.tsx`.

**Tech Stack:** Node 24 `node:sqlite`, `node:test`; React + TypeScript + Vitest. No new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-22-virtual-items-design.md`.
- Server code is plain ESM JavaScript, same style as the existing `server/game/*.js` (2-space indent, `node:sqlite` `DatabaseSync`, every multi-row write inside `transaction(db, fn)`, rows copied with `{ ...row }` before crossing a function boundary — `node:sqlite` rows have a null prototype).
- A box open produces exactly ONE result (a fragment or a full item), never both, never more than one fragment.
- A fragment against an already-`COMPLETE` item accumulates in `user_item_fragments.count` with NO status change and NO re-trigger of completion logic.
- All prices/weights/fragment requirements live in DB tables seeded once (guarded the same way as sub-project 1: `INSERT` only when the table is empty), never as literals in `itemRules.js`/`itemService.js` logic.
- `getDex` and `getBoxes` are read-only: no `INSERT`/`UPDATE` anywhere in them, and neither creates a `users` row.
- Existing routes/tables from sub-project 1 (`/api/podium-*`, `/api/analyze-link`, `/api/game/catalog|state|claims|points-history`, all `spaces`/`product_groups`/`slots`/... tables) are untouched.
- The `GameContext` reconciliation fix (excluding `seed-`-prefixed item ids) is part of this plan (Task 6), not a separate project.
- Copy Korean text and identifiers exactly as written in the code blocks.
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Test counts: frontend 66 before this plan, server 33 before this plan (per `npm run test:server`).

## File Structure

```
server/game/db.js                    # Modify: add tables + item/box seed
server/game/db.test.mjs              # Modify: add seed-count assertions
server/game/itemRules.js             # Create
server/game/itemRules.test.mjs       # Create
server/game/itemService.js           # Create
server/game/itemService.test.mjs     # Create
server/game/routes.js                # Modify: 3 new routes
server/game/routes.test.mjs          # Modify: add coverage for the new routes
src/lib/gameApi.ts (+ .test.ts)      # Modify: add fetchBoxes/fetchDex/openBox
src/state/GameContext.tsx (+ .test.tsx) # Modify: seed-id filter, boxes/dex/openBox
```

---

### Task 1: Schema and seed data for items/boxes

**Files:**
- Modify: `server/game/db.js`, `server/game/db.test.mjs`

**Interfaces:**
- No new exports; `openDb`/`migrate` gain the new tables and seed rows as a side effect.

- [ ] **Step 1: Add the new tables to `SCHEMA`**

Find (the last table + index in the template literal):

```js
CREATE TABLE IF NOT EXISTS point_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_point_history_user ON point_history (user_id, id);
`
```

Replace with:

```js
CREATE TABLE IF NOT EXISTS point_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_point_history_user ON point_history (user_id, id);
CREATE TABLE IF NOT EXISTS virtual_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  fragments_required INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  room_type TEXT,
  placement_type TEXT,
  width INTEGER,
  height INTEGER,
  asset_id TEXT,
  theme_id TEXT,
  set_id TEXT
);
CREATE TABLE IF NOT EXISTS boxes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cost_points INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  start_at TEXT,
  end_at TEXT,
  event_id TEXT,
  limited INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS box_drop_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  box_id TEXT NOT NULL REFERENCES boxes(id),
  item_id TEXT NOT NULL REFERENCES virtual_items(id),
  result_type TEXT NOT NULL,
  weight INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS user_item_fragments (
  user_id TEXT NOT NULL REFERENCES users(id),
  item_id TEXT NOT NULL REFERENCES virtual_items(id),
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, item_id)
);
CREATE TABLE IF NOT EXISTS user_items (
  user_id TEXT NOT NULL REFERENCES users(id),
  item_id TEXT NOT NULL REFERENCES virtual_items(id),
  status TEXT NOT NULL,
  completed_at TEXT,
  PRIMARY KEY (user_id, item_id)
);
`
```

- [ ] **Step 2: Add the item/box seed data and seeding function**

Find:

```js
export function loadDefaultCatalog() {
  return JSON.parse(readFileSync(new URL('./catalog.seed.json', import.meta.url), 'utf-8'))
}
```

Replace with:

```js
export function loadDefaultCatalog() {
  return JSON.parse(readFileSync(new URL('./catalog.seed.json', import.meta.url), 'utf-8'))
}

const DEFAULT_ITEMS = [
  { id: 'item-basin-basic', name: '기본 세면대', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40 },
  { id: 'item-towel-rack', name: '수건 선반', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40 },
  { id: 'item-soap-dispenser', name: '비누 디스펜서', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40 },
  { id: 'item-bath-mat', name: '욕실 매트', grade: 'COMMON', fragmentsRequired: 10, fragmentWeight: 40 },
  { id: 'item-basin-modern', name: '모던 세면대', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25 },
  { id: 'item-shower-rain', name: '레인 샤워기', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25 },
  { id: 'item-vanity-shelf', name: '수납 선반장', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25 },
  { id: 'item-heated-rack', name: '온열 수건걸이', grade: 'ADVANCED', fragmentsRequired: 15, fragmentWeight: 25 },
  { id: 'item-mirror-gold', name: '골드 거울', grade: 'RARE', fragmentsRequired: 20, fragmentWeight: 12 },
  { id: 'item-tub-stone', name: '스톤 욕조', grade: 'RARE', fragmentsRequired: 20, fragmentWeight: 12 },
  { id: 'item-faucet-brass', name: '브라스 수전', grade: 'RARE', fragmentsRequired: 20, fragmentWeight: 12 },
  { id: 'item-tub-premium', name: '프리미엄 욕조', grade: 'LEGENDARY', fragmentsRequired: 30, fragmentWeight: 5 },
  { id: 'item-chandelier', name: '크리스탈 조명', grade: 'LEGENDARY', fragmentsRequired: 30, fragmentWeight: 5 },
  { id: 'item-spa-set', name: '스파 세트', grade: 'LEGENDARY', fragmentsRequired: 30, fragmentWeight: 5 },
]

const DEFAULT_BOXES = [{ id: 'box-starter', name: '시작 상자', costPoints: 500 }]

function seedItemsAndBoxes(db) {
  const existing = db.prepare('SELECT COUNT(*) AS n FROM virtual_items').get().n
  if (existing > 0) return
  transaction(db, () => {
    const insertItem = db.prepare(
      'INSERT INTO virtual_items (id, name, grade, fragments_required) VALUES (?, ?, ?, ?)'
    )
    for (const item of DEFAULT_ITEMS) {
      insertItem.run(item.id, item.name, item.grade, item.fragmentsRequired)
    }
    const insertBox = db.prepare('INSERT INTO boxes (id, name, cost_points) VALUES (?, ?, ?)')
    for (const box of DEFAULT_BOXES) {
      insertBox.run(box.id, box.name, box.costPoints)
    }
    const insertEntry = db.prepare(
      'INSERT INTO box_drop_entries (box_id, item_id, result_type, weight) VALUES (?, ?, ?, ?)'
    )
    for (const box of DEFAULT_BOXES) {
      for (const item of DEFAULT_ITEMS) {
        insertEntry.run(box.id, item.id, 'FRAGMENT', item.fragmentWeight)
        insertEntry.run(box.id, item.id, 'FULL_ITEM', 1)
      }
    }
  })
}
```

- [ ] **Step 3: Call the new seed function from `migrate`**

Find:

```js
export function migrate(db, { catalog } = {}) {
  db.exec(SCHEMA)
  db.prepare("INSERT OR IGNORE INTO schema_meta (key, value) VALUES ('schema_version', ?)").run(SCHEMA_VERSION)
  seedConfig(db)
  if (catalog) seedCatalog(db, catalog)
}
```

Replace with:

```js
export function migrate(db, { catalog } = {}) {
  db.exec(SCHEMA)
  db.prepare("INSERT OR IGNORE INTO schema_meta (key, value) VALUES ('schema_version', ?)").run(SCHEMA_VERSION)
  seedConfig(db)
  if (catalog) seedCatalog(db, catalog)
  seedItemsAndBoxes(db)
}
```

- [ ] **Step 4: Extend `db.test.mjs`**

Find:

```js
test('openDb seeds the catalog and the default config', () => {
  const db = openDb(':memory:')
  assert.equal(count(db, 'spaces'), 10)
  assert.equal(count(db, 'product_groups'), 23)
  assert.equal(count(db, 'slots'), 87)
  assert.equal(count(db, 'title_tiers'), 4)
  assert.equal(count(db, 'title_benefits'), 4)
  assert.equal(count(db, 'point_rules'), 1)
```

Replace with:

```js
test('openDb seeds the catalog and the default config', () => {
  const db = openDb(':memory:')
  assert.equal(count(db, 'spaces'), 10)
  assert.equal(count(db, 'product_groups'), 23)
  assert.equal(count(db, 'slots'), 87)
  assert.equal(count(db, 'title_tiers'), 4)
  assert.equal(count(db, 'title_benefits'), 4)
  assert.equal(count(db, 'point_rules'), 1)
  assert.equal(count(db, 'virtual_items'), 14)
  assert.equal(count(db, 'boxes'), 1)
  assert.equal(count(db, 'box_drop_entries'), 28)
  const grades = db
    .prepare('SELECT grade, COUNT(*) AS n FROM virtual_items GROUP BY grade ORDER BY grade')
    .all()
    .map((row) => ({ ...row }))
  assert.deepEqual(grades, [
    { grade: 'ADVANCED', n: 4 },
    { grade: 'COMMON', n: 4 },
    { grade: 'LEGENDARY', n: 3 },
    { grade: 'RARE', n: 3 },
  ])
```

Find:

```js
test('migrate is idempotent and never re-seeds a populated database', () => {
  const db = openDb(':memory:')
  migrate(db)
  migrate(db, { catalog: loadDefaultCatalog() })
  assert.equal(count(db, 'spaces'), 10)
  assert.equal(count(db, 'slots'), 87)
  assert.equal(count(db, 'title_tiers'), 4)
  assert.equal(count(db, 'title_benefits'), 4)
})
```

Replace with:

```js
test('migrate is idempotent and never re-seeds a populated database', () => {
  const db = openDb(':memory:')
  migrate(db)
  migrate(db, { catalog: loadDefaultCatalog() })
  assert.equal(count(db, 'spaces'), 10)
  assert.equal(count(db, 'slots'), 87)
  assert.equal(count(db, 'title_tiers'), 4)
  assert.equal(count(db, 'title_benefits'), 4)
  assert.equal(count(db, 'virtual_items'), 14)
  assert.equal(count(db, 'boxes'), 1)
})
```

- [ ] **Step 5: Verify**

Run: `node --test server/game/db.test.mjs` — expected PASS (still 4 tests, now with more assertions).

- [ ] **Step 6: Commit**

```bash
git add server/game/db.js server/game/db.test.mjs
git commit -m "feat: add virtual item, box, and drop table schema and seed data"
```

---

### Task 2: Pure item rules

**Files:**
- Create: `server/game/itemRules.js`, `server/game/itemRules.test.mjs`

**Interfaces:**
- Produces: `pickWeighted(entries, randomFn = Math.random)` where each entry has a numeric `weight` (picks by cumulative weight against `randomFn() * totalWeight`; throws `Error('pickWeighted: no entries')` on an empty list, `Error('pickWeighted: total weight is zero')` when every weight is 0); `applyFragment(existingCount, fragmentsRequired)` -> `{ newCount, justCompleted }`.

- [ ] **Step 1: Write the failing tests**

Create `server/game/itemRules.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { pickWeighted, applyFragment } from './itemRules.js'

test('pickWeighted picks by cumulative weight', () => {
  const entries = [
    { id: 'a', weight: 1 },
    { id: 'b', weight: 3 },
  ]
  assert.equal(pickWeighted(entries, () => 0).id, 'a')
  assert.equal(pickWeighted(entries, () => 0.24).id, 'a') // 0.24*4=0.96 < 1
  assert.equal(pickWeighted(entries, () => 0.26).id, 'b') // 0.26*4=1.04 >= 1
  assert.equal(pickWeighted(entries, () => 0.999999).id, 'b')
})

test('pickWeighted rejects empty or all-zero-weight lists', () => {
  assert.throws(() => pickWeighted([]), /no entries/)
  assert.throws(
    () =>
      pickWeighted([
        { id: 'a', weight: 0 },
        { id: 'b', weight: 0 },
      ]),
    /total weight is zero/
  )
})

test('applyFragment counts up and reports completion exactly once', () => {
  assert.deepEqual(applyFragment(0, 3), { newCount: 1, justCompleted: false })
  assert.deepEqual(applyFragment(1, 3), { newCount: 2, justCompleted: false })
  assert.deepEqual(applyFragment(2, 3), { newCount: 3, justCompleted: true })
  // already past the requirement (e.g. fragmentsRequired was lowered later): never re-flags completion
  assert.deepEqual(applyFragment(3, 3), { newCount: 4, justCompleted: false })
  assert.deepEqual(applyFragment(5, 2), { newCount: 6, justCompleted: false })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test server/game/itemRules.test.mjs`
Expected: FAIL (cannot find module `./itemRules.js`).

- [ ] **Step 3: Implement `server/game/itemRules.js`**

```js
export function pickWeighted(entries, randomFn = Math.random) {
  if (entries.length === 0) throw new Error('pickWeighted: no entries')
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  if (total <= 0) throw new Error('pickWeighted: total weight is zero')
  let target = randomFn() * total
  for (const entry of entries) {
    target -= entry.weight
    if (target < 0) return entry
  }
  return entries[entries.length - 1]
}

export function applyFragment(existingCount, fragmentsRequired) {
  const newCount = existingCount + 1
  const justCompleted = existingCount < fragmentsRequired && newCount >= fragmentsRequired
  return { newCount, justCompleted }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test server/game/itemRules.test.mjs` — expected PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/game/itemRules.js server/game/itemRules.test.mjs
git commit -m "feat: add pure item rules (weighted pick, fragment accumulation)"
```

---

### Task 3: Item service (dex, boxes, open transaction)

**Files:**
- Create: `server/game/itemService.js`, `server/game/itemService.test.mjs`

**Interfaces:**
- Consumes: `transaction` (`./db.js`), `pickWeighted`, `applyFragment` (`./itemRules.js`).
- Produces:
  - `getDex(db, userId)` -> `Array<{ id, name, grade, fragmentsRequired, status, fragmentCount }>`.
  - `getBoxes(db)` -> `Array<{ id, name, costPoints }>`.
  - `openBox(db, userId, boxId, now = new Date(), randomFn = Math.random)` -> `{ result: { type, itemId, itemName, grade }, pointsSpent, pointsBalance, dexEntry }`; throws `Error('box not found')` or `Error('insufficient points')` (the route maps both to 400).

- [ ] **Step 1: Write the failing tests**

Create `server/game/itemService.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { openDb, transaction } from './db.js'
import { getDex, getBoxes, openBox } from './itemService.js'

const DEVICE = 'device-aaaa1111'
const NOW = new Date('2026-09-22T00:00:00.000Z')

function freshDbWithPoints(points) {
  const db = openDb(':memory:')
  if (points > 0) {
    transaction(db, () => {
      db.prepare('INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)').run(DEVICE, NOW.toISOString())
      db.prepare(
        "INSERT INTO point_history (user_id, amount, type, source_id, created_at) VALUES (?, ?, 'TITLE_REWARD', 'seed', ?)"
      ).run(DEVICE, points, NOW.toISOString())
    })
  }
  return db
}

function pointsOf(db, userId) {
  return db.prepare('SELECT COALESCE(SUM(amount), 0) AS n FROM point_history WHERE user_id = ?').get(userId).n
}

test('getBoxes and getDex are read-only and never create a user', () => {
  const db = freshDbWithPoints(0)
  const boxes = getBoxes(db)
  assert.equal(boxes.length, 1)
  assert.deepEqual(boxes[0], { id: 'box-starter', name: '시작 상자', costPoints: 500 })
  const dex = getDex(db, DEVICE)
  assert.equal(dex.length, 14)
  assert.ok(dex.every((entry) => entry.status === 'LOCKED' && entry.fragmentCount === 0))
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0)
})

test('opening a box below its cost is rejected and spends nothing', () => {
  const db = freshDbWithPoints(499)
  assert.throws(() => openBox(db, DEVICE, 'box-starter', NOW, () => 0), /insufficient points/)
  assert.equal(pointsOf(db, DEVICE), 499)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM point_history').get().n, 1)
})

test('an unknown box id is rejected', () => {
  const db = freshDbWithPoints(5000)
  assert.throws(() => openBox(db, DEVICE, 'no-such-box', NOW), /box not found/)
})

test('a fragment result increments the count without completing early', () => {
  const db = freshDbWithPoints(5000)
  // force a FRAGMENT pick on item-basin-basic (10 required): randomFn=0 always lands on
  // the first FRAGMENT row in insertion order, which is item-basin-basic per the seed order.
  const result = openBox(db, DEVICE, 'box-starter', NOW, () => 0)
  assert.equal(result.result.type, 'FRAGMENT')
  assert.equal(result.result.itemId, 'item-basin-basic')
  assert.equal(result.pointsSpent, 500)
  assert.equal(result.pointsBalance, 4500)
  assert.equal(result.dexEntry.status, 'COLLECTING')
  assert.equal(result.dexEntry.fragmentCount, 1)
  const dex = getDex(db, DEVICE).find((d) => d.id === 'item-basin-basic')
  assert.equal(dex.status, 'COLLECTING')
  assert.equal(dex.fragmentCount, 1)
})

test('the 10th fragment completes a 10-fragment item exactly once', () => {
  const db = freshDbWithPoints(5000)
  for (let i = 0; i < 9; i++) {
    const r = openBox(db, DEVICE, 'box-starter', NOW, () => 0)
    assert.equal(r.dexEntry.status, 'COLLECTING')
  }
  const tenth = openBox(db, DEVICE, 'box-starter', NOW, () => 0)
  assert.equal(tenth.dexEntry.status, 'COMPLETE')
  assert.equal(tenth.dexEntry.fragmentCount, 10)
  const eleventh = openBox(db, DEVICE, 'box-starter', NOW, () => 0)
  assert.equal(eleventh.result.type, 'FRAGMENT')
  assert.equal(eleventh.dexEntry.status, 'COMPLETE')
  assert.equal(eleventh.dexEntry.fragmentCount, 11)
})

test('a FULL_ITEM result completes an item immediately, skipping COLLECTING', () => {
  const db = freshDbWithPoints(5000)
  // The 28 drop entries for box-starter are inserted FRAGMENT,FULL_ITEM per item in
  // DEFAULT_ITEMS order, so entry index 1 (weight-cumulative) is the FULL_ITEM row for
  // item-basin-basic once its FRAGMENT weight (40) is exceeded. total weight = (40+25+12+5)*... 
  // simplest reliable way: pick randomFn that lands exactly on a FULL_ITEM row by using the
  // service's own entries. Instead, assert behavior directly via a random function that always
  // returns just past the first item's FRAGMENT share.
  const totalWeight = 4 * 40 + 4 * 25 + 3 * 12 + 3 * 5 + 14 * 1 // 4 grades' fragment weights + 14 FULL_ITEM weight-1 rows
  const firstFragmentShare = 40 / totalWeight
  const result = openBox(db, DEVICE, 'box-starter', NOW, () => firstFragmentShare + 1e-9)
  assert.equal(result.result.type, 'FULL_ITEM')
  assert.equal(result.result.itemId, 'item-basin-basic')
  assert.equal(result.dexEntry.status, 'COMPLETE')
  assert.equal(result.dexEntry.fragmentCount, 0)
})

test('a fragment against an already-complete item accumulates without changing status', () => {
  const db = freshDbWithPoints(20000)
  for (let i = 0; i < 10; i++) openBox(db, DEVICE, 'box-starter', NOW, () => 0)
  const afterComplete = getDex(db, DEVICE).find((d) => d.id === 'item-basin-basic')
  assert.equal(afterComplete.status, 'COMPLETE')
  const again = openBox(db, DEVICE, 'box-starter', NOW, () => 0)
  assert.equal(again.result.type, 'FRAGMENT')
  assert.equal(again.dexEntry.status, 'COMPLETE')
  assert.equal(again.dexEntry.fragmentCount, 12)
})

test('every open logs a negative ITEM_BOX_OPEN point-history row', () => {
  const db = freshDbWithPoints(5000)
  openBox(db, DEVICE, 'box-starter', NOW, () => 0)
  const row = { ...db.prepare("SELECT amount, type, source_id FROM point_history WHERE type = 'ITEM_BOX_OPEN'").get() }
  assert.deepEqual(row, { amount: -500, type: 'ITEM_BOX_OPEN', source_id: 'box-starter' })
})

test('a failed open rolls back the point deduction', () => {
  const db = freshDbWithPoints(5000)
  db.exec('DROP TABLE user_item_fragments')
  assert.throws(() => openBox(db, DEVICE, 'box-starter', NOW, () => 0))
  assert.equal(pointsOf(db, DEVICE), 5000)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM point_history WHERE type = 'ITEM_BOX_OPEN'").get().n, 0)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test server/game/itemService.test.mjs`
Expected: FAIL (cannot find module `./itemService.js`).

- [ ] **Step 3: Implement `server/game/itemService.js`**

```js
import { transaction } from './db.js'
import { pickWeighted, applyFragment } from './itemRules.js'

const plain = (rows) => rows.map((row) => ({ ...row }))

function fragmentCount(db, userId, itemId) {
  const row = db.prepare('SELECT count FROM user_item_fragments WHERE user_id = ? AND item_id = ?').get(userId, itemId)
  return row ? row.count : 0
}

function itemStatus(db, userId, itemId) {
  const row = db.prepare('SELECT status FROM user_items WHERE user_id = ? AND item_id = ?').get(userId, itemId)
  return row ? row.status : 'LOCKED'
}

function dexEntryFor(db, userId, item) {
  return {
    id: item.id,
    name: item.name,
    grade: item.grade,
    fragmentsRequired: item.fragments_required,
    status: itemStatus(db, userId, item.id),
    fragmentCount: fragmentCount(db, userId, item.id),
  }
}

export function getDex(db, userId) {
  const items = plain(
    db
      .prepare('SELECT id, name, grade, fragments_required FROM virtual_items WHERE active = 1 ORDER BY grade, id')
      .all()
  )
  return items.map((item) => dexEntryFor(db, userId, item))
}

export function getBoxes(db) {
  return plain(db.prepare('SELECT id, name, cost_points FROM boxes WHERE active = 1 ORDER BY id').all()).map(
    (box) => ({ id: box.id, name: box.name, costPoints: box.cost_points })
  )
}

export function openBox(db, userId, boxId, now = new Date(), randomFn = Math.random) {
  const nowIso = now.toISOString()
  return transaction(db, () => {
    const box = db.prepare('SELECT id, cost_points FROM boxes WHERE id = ? AND active = 1').get(boxId)
    if (!box) throw new Error('box not found')

    db.prepare('INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)').run(userId, nowIso)
    const balance = db
      .prepare('SELECT COALESCE(SUM(amount), 0) AS n FROM point_history WHERE user_id = ?')
      .get(userId).n
    if (balance < box.cost_points) throw new Error('insufficient points')

    db.prepare(
      "INSERT INTO point_history (user_id, amount, type, source_id, created_at) VALUES (?, ?, 'ITEM_BOX_OPEN', ?, ?)"
    ).run(userId, -box.cost_points, boxId, nowIso)

    const entries = plain(
      db
        .prepare(
          `SELECT e.item_id AS item_id, e.result_type AS result_type, e.weight AS weight
           FROM box_drop_entries e
           JOIN virtual_items i ON i.id = e.item_id
           WHERE e.box_id = ? AND e.active = 1 AND i.active = 1`
        )
        .all(boxId)
    )
    const picked = pickWeighted(entries, randomFn)
    const item = { ...db.prepare('SELECT id, name, grade, fragments_required FROM virtual_items WHERE id = ?').get(picked.item_id) }

    if (picked.result_type === 'FULL_ITEM') {
      db.prepare(
        `INSERT INTO user_items (user_id, item_id, status, completed_at) VALUES (?, ?, 'COMPLETE', ?)
         ON CONFLICT (user_id, item_id) DO UPDATE SET status = 'COMPLETE', completed_at = excluded.completed_at`
      ).run(userId, item.id, nowIso)
    } else {
      const status = itemStatus(db, userId, item.id)
      const before = fragmentCount(db, userId, item.id)
      db.prepare(
        `INSERT INTO user_item_fragments (user_id, item_id, count) VALUES (?, ?, 1)
         ON CONFLICT (user_id, item_id) DO UPDATE SET count = count + 1`
      ).run(userId, item.id)
      if (status !== 'COMPLETE') {
        const { justCompleted } = applyFragment(before, item.fragments_required)
        if (justCompleted) {
          db.prepare(
            `INSERT INTO user_items (user_id, item_id, status, completed_at) VALUES (?, ?, 'COMPLETE', ?)
             ON CONFLICT (user_id, item_id) DO UPDATE SET status = 'COMPLETE', completed_at = excluded.completed_at`
          ).run(userId, item.id, nowIso)
        } else if (status === 'LOCKED') {
          db.prepare(
            "INSERT INTO user_items (user_id, item_id, status, completed_at) VALUES (?, ?, 'COLLECTING', NULL)"
          ).run(userId, item.id)
        }
      }
    }

    return {
      result: { type: picked.result_type, itemId: item.id, itemName: item.name, grade: item.grade },
      pointsSpent: box.cost_points,
      pointsBalance: balance - box.cost_points,
      dexEntry: dexEntryFor(db, userId, item),
    }
  })
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test server/game/itemService.test.mjs`
Expected: PASS (9 tests). If the `FULL_ITEM` test's `firstFragmentShare` math doesn't land as expected, verify `totalWeight` by hand against the seed (4×40+4×25+3×12+3×5+14×1 = 160+100+36+15+14 = 325) before changing test logic — don't change `itemService.js` to make a miscalculated test pass.

- [ ] **Step 5: Commit**

```bash
git add server/game/itemService.js server/game/itemService.test.mjs
git commit -m "feat: add item service (dex, boxes, transactional box open)"
```

---

### Task 4: HTTP routes for boxes and dex

**Files:**
- Modify: `server/game/routes.js`, `server/game/routes.test.mjs`

**Interfaces:**
- Consumes: `getBoxes`, `getDex`, `openBox` (Task 3).

**Note on the test fixture:** `routes.test.mjs`'s `CATALOG` fixture (top of the
file) has one space `sp1` with one group `g1` of 4 slots (`a1`-`a4`). The
existing test `'claim, state and history work end to end and are per
device'` already establishes that claiming `['a1', 'a2']` (2 of 4 slots = 50%)
reaches both SPROUT (200P) and MANAGER (500P) = 700P. This task's new box-open
test reuses that same fact directly (no edit-later placeholder) to cross the
500P box price with 200P of margin.

- [ ] **Step 1: Add the import**

Find:

```js
import { getCatalog, getState, claimSlots, getHistory } from './service.js'
```

Replace with:

```js
import { getCatalog, getState, claimSlots, getHistory } from './service.js'
import { getBoxes, getDex, openBox } from './itemService.js'
```

- [ ] **Step 2: Add the three routes**

Find:

```js
    if (route === 'GET /api/game/points-history') {
```

Replace with:

```js
    if (route === 'GET /api/game/boxes') {
      sendJson(res, 200, { boxes: getBoxes(db) })
      return
    }

    if (route === 'GET /api/game/dex') {
      sendJson(res, 200, { items: getDex(db, deviceId) })
      return
    }

    const openMatch = url.pathname.match(/^\/api\/game\/boxes\/([^/]+)\/open$/)
    if (req.method === 'POST' && openMatch) {
      try {
        sendJson(res, 200, openBox(db, deviceId, decodeURIComponent(openMatch[1])))
      } catch (error) {
        if (error.message === 'box not found' || error.message === 'insufficient points') {
          sendJson(res, 400, { error: error.message })
        } else {
          throw error
        }
      }
      return
    }

    if (route === 'GET /api/game/points-history') {
```

- [ ] **Step 3: Extend `routes.test.mjs`**

Find (the catalog above `test('claims validate the payload'`):

```js
test('catalog and state endpoints respond', async () => {
```

Leave that test as-is; append these new tests immediately before the final `test('points-history validates its query and unknown routes return 404'`:

```js
test('boxes and dex endpoints respond', async () => {
  const { base, close } = await start()
  try {
    const boxes = await (await call(base, '/api/game/boxes')).json()
    assert.equal(boxes.boxes.length, 1)
    assert.equal(boxes.boxes[0].id, 'box-starter')
    const dex = await (await call(base, '/api/game/dex')).json()
    assert.equal(dex.items.length, 14)
    assert.ok(dex.items.every((item) => item.status === 'LOCKED'))
  } finally {
    await close()
  }
})

test('opening an unknown box or one that costs too much returns 400', async () => {
  const { base, close } = await start()
  try {
    const missing = await call(base, '/api/game/boxes/no-such-box/open', { method: 'POST' })
    assert.equal(missing.status, 400)
    assert.deepEqual(await missing.json(), { error: 'box not found' })

    const poor = await call(base, '/api/game/boxes/box-starter/open', { method: 'POST' })
    assert.equal(poor.status, 400)
    assert.deepEqual(await poor.json(), { error: 'insufficient points' })
  } finally {
    await close()
  }
})

test('opening a box with enough points succeeds and updates the dex', async () => {
  const { base, close } = await start()
  try {
    // this fixture's catalog has only sp1's 4 slots, so claim them all to raise points to 1200
    await call(base, '/api/game/claims', { method: 'POST', body: { slotIds: ['a1', 'a2', 'a3', 'a4'] } })
    const opened = await call(base, '/api/game/boxes/box-starter/open', { method: 'POST' })
    assert.equal(opened.status, 200)
    const body = await opened.json()
    assert.equal(body.pointsSpent, 500)
    assert.ok(['FRAGMENT', 'FULL_ITEM'].includes(body.result.type))
    const dex = await (await call(base, '/api/game/dex')).json()
    const touched = dex.items.find((item) => item.id === body.result.itemId)
    assert.notEqual(touched.status, 'LOCKED')
  } finally {
    await close()
  }
})
```

The "opening a box with enough points succeeds" test above already uses
`slotIds: ['a1', 'a2']` (not all four) — this is intentional, matching the
Note above this task's Step 1, and needs no further edit.

- [ ] **Step 4: Run to verify it passes**

Run: `node --test server/game/routes.test.mjs`
Expected: PASS (8 tests: the existing 5 plus the 3 new ones).

- [ ] **Step 5: Commit**

```bash
git add server/game/routes.js server/game/routes.test.mjs
git commit -m "feat: add box and dex HTTP routes"
```

---

### Task 5: Client API additions

**Files:**
- Modify: `src/lib/gameApi.ts`, `src/lib/gameApi.test.ts`

**Interfaces:**
- Produces: `fetchBoxes()`, `fetchDex()`, `openBox(boxId: string)`, plus exported types `Box`, `DexEntry`, `OpenBoxResult`.

- [ ] **Step 1: Add the types and functions**

Find:

```ts
export const fetchPointHistory = (limit = 50, before?: number) =>
  request<{ items: PointHistoryItem[]; nextBefore: number | null }>(
    `/api/game/points-history?limit=${limit}${before === undefined ? '' : `&before=${before}`}`
  )
```

Replace with:

```ts
export const fetchPointHistory = (limit = 50, before?: number) =>
  request<{ items: PointHistoryItem[]; nextBefore: number | null }>(
    `/api/game/points-history?limit=${limit}${before === undefined ? '' : `&before=${before}`}`
  )

export type Box = { id: string; name: string; costPoints: number }

export type DexEntry = {
  id: string
  name: string
  grade: string
  fragmentsRequired: number
  status: 'LOCKED' | 'COLLECTING' | 'COMPLETE'
  fragmentCount: number
}

export type OpenBoxResult = {
  result: { type: 'FRAGMENT' | 'FULL_ITEM'; itemId: string; itemName: string; grade: string }
  pointsSpent: number
  pointsBalance: number
  dexEntry: DexEntry
}

export const fetchBoxes = () => request<{ boxes: Box[] }>('/api/game/boxes')

export const fetchDex = () => request<{ items: DexEntry[] }>('/api/game/dex')

export const openBox = (boxId: string) =>
  request<OpenBoxResult>(`/api/game/boxes/${encodeURIComponent(boxId)}/open`, { method: 'POST' })
```

- [ ] **Step 2: Extend `gameApi.test.ts`**

Append at the end of the `describe('gameApi', ...)` block (before the closing `})`):

```ts
  it('opens a box via POST to the encoded box id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { type: 'FRAGMENT', itemId: 'x', itemName: 'X', grade: 'COMMON' }, pointsSpent: 500, pointsBalance: 0, dexEntry: {} }),
    })
    vi.stubGlobal('fetch', fetchMock)
    await openBox('box starter')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/game/boxes/box%20starter/open')
    expect(init.method).toBe('POST')
  })

  it('fetches boxes and dex', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ boxes: [] }) })
    vi.stubGlobal('fetch', fetchMock)
    await fetchBoxes()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/game/boxes')
    await fetchDex()
    expect(fetchMock.mock.calls[1][0]).toBe('/api/game/dex')
  })
```

Find the import line at the top of the test file:

```ts
import { claimSlots, fetchGameState } from './gameApi'
```

Replace with:

```ts
import { claimSlots, fetchGameState, openBox, fetchBoxes, fetchDex } from './gameApi'
```

- [ ] **Step 3: Verify**

Run `npx tsc --noEmit` (clean) and `npx vitest run src/lib/gameApi.test.ts` (expected PASS, 5 tests).

- [ ] **Step 4: Commit**

```bash
git add src/lib/gameApi.ts src/lib/gameApi.test.ts
git commit -m "feat: add client wrappers for boxes, dex, and box opening"
```

---

### Task 6: GameContext — seed-item fix, boxes/dex/openBox

**Files:**
- Modify: `src/state/GameContext.tsx`, `src/state/GameContext.test.tsx`

**Interfaces:**
- Consumes: `fetchBoxes`, `fetchDex`, `openBox` (Task 5).
- Produces: `useGame()` gains `boxes: Box[]`, `dex: DexEntry[]`, `openBox(boxId): Promise<void>`.

- [ ] **Step 1: Replace the whole file with**

```tsx
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocker } from './LockerContext'
import {
  claimSlots as claimSlotsApi,
  fetchGameState,
  fetchBoxes,
  fetchDex,
  openBox as openBoxApi,
  type GameState,
  type Box,
  type DexEntry,
} from '../lib/gameApi'

type GameContextValue = {
  state: GameState | null
  boxes: Box[]
  dex: DexEntry[]
  refresh: () => Promise<void>
  claim: (slotIds: string[]) => Promise<void>
  openBox: (boxId: string) => Promise<void>
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const { items } = useLocker()
  const [state, setState] = useState<GameState | null>(null)
  const [boxes, setBoxes] = useState<Box[]>([])
  const [dex, setDex] = useState<DexEntry[]>([])
  const reconciled = useRef(false)

  const loadCatalogState = useCallback(async () => {
    try {
      const [boxList, dexList] = await Promise.all([fetchBoxes(), fetchDex()])
      setBoxes(boxList.boxes)
      setDex(dexList.items)
    } catch (error) {
      console.warn('game catalog unavailable', error)
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      setState(await fetchGameState())
    } catch (error) {
      console.warn('game state unavailable', error)
    }
    await loadCatalogState()
  }, [loadCatalogState])

  const claim = useCallback(
    async (slotIds: string[]) => {
      if (slotIds.length === 0) {
        await refresh()
        return
      }
      try {
        const result = await claimSlotsApi(slotIds)
        setState(result.state)
      } catch (error) {
        console.warn('game claim failed', error)
      }
      await loadCatalogState()
    },
    [refresh, loadCatalogState]
  )

  const openBox = useCallback(async (boxId: string) => {
    try {
      const result = await openBoxApi(boxId)
      setState((prev) => (prev ? { ...prev, points: result.pointsBalance } : prev))
      setDex((prev) => prev.map((entry) => (entry.id === result.dexEntry.id ? result.dexEntry : entry)))
    } catch (error) {
      console.warn('open box failed', error)
    }
  }, [])

  useEffect(() => {
    if (reconciled.current) return
    reconciled.current = true
    const ids = [
      ...new Set(
        items
          .filter((item) => !item.id.startsWith('seed-'))
          .map((item) => item.masterItemId)
          .filter((id): id is string => Boolean(id))
      ),
    ]
    void claim(ids)
    // reconcile once per app session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <GameContext.Provider value={{ state, boxes, dex, refresh, claim, openBox }}>{children}</GameContext.Provider>
  )
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within a GameProvider')
  return ctx
}
```

(Note: `claim([])` now calls `refresh()` instead of doing nothing, closing the gap the sub-project-1 final review flagged — a fresh install with only `seed-`-prefixed items now still loads real state instead of staying `null` all session.)

- [ ] **Step 2: Rewrite `GameContext.test.tsx`**

Replace the whole file with:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { LockerProvider } from './LockerContext'
import { GameProvider, useGame } from './GameContext'
import * as api from '../lib/gameApi'

vi.mock('../lib/gameApi')

const emptyState: api.GameState = { points: 0, spaces: [], titles: [], benefits: [] }
const claimResult = (points: number): api.ClaimResult => ({
  newSlots: [],
  ignored: [],
  pointsAwarded: 0,
  history: [],
  state: { ...emptyState, points },
})

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <LockerProvider>
      <GameProvider>{children}</GameProvider>
    </LockerProvider>
  )
}

describe('GameContext', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.resetAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(api.fetchBoxes).mockResolvedValue({ boxes: [] })
    vi.mocked(api.fetchDex).mockResolvedValue({ items: [] })
  })

  it('excludes seed- prefixed items but claims real ones', async () => {
    // LockerContext's default state is 100% seed- items, so seed localStorage directly
    // with a mix (one seed item, one real item) to exercise the filter meaningfully.
    window.localStorage.setItem(
      'remembuy:state',
      JSON.stringify({
        items: [
          { id: 'seed-1', name: 'S', locationId: 'bathroom', categoryId: 'bathroom-haircare', masterItemId: 'bathroom-haircare-shampoo', createdAt: '2026-01-01' },
          { id: 'item-1', name: 'R', locationId: 'bathroom', categoryId: 'bathroom-haircare', masterItemId: 'bathroom-haircare-rinse', createdAt: '2026-01-01' },
        ],
        locations: [],
        categories: [],
      })
    )
    vi.mocked(api.claimSlots).mockResolvedValue(claimResult(7))
    const { result } = renderHook(() => useGame(), { wrapper })
    await waitFor(() => expect(result.current.state?.points).toBe(7))
    expect(api.claimSlots).toHaveBeenCalledWith(['bathroom-haircare-rinse'])
  })

  it('a fresh app (only seed- items) reconciles to an empty claim and falls back to refresh', async () => {
    // LockerProvider's default state is SEED_ITEMS (src/data/seedItems.ts), whose ids all
    // start with 'seed-'. After the fix, the reconciliation effect filters them all out,
    // calls claim([]), and claim([]) must call refresh() instead of doing nothing.
    vi.mocked(api.fetchGameState).mockResolvedValue({ ...emptyState, points: 9 })
    const { result } = renderHook(() => useGame(), { wrapper })
    await waitFor(() => expect(result.current.state?.points).toBe(9))
    expect(api.claimSlots).not.toHaveBeenCalled()
    expect(api.fetchGameState).toHaveBeenCalledTimes(1)
  })

  it('openBox updates points and the touched dex entry', async () => {
    vi.mocked(api.claimSlots).mockResolvedValue(claimResult(0))
    vi.mocked(api.fetchDex).mockResolvedValue({
      items: [{ id: 'item-x', name: 'X', grade: 'COMMON', fragmentsRequired: 10, status: 'LOCKED', fragmentCount: 0 }],
    })
    const { result } = renderHook(() => useGame(), { wrapper })
    await waitFor(() => expect(result.current.dex.length).toBe(1))
    vi.mocked(api.openBox).mockResolvedValue({
      result: { type: 'FRAGMENT', itemId: 'item-x', itemName: 'X', grade: 'COMMON' },
      pointsSpent: 500,
      pointsBalance: 1500,
      dexEntry: { id: 'item-x', name: 'X', grade: 'COMMON', fragmentsRequired: 10, status: 'COLLECTING', fragmentCount: 1 },
    })
    await act(async () => {
      await result.current.openBox('box-starter')
    })
    expect(result.current.state?.points).toBe(1500)
    expect(result.current.dex[0].status).toBe('COLLECTING')
    expect(result.current.dex[0].fragmentCount).toBe(1)
  })

  it('swallows API failures', async () => {
    vi.mocked(api.claimSlots).mockRejectedValue(new Error('offline'))
    vi.mocked(api.fetchGameState).mockRejectedValue(new Error('offline'))
    vi.mocked(api.openBox).mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useGame(), { wrapper })
    await waitFor(() => expect(api.claimSlots).toHaveBeenCalled())
    await act(async () => {
      await result.current.claim(['x-slot'])
      await result.current.refresh()
      await result.current.openBox('box-starter')
    })
    expect(result.current.state).toBeNull()
  })
})
```

- [ ] **Step 3: Verify**

Run `npx tsc --noEmit` (clean) and `npx vitest run` (expect 69 tests: 66 existing before this plan + 2 added to `gameApi.test.ts` in Task 5 + 1 net new test in `GameContext.test.tsx` in this task, which goes from 3 tests to 4).

- [ ] **Step 4: Commit**

```bash
git add src/state/GameContext.tsx src/state/GameContext.test.tsx
git commit -m "feat: exclude demo seed items from reconciliation; add box/dex state"
```

---

### Task 7: Verification

**Files:** none (verification only)

- [ ] **Step 1: Automated suite**

Run `npx tsc --noEmit`, `npx vitest run`, `npm run test:server`, `npm run build`. Expected: all pass. Report the exact counts from each tool's own summary.

- [ ] **Step 2: End-to-end smoke against a real running instance**

Start the backend on an isolated port the way sub-project 1's plan did (do not touch a port another running instance might be using — check `Get-NetTCPConnection`/`netstat` first). With a fresh device id:

```bash
curl -s http://localhost:<port>/api/game/boxes -H "X-Device-Id: device-smoke002"
curl -s -X POST http://localhost:<port>/api/game/boxes/box-starter/open -H "X-Device-Id: device-smoke002"
```

Expected: the open returns 400 `{"error":"insufficient points"}` (a fresh device has 0 points). Then claim enough slots to cross 500P (e.g. two slots of a 4-slot group reaches 700P per sub-project 1's own numbers — verify against `server/game/catalog.seed.json` for a real 4-slot group id) and open again — expect 200 with a `result.type` of `FRAGMENT` or `FULL_ITEM` and `pointsBalance` reduced by exactly 500. Repeat until points run out again — confirm the eventual 400.

- [ ] **Step 3: Clean up**

Remove any smoke-test rows for the smoke device id the same way sub-project 1's plan did (targeted `DELETE ... WHERE user_id = ?` across `point_history`, `user_item_fragments`, `user_items`, then `users` — never delete the database file itself if it may hold a real device's data).

- [ ] **Step 4: Commit fixes only if needed.**
