import { describe, it, expect } from 'vitest'
import {
  getCategoryCompletion,
  getLocationCompletion,
  getMissingMasterItems,
  getRankingForCategory,
  getUpcomingNotifications,
  getLocationsRankedByItemCount,
  getCategoriesRankedByItemCount,
} from './selectors'
import type { Category, Item, Location } from '../types'

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
      makeItem({ id: 'i1', categoryId: 'cat-1', masterItemId: 'm1' }),
      makeItem({ id: 'i2', categoryId: 'cat-2', masterItemId: 'm5' }),
    ]
    const completion = getLocationCompletion(items, 'loc-1', [category, category2])
    expect(completion).toBe(38)
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
  it('sorts recommend first, then notRecommend, then unrated', () => {
    const items = [
      makeItem({ id: 'i1', categoryId: 'cat-1', recommendation: 'notRecommend' }),
      makeItem({ id: 'i2', categoryId: 'cat-1', recommendation: 'recommend' }),
      makeItem({ id: 'i3', categoryId: 'cat-1' }),
      makeItem({ id: 'i4', categoryId: 'other-cat', recommendation: 'recommend' }),
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
      makeItem({ id: 'i4', recommendation: 'recommend' }),
    ]
    const result = getUpcomingNotifications(items, 7)
    expect(result.map((i) => i.id)).toEqual(['i2', 'i3'])
  })
})

describe('getLocationsRankedByItemCount', () => {
  it('sorts locations by item count descending', () => {
    const locA: Location = { id: 'loc-a', name: 'A', colorToken: 'a' }
    const locB: Location = { id: 'loc-b', name: 'B', colorToken: 'b' }
    const items = [
      makeItem({ id: 'i1', locationId: 'loc-a' }),
      makeItem({ id: 'i2', locationId: 'loc-b' }),
      makeItem({ id: 'i3', locationId: 'loc-b' }),
    ]
    const ranked = getLocationsRankedByItemCount(items, [locA, locB])
    expect(ranked.map((r) => r.location.id)).toEqual(['loc-b', 'loc-a'])
    expect(ranked.map((r) => r.itemCount)).toEqual([2, 1])
  })

  it('includes locations with zero items at the end', () => {
    const locA: Location = { id: 'loc-a', name: 'A', colorToken: 'a' }
    const locB: Location = { id: 'loc-b', name: 'B', colorToken: 'b' }
    const items = [makeItem({ id: 'i1', locationId: 'loc-a' })]
    const ranked = getLocationsRankedByItemCount(items, [locA, locB])
    expect(ranked.map((r) => r.location.id)).toEqual(['loc-a', 'loc-b'])
    expect(ranked.map((r) => r.itemCount)).toEqual([1, 0])
  })
})

describe('getCategoriesRankedByItemCount', () => {
  it('sorts a location categories by item count descending', () => {
    const items = [
      makeItem({ id: 'i1', categoryId: 'cat-1' }),
      makeItem({ id: 'i2', categoryId: 'cat-2' }),
      makeItem({ id: 'i3', categoryId: 'cat-2' }),
    ]
    const ranked = getCategoriesRankedByItemCount(items, [category, category2], 'loc-1')
    expect(ranked.map((r) => r.category.id)).toEqual(['cat-2', 'cat-1'])
    expect(ranked.map((r) => r.itemCount)).toEqual([2, 1])
  })

  it('excludes categories belonging to a different location', () => {
    const otherCategory: Category = {
      id: 'cat-3',
      locationId: 'loc-2',
      name: '다른 장소 카테고리',
      masterItems: [],
    }
    const items = [makeItem({ id: 'i1', categoryId: 'cat-3' })]
    const ranked = getCategoriesRankedByItemCount(
      items,
      [category, category2, otherCategory],
      'loc-1'
    )
    expect(ranked.map((r) => r.category.id)).toEqual(['cat-1', 'cat-2'])
  })
})
