import test from 'node:test'
import assert from 'node:assert/strict'
import { openDb, migrate, transaction, loadDefaultCatalog } from './db.js'

const count = (db, table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n

test('openDb seeds the catalog and the default config', () => {
  const db = openDb(':memory:')
  assert.equal(count(db, 'spaces'), 10)
  assert.equal(count(db, 'product_groups'), 23)
  assert.equal(count(db, 'slots'), 87)
  assert.equal(count(db, 'title_tiers'), 4)
  assert.equal(count(db, 'title_benefits'), 4)
  assert.equal(count(db, 'point_rules'), 1)
  const tiers = db
    .prepare('SELECT code, min_percent, reward_points FROM title_tiers ORDER BY sort')
    .all()
    .map((row) => ({ ...row }))
  assert.deepEqual(tiers, [
    { code: 'SPROUT', min_percent: 25, reward_points: 200 },
    { code: 'MANAGER', min_percent: 50, reward_points: 500 },
    { code: 'EXPERT', min_percent: 75, reward_points: 1000 },
    { code: 'MASTER', min_percent: 100, reward_points: 2000 },
  ])
  const rates = db
    .prepare("SELECT tier_code, value FROM title_benefits WHERE type = 'POINT_RATE' ORDER BY id")
    .all()
    .map((row) => ({ ...row }))
  assert.deepEqual(rates, [
    { tier_code: 'SPROUT', value: 0 },
    { tier_code: 'MANAGER', value: 300 },
    { tier_code: 'EXPERT', value: 700 },
    { tier_code: 'MASTER', value: 1200 },
  ])
  const rule = { ...db.prepare("SELECT key, amount FROM point_rules WHERE key = 'COLLECTION_COMPLETE'").get() }
  assert.deepEqual(rule, { key: 'COLLECTION_COMPLETE', amount: 500 })
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
})

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

test('foreign keys are enforced', () => {
  const db = openDb(':memory:')
  db.prepare("INSERT INTO users (id, created_at) VALUES ('device-0001', 'x')").run()
  assert.throws(() =>
    db
      .prepare("INSERT INTO slot_claims (user_id, slot_id, claimed_at) VALUES ('device-0001', 'nope', 'x')")
      .run()
  )
})

test('transaction returns the result and rolls back on error', () => {
  const db = openDb(':memory:')
  assert.equal(
    transaction(db, () => 42),
    42
  )
  assert.throws(
    () =>
      transaction(db, () => {
        db.prepare("INSERT INTO users (id, created_at) VALUES ('device-0002', 'x')").run()
        throw new Error('boom')
      }),
    /boom/
  )
  assert.equal(count(db, 'users'), 0)
})
