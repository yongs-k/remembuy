import test from 'node:test'
import assert from 'node:assert/strict'
import { openDb, transaction, migrate } from './db.js'
import { getDex, getBoxes, openBox, getRoomStages, getAttendance, claimAttendance, attendanceDay } from './itemService.js'

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
  assert.equal(dex.length, 59)
  assert.ok(dex.every((entry) => entry.roomType))
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

test('four fragments complete a 장소 stage and open the next grade', () => {
  const db = freshDbWithPoints(5000)
  // randomFn 0: the first 장소 (욕실) and its first item of the current grade.
  for (let i = 1; i <= 3; i++) {
    const r = openBox(db, DEVICE, 'box-starter', NOW, () => 0)
    assert.deepEqual(r.room, { spaceId: 'bathroom', grade: 'COMMON', count: i, completed: false })
  }
  const fourth = openBox(db, DEVICE, 'box-starter', NOW, () => 0)
  assert.deepEqual(fourth.room, { spaceId: 'bathroom', grade: 'COMMON', count: 4, completed: true })
  const fifth = openBox(db, DEVICE, 'box-starter', NOW, () => 0)
  assert.equal(fifth.room.grade, 'ADVANCED')
  assert.equal(fifth.result.grade, 'ADVANCED')
  const bathroom = getRoomStages(db, DEVICE).find((room) => room.spaceId === 'bathroom')
  assert.deepEqual(bathroom, { spaceId: 'bathroom', stage: 'ADVANCED', count: 1, completedGrades: ['COMMON'] })
})

test('the drawn item still collects fragments toward completion', () => {
  const db = freshDbWithPoints(5000)
  db.prepare("UPDATE virtual_items SET fragments_required = 2 WHERE id = 'item-basin-basic'").run()
  assert.equal(openBox(db, DEVICE, 'box-starter', NOW, () => 0).dexEntry.status, 'COLLECTING')
  const second = openBox(db, DEVICE, 'box-starter', NOW, () => 0)
  assert.equal(second.dexEntry.status, 'COMPLETE')
  assert.equal(second.dexEntry.fragmentCount, 2)
})

test('a 장소 never drops a grade above its current stage', () => {
  const db = freshDbWithPoints(50000)
  for (let i = 0; i < 40; i++) {
    const r = openBox(db, DEVICE, 'box-starter', NOW, Math.random)
    assert.equal(r.result.grade, r.room.grade)
  }
  for (const room of getRoomStages(db, DEVICE)) {
    assert.ok(room.completedGrades.every((grade, i) => grade === ['COMMON', 'ADVANCED', 'RARE', 'LEGENDARY'][i]))
  }
})

test('with nothing left to draw the open fails and spends nothing', () => {
  const db = freshDbWithPoints(5000)
  db.exec('UPDATE virtual_items SET active = 0')
  assert.throws(() => openBox(db, DEVICE, 'box-starter', NOW, () => 0), /nothing to draw/)
  assert.equal(pointsOf(db, DEVICE), 5000)
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

test('attendance opens one free box per Korean day without touching points', () => {
  const db = freshDbWithPoints(0)
  assert.equal(getAttendance(db, DEVICE, NOW).claimedToday, false)
  const result = claimAttendance(db, DEVICE, NOW, () => 0)
  assert.equal(result.pointsSpent, 0)
  assert.equal(pointsOf(db, DEVICE), 0)
  assert.ok(result.dexEntry.fragmentCount + (result.dexEntry.status === 'COMPLETE' ? 1 : 0) > 0)
  assert.equal(getAttendance(db, DEVICE, NOW).claimedToday, true)
  assert.throws(() => claimAttendance(db, DEVICE, NOW, () => 0), /already claimed/)
})

test('attendance resets at midnight Korea time, not UTC', () => {
  // 14:59 UTC is 23:59 KST; 15:00 UTC is the next KST day.
  assert.equal(attendanceDay(new Date('2026-10-01T14:59:00.000Z')), '2026-10-01')
  assert.equal(attendanceDay(new Date('2026-10-01T15:00:00.000Z')), '2026-10-02')
  const db = freshDbWithPoints(0)
  claimAttendance(db, DEVICE, new Date('2026-10-01T14:59:00.000Z'), () => 0)
  assert.doesNotThrow(() => claimAttendance(db, DEVICE, new Date('2026-10-01T15:00:00.000Z'), () => 0))
})

test('an older database gains the new 장소 items and keeps its own', () => {
  const db = openDb(':memory:')
  // Simulate the 14-item, room-less database from before 장소 items existed.
  db.exec("DELETE FROM box_drop_entries WHERE item_id NOT LIKE 'item-%' OR item_id IN (SELECT id FROM virtual_items WHERE room_type <> 'bathroom')")
  db.exec("DELETE FROM virtual_items WHERE room_type <> 'bathroom'")
  db.exec('UPDATE virtual_items SET room_type = NULL')
  migrate(db)
  migrate(db)
  const dex = getDex(db, DEVICE)
  assert.equal(dex.length, 59)
  assert.equal(dex.find((d) => d.id === 'item-basin-basic').roomType, 'bathroom')
  const entries = db.prepare("SELECT COUNT(*) AS n FROM box_drop_entries WHERE item_id = 'item-car-diffuser'").get().n
  assert.equal(entries, 2)
})
