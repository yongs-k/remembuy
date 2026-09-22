import test from 'node:test'
import assert from 'node:assert/strict'
import { openDb } from './db.js'
import { claimSlots, getState, getHistory, getCatalog } from './service.js'

const slot = (id) => ({ id, name: id })
const CATALOG = {
  spaces: [
    {
      id: 'sp1',
      name: '공간1',
      groups: [
        { id: 'g1', name: '그룹1', slots: ['a1', 'a2', 'a3', 'a4'].map(slot) },
        { id: 'g2', name: '그룹2', slots: ['b1', 'b2', 'b3', 'b4'].map(slot) },
      ],
    },
    { id: 'sp2', name: '공간2', groups: [{ id: 'g3', name: '그룹3', slots: ['c1', 'c2'].map(slot) }] },
    { id: 'sp3', name: '빈 공간', groups: [] },
  ],
}
const DEVICE = 'device-aaaa1111'
const NOW = new Date('2026-09-22T00:00:00.000Z')
const fresh = () => openDb(':memory:', { catalog: CATALOG })
const count = (db, table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n
const types = (history) => history.map((h) => h.type)
const sp1 = (state) => state.spaces.find((s) => s.spaceId === 'sp1')

test('claiming a slot pays no points', () => {
  const db = fresh()
  const result = claimSlots(db, DEVICE, ['a1'], NOW)
  assert.deepEqual(result.newSlots, ['a1'])
  assert.deepEqual(result.ignored, [])
  assert.equal(result.pointsAwarded, 0)
  assert.deepEqual(result.history, [])
  assert.equal(result.state.points, 0)
  assert.equal(sp1(result.state).claimed, 1)
  assert.equal(sp1(result.state).total, 8)
  assert.equal(sp1(result.state).percent, 12)
  assert.deepEqual(result.state.titles, [])
})

test('claiming the same slot again (or twice in one request) is a no-op', () => {
  const db = fresh()
  const first = claimSlots(db, DEVICE, ['a1', 'a1'], NOW)
  assert.deepEqual(first.newSlots, ['a1'])
  const second = claimSlots(db, DEVICE, ['a1'], NOW)
  assert.deepEqual(second.newSlots, [])
  assert.equal(second.pointsAwarded, 0)
  assert.equal(count(db, 'slot_claims'), 1)
})

test('reaching 25% pays the SPROUT title reward once', () => {
  const db = fresh()
  const result = claimSlots(db, DEVICE, ['a1', 'a2'], NOW)
  assert.deepEqual(types(result.history), ['TITLE_REWARD'])
  assert.equal(result.history[0].amount, 200)
  assert.equal(result.history[0].sourceId, 'sp1:SPROUT')
  assert.equal(result.pointsAwarded, 200)
  assert.equal(result.state.points, 200)
  assert.deepEqual(
    result.state.titles.map((t) => ({ spaceId: t.spaceId, tierCode: t.tierCode })),
    [{ spaceId: 'sp1', tierCode: 'SPROUT' }]
  )
  assert.equal(sp1(result.state).highestTier, 'SPROUT')
  assert.equal(sp1(result.state).nextTier, 'MANAGER')
  assert.equal(sp1(result.state).bonusRateBp, 0)
  const again = claimSlots(db, DEVICE, ['a3'], NOW)
  assert.equal(again.pointsAwarded, 0)
})

test('a group completion and a multi-tier jump pay every reward', () => {
  const db = fresh()
  const result = claimSlots(db, DEVICE, ['a1', 'a2', 'a3', 'a4'], NOW)
  assert.deepEqual(types(result.history), ['COLLECTION_COMPLETE', 'TITLE_REWARD', 'TITLE_REWARD'])
  assert.deepEqual(
    result.history.map((h) => [h.amount, h.sourceId]),
    [
      [500, 'g1'],
      [200, 'sp1:SPROUT'],
      [500, 'sp1:MANAGER'],
    ]
  )
  assert.equal(result.pointsAwarded, 1200)
  assert.equal(result.state.points, 1200)
  const progress = sp1(result.state)
  assert.equal(progress.percent, 50)
  assert.equal(progress.highestTier, 'MANAGER')
  assert.equal(progress.nextTier, 'EXPERT')
  assert.equal(progress.percentToNext, 25)
  assert.equal(progress.bonusRateBp, 300)
  assert.equal(count(db, 'group_completions'), 1)
})

test('the bonus uses the title held before the action and never applies to title rewards', () => {
  const db = fresh()
  claimSlots(db, DEVICE, ['a1', 'a2', 'a3', 'a4'], NOW)
  const result = claimSlots(db, DEVICE, ['b1', 'b2', 'b3', 'b4'], NOW)
  assert.deepEqual(types(result.history), [
    'COLLECTION_COMPLETE',
    'TITLE_BONUS',
    'TITLE_REWARD',
    'TITLE_REWARD',
  ])
  const [complete, bonus, expert, master] = result.history
  assert.equal(complete.amount, 500)
  assert.equal(complete.sourceId, 'g2')
  assert.equal(bonus.amount, 15) // MANAGER 3% of 500, not MASTER 12% (which would be 60)
  assert.equal(bonus.sourceId, String(complete.id))
  assert.deepEqual([expert.amount, expert.sourceId], [1000, 'sp1:EXPERT'])
  assert.deepEqual([master.amount, master.sourceId], [2000, 'sp1:MASTER'])
  assert.equal(result.pointsAwarded, 3515)
  assert.equal(result.state.points, 1200 + 3515)
  assert.equal(sp1(result.state).highestTier, 'MASTER')
  assert.equal(sp1(result.state).nextTier, null)
})

test('an expired POINT_RATE benefit gives no bonus', () => {
  const db = fresh()
  claimSlots(db, DEVICE, ['a1', 'a2', 'a3', 'a4'], NOW)
  db.prepare("UPDATE title_benefits SET end_at = '2026-01-01T00:00:00.000Z' WHERE tier_code = 'MANAGER'").run()
  const result = claimSlots(db, DEVICE, ['b1', 'b2', 'b3', 'b4'], NOW)
  assert.equal(types(result.history).includes('TITLE_BONUS'), false)
})

test('unknown and deactivated slots are ignored and leave the denominators', () => {
  const db = fresh()
  db.prepare("UPDATE slots SET active = 0 WHERE id = 'a4'").run()
  const result = claimSlots(db, DEVICE, ['zzz', 'a4', 'a1', 'a2', 'a3'], NOW)
  assert.deepEqual(result.ignored, ['zzz', 'a4'])
  assert.deepEqual(result.newSlots, ['a1', 'a2', 'a3'])
  assert.equal(sp1(result.state).total, 7)
  assert.equal(sp1(result.state).claimed, 3)
  assert.equal(types(result.history).includes('COLLECTION_COMPLETE'), true) // g1 now has 3 active slots
})

test('getState for an unknown user is empty and creates nothing', () => {
  const db = fresh()
  const state = getState(db, 'device-unknown1', NOW)
  assert.equal(state.points, 0)
  assert.deepEqual(state.titles, [])
  assert.equal(state.spaces.length, 3)
  const empty = state.spaces.find((s) => s.spaceId === 'sp3')
  assert.deepEqual(
    { ...empty },
    {
      spaceId: 'sp3',
      claimed: 0,
      total: 0,
      percent: 0,
      highestTier: null,
      nextTier: 'SPROUT',
      percentToNext: 25,
      bonusRateBp: 0,
    }
  )
  assert.equal(count(db, 'users'), 0)
})

test('point history is newest-first and paginates', () => {
  const db = fresh()
  claimSlots(db, DEVICE, ['a1', 'a2', 'a3', 'a4'], NOW)
  claimSlots(db, DEVICE, ['b1', 'b2', 'b3', 'b4'], NOW) // 3 + 4 = 7 rows
  const page1 = getHistory(db, DEVICE, { limit: 3 })
  assert.deepEqual(page1.items.map((h) => h.id), [7, 6, 5])
  assert.equal(page1.nextBefore, 5)
  const page2 = getHistory(db, DEVICE, { limit: 3, before: page1.nextBefore })
  assert.deepEqual(page2.items.map((h) => h.id), [4, 3, 2])
  assert.equal(page2.nextBefore, 2)
  const page3 = getHistory(db, DEVICE, { limit: 3, before: page2.nextBefore })
  assert.deepEqual(page3.items.map((h) => h.id), [1])
  assert.equal(page3.nextBefore, null)
  assert.deepEqual(getHistory(db, 'device-unknown1'), { items: [], nextBefore: null })
})

test('a failing claim rolls everything back', () => {
  const db = fresh()
  db.exec('DROP TABLE user_titles')
  assert.throws(() => claimSlots(db, DEVICE, ['a1', 'a2'], NOW))
  assert.equal(count(db, 'slot_claims'), 0)
  assert.equal(count(db, 'users'), 0)
  assert.equal(count(db, 'point_history'), 0)
})

test('getCatalog returns active entries and the title tiers', () => {
  const db = fresh()
  db.prepare("UPDATE slots SET active = 0 WHERE id = 'a4'").run()
  const catalog = getCatalog(db)
  assert.deepEqual(catalog.spaces.map((s) => s.id), ['sp1', 'sp2', 'sp3'])
  const g1 = catalog.spaces[0].groups[0]
  assert.deepEqual(g1.slots.map((s) => s.id), ['a1', 'a2', 'a3'])
  assert.deepEqual(catalog.spaces[2].groups, [])
  assert.deepEqual(
    catalog.titleTiers.map((t) => ({ ...t })),
    [
      { code: 'SPROUT', name: '새싹', minPercent: 25, colorToken: 'gray', rewardPoints: 200 },
      { code: 'MANAGER', name: '관리자', minPercent: 50, colorToken: 'green', rewardPoints: 500 },
      { code: 'EXPERT', name: '전문가', minPercent: 75, colorToken: 'purple', rewardPoints: 1000 },
      { code: 'MASTER', name: '마스터', minPercent: 100, colorToken: 'red', rewardPoints: 2000 },
    ]
  )
})
