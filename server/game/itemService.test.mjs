import test from 'node:test'
import assert from 'node:assert/strict'
import { openDb, transaction, migrate } from './db.js'
import { getDex, getBoxes, openBox, openBoxes, getRoomStages, getDuplicates, combinePieces, getAttendance, claimAttendance, attendanceDay } from './itemService.js'

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

// A box draws the 장소, then the item, then the piece slot. This lands on 욕실,
// its first item, and the given slot.
const onSlot = (slot) => {
  const seq = [0, 0, (slot + 0.5) / 4]
  let i = 0
  return () => seq[i++ % seq.length]
}

test('four different pieces complete a 장소 stage; a repeat is a duplicate', () => {
  const db = freshDbWithPoints(5000)
  const first = openBox(db, DEVICE, 'box-starter', NOW, onSlot(0))
  assert.deepEqual(first.room, { spaceId: 'bathroom', grade: 'COMMON', slot: 0, copies: 1, pieces: [1, 0, 0, 0], count: 1, completed: false })
  const again = openBox(db, DEVICE, 'box-starter', NOW, onSlot(0))
  assert.deepEqual(again.room, { spaceId: 'bathroom', grade: 'COMMON', slot: 0, copies: 2, pieces: [2, 0, 0, 0], count: 1, completed: false })
  openBox(db, DEVICE, 'box-starter', NOW, onSlot(1))
  openBox(db, DEVICE, 'box-starter', NOW, onSlot(2))
  const last = openBox(db, DEVICE, 'box-starter', NOW, onSlot(3))
  assert.equal(last.room.count, 4)
  assert.equal(last.room.completed, true)
  const next = openBox(db, DEVICE, 'box-starter', NOW, onSlot(0))
  assert.equal(next.room.grade, 'ADVANCED')
  const bathroom = getRoomStages(db, DEVICE).find((room) => room.spaceId === 'bathroom')
  assert.deepEqual(bathroom, { spaceId: 'bathroom', stage: 'ADVANCED', pieces: [1, 0, 0, 0], count: 1, completedGrades: ['COMMON'] })
  assert.equal(getDuplicates(db, DEVICE).COMMON, 1)
})

test('조합 turns ten spare pieces of a grade into one piece of the next grade', () => {
  const db = freshDbWithPoints(0)
  db.prepare("INSERT INTO users (id, created_at) VALUES (?, ?) ON CONFLICT DO NOTHING").run(DEVICE, NOW.toISOString())
  const put = db.prepare('INSERT INTO user_room_pieces (user_id, space_id, grade, slot, count) VALUES (?, ?, ?, ?, ?)')
  put.run(DEVICE, 'kitchen', 'COMMON', 0, 7) // 6 spare
  put.run(DEVICE, 'car', 'COMMON', 2, 5) // 4 spare
  assert.equal(getDuplicates(db, DEVICE).COMMON, 10)
  const { piece, duplicates } = combinePieces(db, DEVICE, 'COMMON', () => 0)
  assert.equal(piece.grade, 'ADVANCED')
  assert.equal(piece.copies, 1)
  assert.equal(duplicates.COMMON, 0)
  // The first copies stay: no 장소 loses a piece it had.
  const pieces = (space) => getRoomStages(db, DEVICE).find((room) => room.spaceId === space).pieces
  assert.deepEqual(pieces('kitchen'), [1, 0, 0, 0])
  assert.deepEqual(pieces('car'), [0, 0, 1, 0])
  assert.throws(() => combinePieces(db, DEVICE, 'COMMON'), /not enough duplicates/)
  assert.throws(() => combinePieces(db, DEVICE, 'LEGENDARY'), /invalid grade/)
  assert.throws(() => combinePieces(db, DEVICE, 'NOPE'), /invalid grade/)
})

test('the old per-grade fragment counts become puzzle pieces', () => {
  const db = openDb(':memory:')
  db.prepare('INSERT INTO users (id, created_at) VALUES (?, ?)').run(DEVICE, NOW.toISOString())
  db.prepare("INSERT INTO user_room_fragments (user_id, space_id, grade, count) VALUES (?, 'bathroom', 'COMMON', 4), (?, 'kitchen', 'COMMON', 2)").run(DEVICE, DEVICE)
  migrate(db)
  const rooms = getRoomStages(db, DEVICE)
  assert.deepEqual(rooms.find((room) => room.spaceId === 'bathroom').completedGrades, ['COMMON'])
  assert.deepEqual(rooms.find((room) => room.spaceId === 'kitchen').pieces, [1, 1, 0, 0])
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM user_room_fragments').get().n, 0)
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

test('opening ten at once spends ten costs; repeats of a piece pile up as duplicates', () => {
  const db = freshDbWithPoints(5000)
  const { results, pointsBalance } = openBoxes(db, DEVICE, 'box-starter', 10, NOW, () => 0)
  assert.equal(results.length, 10)
  assert.equal(pointsBalance, 0)
  assert.equal(pointsOf(db, DEVICE), 0)
  // randomFn 0: 욕실's top-left 일반 piece ten times.
  assert.deepEqual(results.map((r) => r.room.copies), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  assert.equal(getDuplicates(db, DEVICE).COMMON, 9)
})

test('ten opens without points for all ten open none', () => {
  const db = freshDbWithPoints(4999)
  assert.throws(() => openBoxes(db, DEVICE, 'box-starter', 10, NOW, () => 0), /insufficient points/)
  assert.equal(pointsOf(db, DEVICE), 4999)
  assert.equal(getRoomStages(db, DEVICE).find((room) => room.spaceId === 'bathroom').count, 0)
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
