import test from 'node:test'
import assert from 'node:assert/strict'
import { pickWeighted, applyFragment } from './itemRules.js'

test('pickWeighted picks by cumulative weight', () => {
  const entries = [
    { id: 'a', weight: 1 },
    { id: 'b', weight: 3 },
  ]
  assert.equal(pickWeighted(entries, () => 0).id, 'a')
  assert.equal(pickWeighted(entries, () => 0.24).id, 'a') // 0.24*4=0.96 < 1
  assert.equal(pickWeighted(entries, () => 0.26).id, 'b') // 0.26*4=1.04 >= 1
  assert.equal(pickWeighted(entries, () => 0.999999).id, 'b')
})

test('pickWeighted rejects empty or all-zero-weight lists', () => {
  assert.throws(() => pickWeighted([]), /no entries/)
  assert.throws(
    () =>
      pickWeighted([
        { id: 'a', weight: 0 },
        { id: 'b', weight: 0 },
      ]),
    /total weight is zero/
  )
})

test('applyFragment counts up and reports completion exactly once', () => {
  assert.deepEqual(applyFragment(0, 3), { newCount: 1, justCompleted: false })
  assert.deepEqual(applyFragment(1, 3), { newCount: 2, justCompleted: false })
  assert.deepEqual(applyFragment(2, 3), { newCount: 3, justCompleted: true })
  // already past the requirement (e.g. fragmentsRequired was lowered later): never re-flags completion
  assert.deepEqual(applyFragment(3, 3), { newCount: 4, justCompleted: false })
  assert.deepEqual(applyFragment(5, 2), { newCount: 6, justCompleted: false })
})
