import test from 'node:test'
import assert from 'node:assert/strict'
import { openDb } from './db.js'
import {
  adminListItems,
  adminUpdateItem,
  adminListBoxes,
  adminUpdateBox,
  adminListDropEntries,
  adminUpdateDropEntry,
} from './adminService.js'

test('adminListItems returns every item including inactive ones', () => {
  const db = openDb(':memory:')
  db.prepare("UPDATE virtual_items SET active = 0 WHERE id = 'item-basin-basic'").run()
  const items = adminListItems(db)
  assert.equal(items.length, 50)
  const basin = items.find((i) => i.id === 'item-basin-basic')
  assert.equal(basin.active, false)
  assert.deepEqual(Object.keys(basin).sort(), ['active', 'fragmentsRequired', 'grade', 'id', 'name'].sort())
})

test('adminUpdateItem applies only the given fields and returns the updated row', () => {
  const db = openDb(':memory:')
  const updated = adminUpdateItem(db, 'item-basin-basic', { name: '새 이름' })
  assert.equal(updated.name, '새 이름')
  assert.equal(updated.fragmentsRequired, 10)
  assert.equal(updated.active, true)

  const updated2 = adminUpdateItem(db, 'item-basin-basic', { fragmentsRequired: 5, active: false })
  assert.equal(updated2.name, '새 이름')
  assert.equal(updated2.fragmentsRequired, 5)
  assert.equal(updated2.active, false)
})

test('adminUpdateItem throws for an unknown id', () => {
  const db = openDb(':memory:')
  assert.throws(() => adminUpdateItem(db, 'no-such-item', { name: 'x' }), /item not found/)
})

test('adminListBoxes returns every box including inactive ones', () => {
  const db = openDb(':memory:')
  db.prepare("UPDATE boxes SET active = 0 WHERE id = 'box-starter'").run()
  const boxes = adminListBoxes(db)
  assert.equal(boxes.length, 1)
  assert.equal(boxes[0].active, false)
})

test('adminUpdateBox applies only the given fields and returns the updated row', () => {
  const db = openDb(':memory:')
  const updated = adminUpdateBox(db, 'box-starter', { costPoints: 700 })
  assert.equal(updated.costPoints, 700)
  assert.equal(updated.name, '시작 상자')
})

test('adminUpdateBox throws for an unknown id', () => {
  const db = openDb(':memory:')
  assert.throws(() => adminUpdateBox(db, 'no-such-box', { costPoints: 1 }), /box not found/)
})

test('adminListDropEntries returns every entry with the item name joined', () => {
  const db = openDb(':memory:')
  const entries = adminListDropEntries(db)
  assert.equal(entries.length, 100)
  const first = entries[0]
  assert.deepEqual(
    Object.keys(first).sort(),
    ['active', 'boxId', 'id', 'itemId', 'itemName', 'resultType', 'weight'].sort()
  )
  assert.ok(entries.every((e) => typeof e.itemName === 'string' && e.itemName.length > 0))
})

test('adminUpdateDropEntry applies only the given fields and returns the updated row', () => {
  const db = openDb(':memory:')
  const [first] = adminListDropEntries(db)
  const updated = adminUpdateDropEntry(db, first.id, { weight: 999 })
  assert.equal(updated.weight, 999)
  assert.equal(updated.active, true)
})

test('adminUpdateDropEntry throws for an unknown id', () => {
  const db = openDb(':memory:')
  assert.throws(() => adminUpdateDropEntry(db, 999999, { weight: 1 }), /drop entry not found/)
})
