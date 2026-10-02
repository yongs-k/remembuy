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
/** Puzzle pieces per grade per 장소; owning all four completes the stage (e.g. 일반 욕실). */
export const STAGE_SIZE = 4
/** Duplicate pieces of one grade that 조합 turns into one piece of the next grade. */
export const COMBINE_COST = 10

const owned = (pieces) => pieces.filter((n) => n > 0).length

/** Piece counts per 장소 and grade: { [spaceId]: { [grade]: [n0, n1, n2, n3] } }. */
function pieceTable(db, userId) {
  const table = {}
  for (const row of plain(db.prepare('SELECT space_id, grade, slot, count FROM user_room_pieces WHERE user_id = ?').all(userId))) {
    const byGrade = (table[row.space_id] ??= {})
    const pieces = (byGrade[row.grade] ??= [0, 0, 0, 0])
    if (row.slot >= 0 && row.slot < STAGE_SIZE) pieces[row.slot] = row.count
  }
  return table
}

/**
 * Each 장소's stage: the first grade with a missing piece (null once 전설 is complete).
 * `pieces` are that grade's four slot counts, `count` how many slots are owned.
 */
export function getRoomStages(db, userId) {
  const spaces = plain(db.prepare('SELECT id FROM spaces WHERE active = 1 ORDER BY sort, id').all())
  const table = pieceTable(db, userId)
  return spaces.map(({ id }) => {
    const piecesOf = (grade) => table[id]?.[grade] ?? [0, 0, 0, 0]
    const stage = GRADES.find((grade) => owned(piecesOf(grade)) < STAGE_SIZE) ?? null
    const pieces = piecesOf(stage ?? 'LEGENDARY')
    return {
      spaceId: id,
      stage,
      pieces,
      count: owned(pieces),
      completedGrades: GRADES.filter((grade) => owned(piecesOf(grade)) === STAGE_SIZE),
    }
  })
}

/** Spare copies per grade across every 장소 (a piece's first copy is never spare). */
export function getDuplicates(db, userId) {
  const duplicates = Object.fromEntries(GRADES.map((grade) => [grade, 0]))
  for (const row of plain(db.prepare('SELECT grade, count FROM user_room_pieces WHERE user_id = ?').all(userId))) {
    if (row.grade in duplicates) duplicates[row.grade] += Math.max(0, row.count - 1)
  }
  return duplicates
}

/** Adds one piece and says what it did to that 장소's stage. */
function addPiece(db, userId, spaceId, grade, slot) {
  const before = pieceTable(db, userId)[spaceId]?.[grade] ?? [0, 0, 0, 0]
  db.prepare(
    `INSERT INTO user_room_pieces (user_id, space_id, grade, slot, count) VALUES (?, ?, ?, ?, 1)
     ON CONFLICT (user_id, space_id, grade, slot) DO UPDATE SET count = count + 1`
  ).run(userId, spaceId, grade, slot)
  const after = before.map((n, i) => (i === slot ? n + 1 : n))
  return {
    spaceId,
    grade,
    slot,
    copies: after[slot],
    pieces: after,
    count: owned(after),
    // Only the piece that fills the last gap completes the stage.
    completed: before[slot] === 0 && owned(after) === STAGE_SIZE,
  }
}

/**
 * 조합: ten spare pieces of one grade become one piece of the next grade. It goes to a
 * 장소 still missing that grade (one already working on it first), into an empty slot.
 */
export function combinePieces(db, userId, grade, randomFn = Math.random) {
  const index = GRADES.indexOf(grade)
  if (index < 0 || index === GRADES.length - 1) throw new Error('invalid grade')
  const next = GRADES[index + 1]
  return transaction(db, () => {
    if (getDuplicates(db, userId)[grade] < COMBINE_COST) throw new Error('not enough duplicates')
    // Spend from the most-duplicated pieces first; never a piece's last copy.
    let left = COMBINE_COST
    const rows = plain(
      db
        .prepare('SELECT space_id, slot, count FROM user_room_pieces WHERE user_id = ? AND grade = ? AND count > 1 ORDER BY count DESC, space_id, slot')
        .all(userId, grade)
    )
    const spend = db.prepare('UPDATE user_room_pieces SET count = count - ? WHERE user_id = ? AND space_id = ? AND grade = ? AND slot = ?')
    for (const row of rows) {
      if (left === 0) break
      const take = Math.min(left, row.count - 1)
      spend.run(take, userId, row.space_id, grade, row.slot)
      left -= take
    }

    const rooms = getRoomStages(db, userId)
    const table = pieceTable(db, userId)
    const missing = (spaceId) => (table[spaceId]?.[next] ?? [0, 0, 0, 0]).flatMap((n, i) => (n === 0 ? [i] : []))
    const working = rooms.filter((room) => room.stage === next)
    const lacking = rooms.filter((room) => missing(room.spaceId).length > 0)
    const pool = working.length ? working : lacking.length ? lacking : rooms
    const room = pool[Math.min(pool.length - 1, Math.floor(randomFn() * pool.length))]
    const gaps = missing(room.spaceId)
    const slot = gaps.length ? gaps[Math.min(gaps.length - 1, Math.floor(randomFn() * gaps.length))] : Math.floor(randomFn() * STAGE_SIZE) % STAGE_SIZE
    const piece = addPiece(db, userId, room.spaceId, next, slot)
    return { piece, duplicates: getDuplicates(db, userId) }
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

  // One of the stage's four pieces at random: owned ones come again as duplicates.
  const slot = Math.min(STAGE_SIZE - 1, Math.floor(randomFn() * STAGE_SIZE))
  const piece = addPiece(db, userId, room.spaceId, room.stage, slot)

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
    room: piece,
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
