import { transaction } from './db.js'

const plain = (rows) => rows.map((row) => ({ ...row }))

export function adminListItems(db) {
  return plain(
    db
      .prepare('SELECT id, name, grade, fragments_required, active FROM virtual_items ORDER BY grade, id')
      .all()
  ).map((row) => ({
    id: row.id,
    name: row.name,
    grade: row.grade,
    fragmentsRequired: row.fragments_required,
    active: row.active === 1,
  }))
}

export function adminUpdateItem(db, id, patch) {
  return transaction(db, () => {
    const existing = db.prepare('SELECT id FROM virtual_items WHERE id = ?').get(id)
    if (!existing) throw new Error('item not found')
    if (patch.name !== undefined) {
      db.prepare('UPDATE virtual_items SET name = ? WHERE id = ?').run(patch.name, id)
    }
    if (patch.fragmentsRequired !== undefined) {
      db.prepare('UPDATE virtual_items SET fragments_required = ? WHERE id = ?').run(
        patch.fragmentsRequired,
        id
      )
    }
    if (patch.active !== undefined) {
      db.prepare('UPDATE virtual_items SET active = ? WHERE id = ?').run(patch.active ? 1 : 0, id)
    }
    return adminListItems(db).find((item) => item.id === id)
  })
}

export function adminListBoxes(db) {
  return plain(db.prepare('SELECT id, name, cost_points, active FROM boxes ORDER BY id').all()).map(
    (row) => ({ id: row.id, name: row.name, costPoints: row.cost_points, active: row.active === 1 })
  )
}

export function adminUpdateBox(db, id, patch) {
  return transaction(db, () => {
    const existing = db.prepare('SELECT id FROM boxes WHERE id = ?').get(id)
    if (!existing) throw new Error('box not found')
    if (patch.name !== undefined) {
      db.prepare('UPDATE boxes SET name = ? WHERE id = ?').run(patch.name, id)
    }
    if (patch.costPoints !== undefined) {
      db.prepare('UPDATE boxes SET cost_points = ? WHERE id = ?').run(patch.costPoints, id)
    }
    if (patch.active !== undefined) {
      db.prepare('UPDATE boxes SET active = ? WHERE id = ?').run(patch.active ? 1 : 0, id)
    }
    return adminListBoxes(db).find((box) => box.id === id)
  })
}

export function adminListDropEntries(db) {
  return plain(
    db
      .prepare(
        `SELECT e.id AS id, e.box_id AS box_id, e.item_id AS item_id, i.name AS item_name,
                e.result_type AS result_type, e.weight AS weight, e.active AS active
         FROM box_drop_entries e
         JOIN virtual_items i ON i.id = e.item_id
         ORDER BY e.box_id, i.grade, i.id, e.result_type`
      )
      .all()
  ).map((row) => ({
    id: row.id,
    boxId: row.box_id,
    itemId: row.item_id,
    itemName: row.item_name,
    resultType: row.result_type,
    weight: row.weight,
    active: row.active === 1,
  }))
}

export function adminUpdateDropEntry(db, id, patch) {
  return transaction(db, () => {
    const existing = db.prepare('SELECT id FROM box_drop_entries WHERE id = ?').get(id)
    if (!existing) throw new Error('drop entry not found')
    if (patch.weight !== undefined) {
      db.prepare('UPDATE box_drop_entries SET weight = ? WHERE id = ?').run(patch.weight, id)
    }
    if (patch.active !== undefined) {
      db.prepare('UPDATE box_drop_entries SET active = ? WHERE id = ?').run(
        patch.active ? 1 : 0,
        id
      )
    }
    return adminListDropEntries(db).find((entry) => entry.id === id)
  })
}
