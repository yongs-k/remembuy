import test from 'node:test'
import assert from 'node:assert/strict'
import { openDb, transaction, migrate } from './db.js'
import { getDex, getBoxes, openBox, openBoxes, getRoomStages, getStacks, combinePieces, achieveStage, getAttendance, claimAttendance, attendanceDay } from './itemService.js'

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

const stockRow = (db, space, grade, count) => {
  db.prepare('INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)').run(DEVICE, NOW.toISOString())
  db.prepare('INSERT INTO user_piece_stock (user_id, space_id, grade, count) VALUES (?, ?, ?, ?)').run(DEVICE, space, grade, count)
}
const room = (db, space) => getRoomStages(db, DEVICE).find((r) => r.spaceId === space)

test("a piece of the 장소's grade adds +1 with no limit; 4 makes it ready", () => {
  const db = freshDbWithPoints(5000)
  // randomFn 0: 욕실's first 일반 item every time.
  const counts = []
  for (let i = 0; i < 5; i++) counts.push(openBox(db, DEVICE, 'box-starter', NOW, () => 0).room)
  assert.deepEqual(counts.map((r) => r.count), [1, 2, 3, 4, 5])
  assert.deepEqual(counts.map((r) => r.ready), [false, false, false, true, true])
  assert.equal(counts[0].source, 'stage')
  assert.deepEqual(room(db, 'bathroom'), { spaceId: 'bathroom', stage: 'COMMON', count: 5, completedGrades: [] })
})

test("another grade's piece is kept for 조합, not counted", () => {
  const db = freshDbWithPoints(5000)
  db.exec("UPDATE box_drop_entries SET active = 0 WHERE item_id <> 'item-mirror-gold'")
  const r = openBox(db, DEVICE, 'box-starter', NOW, () => 0)
  assert.equal(r.result.grade, 'RARE')
  assert.deepEqual(r.room, { spaceId: 'bathroom', grade: 'RARE', slot: 0, source: 'stock', count: 1, ready: false })
  assert.equal(room(db, 'bathroom').count, 0)
  assert.deepEqual(getStacks(db, DEVICE), [{ spaceId: 'bathroom', grade: 'RARE', source: 'stock', count: 1 }])
})

test('달성 spends four, keeps the rest as stock, and moves to the next grade', () => {
  const db = freshDbWithPoints(5000)
  for (let i = 0; i < 3; i++) openBox(db, DEVICE, 'box-starter', NOW, () => 0)
  assert.throws(() => achieveStage(db, DEVICE, 'bathroom'), /not ready/)
  openBox(db, DEVICE, 'box-starter', NOW, () => 0)
  openBox(db, DEVICE, 'box-starter', NOW, () => 0)
  const { achieved, rooms, stacks } = achieveStage(db, DEVICE, 'bathroom')
  assert.deepEqual(achieved, { spaceId: 'bathroom', grade: 'COMMON' })
  assert.deepEqual(rooms.find((r) => r.spaceId === 'bathroom'), {
    spaceId: 'bathroom',
    stage: 'ADVANCED',
    count: 0,
    completedGrades: ['COMMON'],
  })
  assert.deepEqual(stacks, [{ spaceId: 'bathroom', grade: 'COMMON', source: 'stock', count: 1 }])
  // A 일반 piece now goes to stock: 욕실 collects 고급.
  assert.equal(openBox(db, DEVICE, 'box-starter', NOW, () => 0).room.source, 'stock')
  assert.throws(() => achieveStage(db, DEVICE, 'nowhere'), /space not found/)
})

test('자동 넣기 takes ten from stacks of four or more, tallest first', () => {
  const db = freshDbWithPoints(0)
  stockRow(db, 'kitchen', 'COMMON', 6)
  stockRow(db, 'car', 'COMMON', 5)
  stockRow(db, 'laundry', 'COMMON', 3)
  const { piece, stacks } = combinePieces(db, DEVICE, 'COMMON', undefined, () => 0)
  assert.equal(piece.grade, 'ADVANCED')
  assert.deepEqual(
    stacks.filter((stack) => stack.grade === 'COMMON'),
    [
      { spaceId: 'car', grade: 'COMMON', source: 'stock', count: 1 },
      { spaceId: 'laundry', grade: 'COMMON', source: 'stock', count: 3 },
    ]
  )
  // Four left, but none in a stack of four: 자동 넣기 can't, picking by hand still could.
  assert.throws(() => combinePieces(db, DEVICE, 'COMMON'), /not enough pieces/)
  assert.throws(() => combinePieces(db, DEVICE, 'LEGENDARY'), /invalid grade/)
})

test('pieces picked by hand must add up to ten and exist', () => {
  const db = freshDbWithPoints(0)
  stockRow(db, 'laundry', 'COMMON', 3)
  stockRow(db, 'car', 'COMMON', 3)
  stockRow(db, 'entrance', 'COMMON', 4)
  const picks = [
    { spaceId: 'laundry', source: 'stock', count: 3 },
    { spaceId: 'car', source: 'stock', count: 3 },
    { spaceId: 'entrance', source: 'stock', count: 4 },
  ]
  assert.throws(() => combinePieces(db, DEVICE, 'COMMON', picks.slice(0, 2)), /invalid picks/)
  // laundry has only 3, so asking for 4 of them fails even though the total is ten.
  const tooMany = [
    { spaceId: 'laundry', source: 'stock', count: 4 },
    { spaceId: 'car', source: 'stock', count: 3 },
    { spaceId: 'entrance', source: 'stock', count: 3 },
  ]
  assert.throws(() => combinePieces(db, DEVICE, 'COMMON', tooMany), /not enough pieces/)
  const { piece, stacks } = combinePieces(db, DEVICE, 'COMMON', picks, () => 0)
  assert.equal(piece.grade, 'ADVANCED')
  assert.equal(stacks.filter((stack) => stack.grade === 'COMMON').length, 0)
})

test('older piece data becomes stages and stock', () => {
  const db = openDb(':memory:')
  db.prepare('INSERT INTO users (id, created_at) VALUES (?, ?)').run(DEVICE, NOW.toISOString())
  const put = db.prepare('INSERT INTO user_room_pieces (user_id, space_id, grade, slot, count) VALUES (?, ?, ?, ?, ?)')
  // 욕실: all four 일반 slots (5 pieces) and two 고급 pieces in one slot.
  ;[2, 1, 1, 1].forEach((n, slot) => put.run(DEVICE, 'bathroom', 'COMMON', slot, n))
  put.run(DEVICE, 'bathroom', 'ADVANCED', 0, 2)
  // 주방: three 일반 pieces in two slots.
  put.run(DEVICE, 'kitchen', 'COMMON', 0, 1)
  put.run(DEVICE, 'kitchen', 'COMMON', 1, 2)
  migrate(db)
  assert.deepEqual(room(db, 'bathroom'), { spaceId: 'bathroom', stage: 'ADVANCED', count: 2, completedGrades: ['COMMON'] })
  assert.deepEqual(room(db, 'kitchen'), { spaceId: 'kitchen', stage: 'COMMON', count: 3, completedGrades: [] })
  assert.deepEqual(
    getStacks(db, DEVICE).filter((stack) => stack.source === 'stock'),
    [{ spaceId: 'bathroom', grade: 'COMMON', source: 'stock', count: 1 }]
  )
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM user_room_pieces').get().n, 0)
})

test('the first per-grade fragment counts still migrate through to stages', () => {
  const db = openDb(':memory:')
  db.prepare('INSERT INTO users (id, created_at) VALUES (?, ?)').run(DEVICE, NOW.toISOString())
  db.prepare("INSERT INTO user_room_fragments (user_id, space_id, grade, count) VALUES (?, 'bathroom', 'COMMON', 4), (?, 'kitchen', 'COMMON', 2)").run(DEVICE, DEVICE)
  migrate(db)
  assert.equal(room(db, 'bathroom').stage, 'ADVANCED')
  assert.equal(room(db, 'kitchen').count, 2)
})

test('the drawn item still collects fragments toward completion', () => {
  const db = freshDbWithPoints(5000)
  db.prepare("UPDATE virtual_items SET fragments_required = 2 WHERE id = 'item-basin-basic'").run()
  assert.equal(openBox(db, DEVICE, 'box-starter', NOW, () => 0).dexEntry.status, 'COLLECTING')
  const second = openBox(db, DEVICE, 'box-starter', NOW, () => 0)
  assert.equal(second.dexEntry.status, 'COMPLETE')
  assert.equal(second.dexEntry.fragmentCount, 2)
})

test('with nothing left to draw the open fails and spends nothing', () => {
  const db = freshDbWithPoints(5000)
  db.exec('UPDATE virtual_items SET active = 0')
  assert.throws(() => openBox(db, DEVICE, 'box-starter', NOW, () => 0), /nothing to draw/)
  assert.equal(pointsOf(db, DEVICE), 5000)
})

test('opening ten at once spends ten costs and counts every piece', () => {
  const db = freshDbWithPoints(5000)
  const { results, pointsBalance } = openBoxes(db, DEVICE, 'box-starter', 10, NOW, () => 0)
  assert.equal(results.length, 10)
  assert.equal(pointsBalance, 0)
  assert.equal(pointsOf(db, DEVICE), 0)
  assert.deepEqual(results.map((r) => r.room.count), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  assert.equal(room(db, 'bathroom').count, 10)
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
