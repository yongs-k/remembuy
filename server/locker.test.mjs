import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { ensureLockerTable, getLocker, saveLocker, isLockerState } from './locker.js'

const state = (name) => ({ items: [{ id: 'i1', name }], locations: [], categories: [] })

test('saves and reads a locker per device', () => {
  const db = new DatabaseSync(':memory:')
  ensureLockerTable(db)
  assert.equal(getLocker(db, 'device-aaaa'), null)
  saveLocker(db, 'device-aaaa', state('샴푸'), '2026-10-01T00:00:00.000Z')
  assert.equal(getLocker(db, 'device-aaaa').state.items[0].name, '샴푸')
  assert.equal(getLocker(db, 'device-bbbb'), null)
})

test('a stale write does not overwrite newer data', () => {
  const db = new DatabaseSync(':memory:')
  ensureLockerTable(db)
  saveLocker(db, 'device-aaaa', state('new'), '2026-10-01T10:00:00.000Z')
  const result = saveLocker(db, 'device-aaaa', state('old'), '2026-10-01T09:00:00.000Z')
  assert.equal(result.state.items[0].name, 'new')
  assert.equal(result.updatedAt, '2026-10-01T10:00:00.000Z')
})

test('isLockerState requires the three arrays', () => {
  assert.equal(isLockerState(state('x')), true)
  assert.equal(isLockerState({ items: [] }), false)
  assert.equal(isLockerState(null), false)
})
