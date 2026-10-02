import test from 'node:test'
import assert from 'node:assert/strict'
import { openDb } from './db.js'
import { ensureLockerTable, saveLocker } from '../locker.js'
import { claimAttendance } from './itemService.js'
import { getQuests, claimQuest } from './quests.js'

const DEVICE = 'device-quest0001'
const NOW = new Date('2026-10-02T03:00:00.000Z') // 12:00 KST

function dbWithItems(items) {
  const db = openDb(':memory:')
  ensureLockerTable(db)
  saveLocker(db, DEVICE, { items, locations: [], categories: [] }, NOW.toISOString())
  return db
}

const item = (id, extra = {}) => ({ id, name: id, locationId: 'l', categoryId: 'c', createdAt: '2026-09-01', ...extra })
const points = (db) =>
  db.prepare('SELECT COALESCE(SUM(amount), 0) AS n FROM point_history WHERE user_id = ?').get(DEVICE).n
const quest = (db, id) => getQuests(db, DEVICE, NOW).find((q) => q.id === id)

test('progress comes from the synced locker and ignores sample items', () => {
  const db = dbWithItems([item('seed-1'), item('a', { masterItemId: 'm1', recommendation: 'recommend' }), item('b')])
  assert.equal(quest(db, 'record-1').progress, 1)
  assert.equal(quest(db, 'record-5').progress, 2)
  assert.equal(quest(db, 'link-3').progress, 1)
  assert.equal(quest(db, 'rate-3').progress, 1)
})

test('a completed quest pays once, and an incomplete one cannot be claimed', () => {
  const db = dbWithItems([item('a')])
  assert.equal(quest(db, 'record-1').claimable, true)
  assert.deepEqual(claimQuest(db, DEVICE, 'record-1', NOW), { pointsAwarded: 50 })
  assert.equal(points(db), 50)
  assert.equal(quest(db, 'record-1').claimed, true)
  assert.throws(() => claimQuest(db, DEVICE, 'record-1', NOW), /already claimed/)
  assert.throws(() => claimQuest(db, DEVICE, 'record-5', NOW), /not complete/)
  assert.throws(() => claimQuest(db, DEVICE, 'no-such', NOW), /quest not found/)
  assert.equal(points(db), 50)
})

test('daily quests reset on the next KST day', () => {
  const db = dbWithItems([item('a')])
  claimAttendance(db, DEVICE, NOW, () => 0)
  claimQuest(db, DEVICE, 'daily-attend', NOW)
  assert.throws(() => claimQuest(db, DEVICE, 'daily-attend', NOW), /already claimed/)
  const tomorrow = new Date('2026-10-03T03:00:00.000Z')
  assert.equal(getQuests(db, DEVICE, tomorrow).find((q) => q.id === 'daily-attend').claimed, false)
  claimAttendance(db, DEVICE, tomorrow, () => 0)
  assert.doesNotThrow(() => claimQuest(db, DEVICE, 'daily-attend', tomorrow))
})

test('restocks and priced purchases count from purchase history', () => {
  const db = dbWithItems([
    item('a', { purchaseHistory: ['2026-09-20', '2026-10-02'], purchaseDetails: { '2026-10-02': { price: 3000 } } }),
  ])
  assert.equal(quest(db, 'restock-5').progress, 2)
  assert.equal(quest(db, 'price-1').claimable, true)
  assert.equal(quest(db, 'daily-restock').claimable, true)
})
