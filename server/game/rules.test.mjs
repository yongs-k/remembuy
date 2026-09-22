import test from 'node:test'
import assert from 'node:assert/strict'
import {
  percentOf,
  tiersReached,
  highestTier,
  nextTier,
  bonusPoints,
  benefitActive,
  pointRateBp,
} from './rules.js'

const TIERS = [
  { code: 'SPROUT', min_percent: 25, sort: 1 },
  { code: 'MANAGER', min_percent: 50, sort: 2 },
  { code: 'EXPERT', min_percent: 75, sort: 3 },
  { code: 'MASTER', min_percent: 100, sort: 4 },
]
const codes = (tiers) => tiers.map((t) => t.code)

test('percentOf floors and guards an empty space', () => {
  assert.equal(percentOf(2, 8), 25)
  assert.equal(percentOf(1, 3), 33)
  assert.equal(percentOf(3, 3), 100)
  assert.equal(percentOf(0, 8), 0)
  assert.equal(percentOf(5, 0), 0)
})

test('tiersReached uses exact ratios and includes every lower tier', () => {
  assert.deepEqual(codes(tiersReached(0, 8, TIERS)), [])
  assert.deepEqual(codes(tiersReached(1, 8, TIERS)), [])
  assert.deepEqual(codes(tiersReached(2, 8, TIERS)), ['SPROUT'])
  assert.deepEqual(codes(tiersReached(3, 8, TIERS)), ['SPROUT'])
  assert.deepEqual(codes(tiersReached(4, 8, TIERS)), ['SPROUT', 'MANAGER'])
  assert.deepEqual(codes(tiersReached(7, 8, TIERS)), ['SPROUT', 'MANAGER', 'EXPERT'])
  assert.deepEqual(codes(tiersReached(8, 8, TIERS)), ['SPROUT', 'MANAGER', 'EXPERT', 'MASTER'])
  assert.deepEqual(codes(tiersReached(1, 3, TIERS)), ['SPROUT'])
  assert.deepEqual(codes(tiersReached(5, 0, TIERS)), [])
})

test('highestTier and nextTier', () => {
  assert.equal(highestTier([]), null)
  assert.equal(highestTier([TIERS[1], TIERS[0]]).code, 'MANAGER')
  assert.equal(nextTier([], TIERS).code, 'SPROUT')
  assert.equal(nextTier(['SPROUT', 'MANAGER'], TIERS).code, 'EXPERT')
  assert.equal(nextTier(['SPROUT', 'MANAGER', 'EXPERT', 'MASTER'], TIERS), null)
})

test('bonusPoints floors basis-point bonuses', () => {
  assert.equal(bonusPoints(500, 300), 15)
  assert.equal(bonusPoints(1000, 700), 70)
  assert.equal(bonusPoints(100, 300), 3)
  assert.equal(bonusPoints(10, 300), 0)
  assert.equal(bonusPoints(500, 0), 0)
})

test('benefit windows and point rate lookup', () => {
  const now = new Date('2026-09-22T00:00:00.000Z')
  const open = { tier_code: 'MANAGER', type: 'POINT_RATE', value: 300, start_at: null, end_at: null }
  const expired = { tier_code: 'MANAGER', type: 'POINT_RATE', value: 500, start_at: null, end_at: '2026-01-01T00:00:00.000Z' }
  const future = { tier_code: 'MANAGER', type: 'POINT_RATE', value: 900, start_at: '2027-01-01T00:00:00.000Z', end_at: null }
  const coupon = { tier_code: 'MANAGER', type: 'COUPON', value: 100, start_at: null, end_at: null }
  const other = { tier_code: 'EXPERT', type: 'POINT_RATE', value: 700, start_at: null, end_at: null }
  assert.equal(benefitActive(open, now), true)
  assert.equal(benefitActive(expired, now), false)
  assert.equal(benefitActive(future, now), false)
  const all = [open, expired, future, coupon, other]
  assert.equal(pointRateBp(all, 'MANAGER', now), 300)
  assert.equal(pointRateBp(all, 'EXPERT', now), 700)
  assert.equal(pointRateBp(all, null, now), 0)
  assert.equal(pointRateBp(all, 'MASTER', now), 0)
})
