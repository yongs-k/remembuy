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
  const db = freshDbWithPoints(5500)
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
  assert.equal(again.dexEntry.fragmentCount, 11)
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
