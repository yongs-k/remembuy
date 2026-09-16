import test from 'node:test'
import assert from 'node:assert/strict'
import { aggregateRanking } from './podium.js'

test('aggregateRanking scores rank 1/2/3 as 3/2/1 points and sorts by score descending', () => {
  const submissions = [
    {
      deviceId: 'a',
      categoryId: 'cat-1',
      items: [
        { rank: 1, masterItemId: 'm1', name: 'A' },
        { rank: 2, masterItemId: 'm2', name: 'B' },
        { rank: 3, masterItemId: 'm3', name: 'C' },
      ],
    },
    {
      deviceId: 'b',
      categoryId: 'cat-1',
      items: [
        { rank: 1, masterItemId: 'm2', name: 'B' },
        { rank: 2, masterItemId: 'm1', name: 'A' },
        { rank: 3, masterItemId: 'm3', name: 'C' },
      ],
    },
  ]
  const ranking = aggregateRanking(submissions, 'cat-1')
  assert.equal(ranking.length, 3)
  // A: 3+2=5, B: 2+3=5, C: 1+1=2
  const byId = Object.fromEntries(ranking.map((r) => [r.masterItemId, r.score]))
  assert.equal(byId.m1, 5)
  assert.equal(byId.m2, 5)
  assert.equal(byId.m3, 2)
  assert.equal(ranking[2].masterItemId, 'm3')
})

test('aggregateRanking groups items without masterItemId by normalized name', () => {
  const submissions = [
    { deviceId: 'a', categoryId: 'cat-2', items: [{ rank: 1, masterItemId: null, name: 'Custom Item' }] },
    { deviceId: 'b', categoryId: 'cat-2', items: [{ rank: 1, masterItemId: null, name: 'custom item' }] },
  ]
  const ranking = aggregateRanking(submissions, 'cat-2')
  assert.equal(ranking.length, 1)
  assert.equal(ranking[0].score, 6)
  assert.equal(ranking[0].voters, 2)
})

test('aggregateRanking ignores submissions for other categories', () => {
  const submissions = [
    { deviceId: 'a', categoryId: 'other', items: [{ rank: 1, masterItemId: 'm1', name: 'A' }] },
  ]
  const ranking = aggregateRanking(submissions, 'cat-3')
  assert.equal(ranking.length, 0)
})

test('aggregateRanking returns at most 3 entries even with more distinct items', () => {
  const submissions = [
    {
      deviceId: 'a',
      categoryId: 'cat-4',
      items: [
        { rank: 1, masterItemId: 'm1', name: 'A' },
        { rank: 2, masterItemId: 'm2', name: 'B' },
        { rank: 3, masterItemId: 'm3', name: 'C' },
      ],
    },
    {
      deviceId: 'b',
      categoryId: 'cat-4',
      items: [
        { rank: 1, masterItemId: 'm4', name: 'D' },
        { rank: 2, masterItemId: 'm5', name: 'E' },
        { rank: 3, masterItemId: 'm6', name: 'F' },
      ],
    },
  ]
  const ranking = aggregateRanking(submissions, 'cat-4')
  assert.equal(ranking.length, 3)
})
