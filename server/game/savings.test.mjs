import test from 'node:test'
import assert from 'node:assert/strict'
import { openDb } from './db.js'
import { ensureLockerTable, saveLocker } from '../locker.js'
import { findSavings, claimSavings } from './savings.js'

const DEVICE = 'device-aaaa1111'
const NOW = new Date('2026-10-06T00:00:00.000Z')

const item = (extra) => ({ id: 'i1', name: '세제', createdAt: '2026-09-01', ...extra })

test('a cheaper repurchase saves the difference from the purchase just before it', () => {
  const savings = findSavings([
    item({
      purchaseHistory: ['2026-09-20', '2026-10-05'],
      purchaseDetails: {
        '2026-09-01': { price: 9000 },
        '2026-09-20': { price: 7500 },
        '2026-10-05': { price: 8000 },
      },
    }),
  ])
  assert.deepEqual(savings, [{ itemId: 'i1', name: '세제', date: '2026-09-20', from: 9000, to: 7500, saved: 1500 }])
})

test('no saving without a real repurchase, a price before it, or for sample items', () => {
  assert.deepEqual(findSavings([item({ purchaseDetails: { '2026-09-01': { price: 9000 }, '2026-09-20': { price: 7000 } } })]), [])
  assert.deepEqual(findSavings([item({ purchaseHistory: ['2026-09-20'], purchaseDetails: { '2026-09-20': { price: 7000 } } })]), [])
  assert.deepEqual(
    findSavings([
      item({ id: 'seed-1', purchaseHistory: ['2026-09-20'], purchaseDetails: { '2026-09-01': { price: 9000 }, '2026-09-20': { price: 7000 } } }),
    ]),
    []
  )
})

test('claiming pays each saving once as SAVINGS_REWARD points', () => {
  const db = openDb(':memory:')
  ensureLockerTable(db)
  saveLocker(
    db,
    DEVICE,
    {
      items: [
        item({
          purchaseHistory: ['2026-09-20'],
          purchaseDetails: { '2026-09-01': { price: 9000 }, '2026-09-20': { price: 7600 } },
        }),
      ],
      locations: [],
      categories: [],
    },
    NOW.toISOString()
  )
  const first = claimSavings(db, DEVICE, NOW)
  assert.equal(first.pointsAwarded, 1400)
  assert.equal(first.paid.length, 1)
  assert.equal(claimSavings(db, DEVICE, NOW).pointsAwarded, 0)
  const row = db.prepare("SELECT SUM(amount) AS n FROM point_history WHERE type = 'SAVINGS_REWARD'").get()
  assert.equal(row.n, 1400)
})
