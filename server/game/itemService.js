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
    roomType: item.room_type,
    status: itemStatus(db, userId, item.id),
    fragmentCount: fragmentCount(db, userId, item.id),
  }
}

export function getDex(db, userId) {
  const items = plain(
    db
      .prepare('SELECT id, name, grade, fragments_required, room_type FROM virtual_items WHERE active = 1 ORDER BY grade, id')
      .all()
  )
  return items.map((item) => dexEntryFor(db, userId, item))
}

export const GRADES = ['COMMON', 'ADVANCED', 'RARE', 'LEGENDARY']
export const STAGE_SIZE = 4

/** Each 장소's stage: the first grade with fewer than 4 fragments (null once 전설 is done). */
export function getRoomStages(db, userId) {
  const spaces = plain(db.prepare('SELECT id FROM spaces WHERE active = 1 ORDER BY sort, id').all())
  const rows = plain(db.prepare('SELECT space_id, grade, count FROM user_room_fragments WHERE user_id = ?').all(userId))
  return spaces.map(({ id }) => {
    const counts = Object.fromEntries(GRADES.map((grade) => [grade, 0]))
    for (const row of rows) if (row.space_id === id && row.grade in counts) counts[row.grade] = row.count
    const stage = GRADES.find((grade) => counts[grade] < STAGE_SIZE) ?? null
    return {
      spaceId: id,
      stage,
      count: stage ? counts[stage] : STAGE_SIZE,
      completedGrades: GRADES.filter((grade) => counts[grade] >= STAGE_SIZE),
    }
  })
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
    return openBoxIn(db, userId, box, nowIso, randomFn, box.cost_points)
  })
}

export const MAX_OPEN_COUNT = 10

/** Opens `count` boxes at once: all of them or, if points run short or a draw fails, none. */
export function openBoxes(db, userId, boxId, count, now = new Date(), randomFn = Math.random) {
  const nowIso = now.toISOString()
  return transaction(db, () => {
    const box = db.prepare('SELECT id, cost_points FROM boxes WHERE id = ? AND active = 1').get(boxId)
    if (!box) throw new Error('box not found')
    const results = []
    for (let i = 0; i < count; i++) results.push(openBoxIn(db, userId, box, nowIso, randomFn, box.cost_points))
    return { results, pointsBalance: results[results.length - 1].pointsBalance }
  })
}

// Opens a box inside the caller's transaction (transaction() can't nest).
// cost 0 is the free 출석 box: nothing is charged and no points are created.
function openBoxIn(db, userId, box, nowIso, randomFn, cost) {
  const boxId = box.id
  db.prepare('INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)').run(userId, nowIso)
  const balance = db
    .prepare('SELECT COALESCE(SUM(amount), 0) AS n FROM point_history WHERE user_id = ?')
    .get(userId).n
  if (balance < cost) throw new Error('insufficient points')

  if (cost > 0) {
    db.prepare(
      "INSERT INTO point_history (user_id, amount, type, source_id, created_at) VALUES (?, ?, 'ITEM_BOX_OPEN', ?, ?)"
    ).run(userId, -cost, boxId, nowIso)
  }

  // A 장소 at random among those whose current stage has something to drop; then an
  // item of that 장소 and grade, weighted by the box's FRAGMENT entries (admin-tunable).
  const entries = plain(
    db
      .prepare(
        `SELECT e.item_id AS item_id, e.weight AS weight, i.room_type AS room_type, i.grade AS grade
         FROM box_drop_entries e
         JOIN virtual_items i ON i.id = e.item_id
         WHERE e.box_id = ? AND e.active = 1 AND i.active = 1 AND e.result_type = 'FRAGMENT'`
      )
      .all(boxId)
  )
  const open = getRoomStages(db, userId)
    .map((room) => ({ room, pool: entries.filter((e) => e.room_type === room.spaceId && e.grade === room.stage) }))
    .filter(({ room, pool }) => room.stage && pool.length > 0)
  if (open.length === 0) throw new Error('nothing to draw')
  const { room, pool } = open[Math.min(open.length - 1, Math.floor(randomFn() * open.length))]
  const picked = pickWeighted(pool, randomFn)
  const item = { ...db.prepare('SELECT id, name, grade, fragments_required, room_type FROM virtual_items WHERE id = ?').get(picked.item_id) }

  db.prepare(
    `INSERT INTO user_room_fragments (user_id, space_id, grade, count) VALUES (?, ?, ?, 1)
     ON CONFLICT (user_id, space_id, grade) DO UPDATE SET count = count + 1`
  ).run(userId, room.spaceId, room.stage)
  const stageCount = room.count + 1

  // The item gets the fragment too, for the 아이템 수집함.
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


  return {
    result: { type: 'FRAGMENT', itemId: item.id, itemName: item.name, grade: item.grade },
    room: { spaceId: room.spaceId, grade: room.stage, count: Math.min(stageCount, STAGE_SIZE), completed: stageCount >= STAGE_SIZE },
    pointsSpent: cost,
    pointsBalance: balance - cost,
    dexEntry: dexEntryFor(db, userId, item),
  }
}

/** Attendance resets at midnight Korea time (UTC+9), the app's only locale. */
export function attendanceDay(now = new Date()) {
  return new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 10)
}

export function getAttendance(db, userId, now = new Date()) {
  const day = attendanceDay(now)
  const row = db.prepare('SELECT 1 AS x FROM attendance WHERE user_id = ? AND day = ?').get(userId, day)
  return { day, claimedToday: Boolean(row) }
}

/** 출석하기: once per day, open the cheapest active box for free (fragments, never points). */
export function claimAttendance(db, userId, now = new Date(), randomFn = Math.random) {
  const nowIso = now.toISOString()
  const day = attendanceDay(now)
  return transaction(db, () => {
    if (db.prepare('SELECT 1 AS x FROM attendance WHERE user_id = ? AND day = ?').get(userId, day)) {
      throw new Error('already claimed')
    }
    const box = db
      .prepare('SELECT id, cost_points FROM boxes WHERE active = 1 ORDER BY cost_points, id LIMIT 1')
      .get()
    if (!box) throw new Error('box not found')
    const result = openBoxIn(db, userId, box, nowIso, randomFn, 0)
    db.prepare('INSERT INTO attendance (user_id, day, box_id, claimed_at) VALUES (?, ?, ?, ?)').run(
      userId,
      day,
      box.id,
      nowIso
    )
    return result
  })
}
