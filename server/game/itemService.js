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
/** Pieces of a 장소's current grade needed to press 달성 (e.g. 일반 욕실). */
export const STAGE_SIZE = 4
/** Pieces of one grade that 조합 turns into one piece of the next grade. */
export const COMBINE_COST = 10
/** 자동 넣기 only draws from stacks at least this tall; smaller ones need picking by hand. */
export const AUTO_MIN_STACK = 4

/**
 * Each 장소's stage: the grade it is collecting (null once 전설 is achieved) and
 * `count`, the pieces of that grade gathered so far (the tile's +N; no upper limit).
 */
export function getRoomStages(db, userId) {
  const spaces = plain(db.prepare('SELECT id FROM spaces WHERE active = 1 ORDER BY sort, id').all())
  const rows = Object.fromEntries(
    plain(db.prepare('SELECT space_id, grade, count FROM user_room_stage WHERE user_id = ?').all(userId)).map((row) => [
      row.space_id,
      row,
    ])
  )
  return spaces.map(({ id }) => {
    const row = rows[id] ?? { grade: 'COMMON', count: 0 }
    const stage = GRADES.includes(row.grade) ? row.grade : null
    return {
      spaceId: id,
      stage,
      count: stage ? row.count : 0,
      completedGrades: GRADES.slice(0, stage ? GRADES.indexOf(stage) : GRADES.length),
    }
  })
}

/**
 * Every pile of pieces the user can put into 조합: a 장소's stage pieces (source
 * 'stage') and pieces kept aside because their grade wasn't that 장소's stage ('stock').
 */
export function getStacks(db, userId) {
  const stage = getRoomStages(db, userId)
    .filter((room) => room.stage && room.count > 0)
    .map((room) => ({ spaceId: room.spaceId, grade: room.stage, source: 'stage', count: room.count }))
  const stock = plain(
    db.prepare('SELECT space_id, grade, count FROM user_piece_stock WHERE user_id = ? AND count > 0 ORDER BY grade, space_id').all(userId)
  ).map((row) => ({ spaceId: row.space_id, grade: row.grade, source: 'stock', count: row.count }))
  return [...stage, ...stock]
}

function addToStock(db, userId, spaceId, grade, n) {
  db.prepare(
    `INSERT INTO user_piece_stock (user_id, space_id, grade, count) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, space_id, grade) DO UPDATE SET count = count + excluded.count`
  ).run(userId, spaceId, grade, n)
  return db.prepare('SELECT count FROM user_piece_stock WHERE user_id = ? AND space_id = ? AND grade = ?').get(userId, spaceId, grade).count
}

/**
 * One piece arrives: it counts toward the 장소's stage when it is that grade (+1),
 * otherwise it is kept for 조합.
 */
function addPiece(db, userId, spaceId, grade, slot) {
  const room = getRoomStages(db, userId).find((r) => r.spaceId === spaceId)
  if (room && room.stage === grade) {
    db.prepare(
      `INSERT INTO user_room_stage (user_id, space_id, grade, count) VALUES (?, ?, ?, 1)
       ON CONFLICT (user_id, space_id) DO UPDATE SET count = count + 1`
    ).run(userId, spaceId, grade)
    const count = room.count + 1
    return { spaceId, grade, slot, source: 'stage', count, ready: count >= STAGE_SIZE }
  }
  return { spaceId, grade, slot, source: 'stock', count: addToStock(db, userId, spaceId, grade, 1), ready: false }
}

/** 달성: spend four pieces of the 장소's grade and move on to the next grade (its title is earned). */
export function achieveStage(db, userId, spaceId) {
  return transaction(db, () => {
    const room = getRoomStages(db, userId).find((r) => r.spaceId === spaceId)
    if (!room) throw new Error('space not found')
    if (!room.stage || room.count < STAGE_SIZE) throw new Error('not ready')
    // Pieces past the four stay, as 조합 material.
    const leftover = room.count - STAGE_SIZE
    if (leftover > 0) addToStock(db, userId, spaceId, room.stage, leftover)
    const next = GRADES[GRADES.indexOf(room.stage) + 1] ?? 'DONE'
    db.prepare(
      `INSERT INTO user_room_stage (user_id, space_id, grade, count) VALUES (?, ?, ?, 0)
       ON CONFLICT (user_id, space_id) DO UPDATE SET grade = excluded.grade, count = 0`
    ).run(userId, spaceId, next)
    return { achieved: { spaceId, grade: room.stage }, rooms: getRoomStages(db, userId), stacks: getStacks(db, userId) }
  })
}

/** Weighted FRAGMENT entries of a box (or of every box) whose item belongs to a 장소. */
function dropEntries(db, boxId) {
  return plain(
    db
      .prepare(
        `SELECT e.item_id AS item_id, e.weight AS weight, i.room_type AS room_type, i.grade AS grade
         FROM box_drop_entries e
         JOIN virtual_items i ON i.id = e.item_id
         WHERE (? IS NULL OR e.box_id = ?) AND e.active = 1 AND i.active = 1
           AND e.result_type = 'FRAGMENT' AND i.room_type IS NOT NULL`
      )
      .all(boxId, boxId)
  )
}

/**
 * 조합: ten pieces of one grade become one random piece of the next grade.
 * Without `picks` (자동 넣기) the ten come from stacks of at least four, tallest first;
 * `picks` ([{ spaceId, source, count }]) choose them by hand.
 */
export function combinePieces(db, userId, grade, picks, randomFn = Math.random, nowIso = new Date().toISOString()) {
  const index = GRADES.indexOf(grade)
  if (index < 0 || index === GRADES.length - 1) throw new Error('invalid grade')
  const next = GRADES[index + 1]
  return transaction(db, () => {
    const stacks = getStacks(db, userId).filter((stack) => stack.grade === grade)
    const find = (spaceId, source) => stacks.find((stack) => stack.spaceId === spaceId && stack.source === source)
    let take
    if (picks === undefined) {
      take = []
      let left = COMBINE_COST
      for (const stack of [...stacks].filter((s) => s.count >= AUTO_MIN_STACK).sort((a, b) => b.count - a.count)) {
        if (left === 0) break
        const n = Math.min(left, stack.count)
        take.push({ spaceId: stack.spaceId, source: stack.source, count: n })
        left -= n
      }
      if (left > 0) throw new Error('not enough pieces')
    } else {
      const valid =
        Array.isArray(picks) &&
        picks.every(
          (p) => p && typeof p.spaceId === 'string' && (p.source === 'stage' || p.source === 'stock') && Number.isInteger(p.count) && p.count > 0
        ) &&
        picks.reduce((sum, p) => sum + p.count, 0) === COMBINE_COST
      if (!valid) throw new Error('invalid picks')
      for (const p of picks) {
        const stack = find(p.spaceId, p.source)
        const already = picks.filter((q) => q.spaceId === p.spaceId && q.source === p.source).reduce((sum, q) => sum + q.count, 0)
        if (!stack || already > stack.count) throw new Error('not enough pieces')
      }
      take = picks
    }
    for (const p of take) {
      const table = p.source === 'stage' ? 'user_room_stage' : 'user_piece_stock'
      db.prepare(`UPDATE ${table} SET count = count - ? WHERE user_id = ? AND space_id = ? AND grade = ?`).run(
        p.count,
        userId,
        p.spaceId,
        grade
      )
    }

    const pool = dropEntries(db, null).filter((e) => e.grade === next)
    if (pool.length === 0) throw new Error('nothing to draw')
    const picked = pickWeighted(pool, randomFn)
    const slot = Math.min(STAGE_SIZE - 1, Math.floor(randomFn() * STAGE_SIZE))
    const item = { ...db.prepare('SELECT id, name, grade, fragments_required, room_type FROM virtual_items WHERE id = ?').get(picked.item_id) }
    const piece = addPiece(db, userId, item.room_type, next, slot)
    giveItemFragment(db, userId, item, nowIso)
    return { piece, itemName: item.name, rooms: getRoomStages(db, userId), stacks: getStacks(db, userId) }
  })
}

/** The 아이템 수집함 side of a draw: the item gains a fragment and may complete. */
function giveItemFragment(db, userId, item, nowIso) {
  const status = itemStatus(db, userId, item.id)
  const before = fragmentCount(db, userId, item.id)
  db.prepare(
    `INSERT INTO user_item_fragments (user_id, item_id, count) VALUES (?, ?, 1)
     ON CONFLICT (user_id, item_id) DO UPDATE SET count = count + 1`
  ).run(userId, item.id)
  if (status === 'COMPLETE') return
  const { justCompleted } = applyFragment(before, item.fragments_required)
  if (justCompleted) {
    db.prepare(
      `INSERT INTO user_items (user_id, item_id, status, completed_at) VALUES (?, ?, 'COMPLETE', ?)
       ON CONFLICT (user_id, item_id) DO UPDATE SET status = 'COMPLETE', completed_at = excluded.completed_at`
    ).run(userId, item.id, nowIso)
  } else if (status === 'LOCKED') {
    db.prepare("INSERT INTO user_items (user_id, item_id, status, completed_at) VALUES (?, ?, 'COLLECTING', NULL)").run(
      userId,
      item.id
    )
  }
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

  // Any grade can drop, weighted by the box's FRAGMENT entries (admin-tunable); the
  // item decides the 장소. The slot only picks which puzzle shape is shown.
  const pool = dropEntries(db, boxId)
  if (pool.length === 0) throw new Error('nothing to draw')
  const picked = pickWeighted(pool, randomFn)
  const item = { ...db.prepare('SELECT id, name, grade, fragments_required, room_type FROM virtual_items WHERE id = ?').get(picked.item_id) }
  const slot = Math.min(STAGE_SIZE - 1, Math.floor(randomFn() * STAGE_SIZE))
  const piece = addPiece(db, userId, item.room_type, item.grade, slot)
  giveItemFragment(db, userId, item, nowIso)

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
