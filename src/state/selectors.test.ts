import { describe, it, expect } from 'vitest'
import {
  getCategoryCompletion,
  getLocationCompletion,
  getMissingMasterItems,
  getRankingForCategory,
  getUpcomingNotifications,
} from './selectors'
import type { Category, Item } from '../types'

const category: Category = {
  id: 'cat-1',
  locationId: 'loc-1',
  name: '테스트 카테고리',
  masterItems: [
    { id: 'm1', name: '샴푸' },
    { id: 'm2', name: '린스' },
    { id: 'm3', name: '트리트먼트' },
    { id: 'm4', name: '에센스' },
  ],
}

const category2: Category = {
  id: 'cat-2',
  locationId: 'loc-1',
  name: '카테고리2',
  masterItems: [
    { id: 'm5', name: 'A' },
    { id: 'm6', name: 'B' },
  ],
}

function makeItem(overrides: Partial<Item>): Item {
  return {
    id: overrides.id ?? 'i1',
    name: overrides.name ?? '상품',
    locationId: overrides.locationId ?? 'loc-1',
    categoryId: overrides.categoryId ?? 'cat-1',
    createdAt: '2026-09-01',
    ...overrides,
  }
}

describe('getCategoryCompletion', () => {
  it('returns 0 when no items match', () => {
    expect(getCategoryCompletion([], category)).toBe(0)
  })

  it('returns percentage of unique master items covered', () => {
    const items = [
      makeItem({ id: 'i1', masterItemId: 'm1' }),
      makeItem({ id: 'i2', masterItemId: 'm2' }),
    ]
    expect(getCategoryCompletion(items, category)).toBe(50)
  })

  it('does not double-count duplicate master item matches', () => {
    const items = [
      makeItem({ id: 'i1', masterItemId: 'm1' }),
      makeItem({ id: 'i2', masterItemId: 'm1' }),
    ]
    expect(getCategoryCompletion(items, category)).toBe(25)
  })

  it('ignores items without a masterItemId', () => {
    const items = [makeItem({ id: 'i1', masterItemId: undefined })]
    expect(getCategoryCompletion(items, category)).toBe(0)
  })
})

describe('getLocationCompletion', () => {
  it('averages completion across the location categories', () => {
    const items = [
      makeItem({ id: 'i1', categoryId: 'cat-1', masterItemId: 'm1' }), // cat-1: 1/4 = 25%
      makeItem({ id: 'i2', categoryId: 'cat-2', masterItemId: 'm5' }), // cat-2: 1/2 = 50%
    ]
    // NOTE: getLocationCompletion needs the full category list to know which
    // categories belong to a location; tested via a small local categories array.
    const completion = getLocationCompletion(items, 'loc-1', [category, category2])
    expect(completion).toBe(38) // (25 + 50) / 2 = 37.5 rounded to 38
  })
})

describe('getMissingMasterItems', () => {
  it('returns master items with no owned match', () => {
    const items = [makeItem({ id: 'i1', masterItemId: 'm1' })]
    const missing = getMissingMasterItems(items, category)
    expect(missing.map((m) => m.id)).toEqual(['m2', 'm3', 'm4'])
  })
})

describe('getRankingForCategory', () => {
  it('sorts rated items by rating descending, unrated last', () => {
    const items = [
      makeItem({ id: 'i1', categoryId: 'cat-1', rating: 3 }),
      makeItem({ id: 'i2', categoryId: 'cat-1', rating: 5 }),
      makeItem({ id: 'i3', categoryId: 'cat-1' }),
      makeItem({ id: 'i4', categoryId: 'other-cat', rating: 4 }),
    ]
    const ranked = getRankingForCategory(items, 'cat-1')
    expect(ranked.map((i) => i.id)).toEqual(['i2', 'i1', 'i3'])
  })
})

describe('getUpcomingNotifications', () => {
  it('returns only items within the threshold, sorted ascending', () => {
    const items = [
      makeItem({ id: 'i1', daysUntilEmpty: 10 }),
      makeItem({ id: 'i2', daysUntilEmpty: 2 }),
      makeItem({ id: 'i3', daysUntilEmpty: 5 }),
      makeItem({ id: 'i4', rating: 5 }),
    ]
    const result = getUpcomingNotifications(items, 7)
    expect(result.map((i) => i.id)).toEqual(['i2', 'i3'])
  })
})
