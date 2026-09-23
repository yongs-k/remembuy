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
