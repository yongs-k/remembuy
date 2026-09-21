import { describe, it, expect } from 'vitest'
import {
  getCategoryCompletion,
  getLocationCompletion,
  getMissingMasterItems,
  getRankingForCategory,
  getUpcomingNotifications,
  getLocationsRankedByItemCount,
  getCategoriesRankedByItemCount,
  getCompletedPodium,
  getMasterItemCounts,
  getCompletionGain,
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

  const emptyCategory: Category = {
    id: 'cat-empty',
    locationId: 'loc-1',
    name: '빈 카테고리',
    masterItems: [],
  }

  it('ignores empty categories when averaging', () => {
    const items = ['m1', 'm2', 'm3', 'm4'].map((m) =>
      makeItem({ id: `i-${m}`, categoryId: 'cat-1', masterItemId: m })
    )
    expect(getLocationCompletion(items, 'loc-1', [category, emptyCategory])).toBe(100)
  })

  it('returns 0 when the location has only empty categories', () => {
    expect(getLocationCompletion([], 'loc-1', [emptyCategory])).toBe(0)
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

describe('getCompletedPodium', () => {
  const baseItem = (overrides: Partial<Item>): Item => ({
    id: 'x',
    name: '테스트',
    locationId: 'loc-1',
    categoryId: 'cat-1',
    createdAt: '2026-09-16',
    ...overrides,
  })

  it('returns null when no ranks are assigned', () => {
    const items = [baseItem({ id: 'a' }), baseItem({ id: 'b' })]
    expect(getCompletedPodium(items, 'cat-1')).toBeNull()
  })

  it('returns null when only some ranks are assigned', () => {
    const items = [
      baseItem({ id: 'a', podiumRank: 1 }),
      baseItem({ id: 'b', podiumRank: 2 }),
      baseItem({ id: 'c' }),
    ]
    expect(getCompletedPodium(items, 'cat-1')).toBeNull()
  })

  it('returns the three entries sorted by rank when the podium is complete', () => {
    const items = [
      baseItem({ id: 'a', podiumRank: 2 }),
      baseItem({ id: 'b', podiumRank: 1 }),
      baseItem({ id: 'c', podiumRank: 3 }),
      baseItem({ id: 'd', categoryId: 'other-cat', podiumRank: 1 }),
    ]
    const result = getCompletedPodium(items, 'cat-1')
    expect(result).not.toBeNull()
    expect(result?.map((e) => e.rank)).toEqual([1, 2, 3])
    expect(result?.map((e) => e.item.id)).toEqual(['b', 'a', 'c'])
  })
})

describe('getMasterItemCounts', () => {
  const catA: Category = {
    id: 'a',
    locationId: 'L1',
    name: 'A',
    masterItems: [
      { id: 'a1', name: 'a1' },
      { id: 'a2', name: 'a2' },
    ],
  }
  const catB: Category = {
    id: 'b',
    locationId: 'L2',
    name: 'B',
    masterItems: [{ id: 'b1', name: 'b1' }],
  }
  const mk = (id: string, categoryId: string, masterItemId?: string): Item => ({
    id,
    name: id,
    locationId: 'x',
    categoryId,
    masterItemId,
    createdAt: '2026-01-01',
  })

  it('counts owned and total across all categories', () => {
    const items = [mk('i1', 'a', 'a1'), mk('i2', 'b', 'b1')]
    expect(getMasterItemCounts(items, [catA, catB])).toEqual({ owned: 2, total: 3 })
  })

  it('scopes to one location', () => {
    expect(getMasterItemCounts([mk('i1', 'a', 'a1')], [catA, catB], 'L1')).toEqual({
      owned: 1,
      total: 2,
    })
  })

  it('ignores items without a masterItemId', () => {
    expect(getMasterItemCounts([mk('i1', 'a')], [catA], 'L1')).toEqual({ owned: 0, total: 2 })
  })
})

describe('getCompletionGain', () => {
  const catA: Category = {
    id: 'a',
    locationId: 'L1',
    name: 'A',
    masterItems: [
      { id: 'a1', name: 'a1' },
      { id: 'a2', name: 'a2' },
    ],
  }
  const catB: Category = {
    id: 'b',
    locationId: 'L1',
    name: 'B',
    masterItems: [
      { id: 'b1', name: 'b1' },
      { id: 'b2', name: 'b2' },
    ],
  }
  const owned: Item = {
    id: 'i1',
    name: 'i1',
    locationId: 'L1',
    categoryId: 'a',
    masterItemId: 'a1',
    createdAt: '2026-01-01',
  }

  it('raises completion when an unowned master item is linked', () => {
    expect(getCompletionGain([owned], [catA, catB], 'L1', 'a', 'a2')).toEqual({
      before: 25,
      after: 50,
    })
  })

  it('does not change completion without a linked master item', () => {
    expect(getCompletionGain([owned], [catA, catB], 'L1', 'a', '')).toEqual({
      before: 25,
      after: 25,
    })
  })

  it('does not change completion for an already owned master item', () => {
    expect(getCompletionGain([owned], [catA, catB], 'L1', 'a', 'a1')).toEqual({
      before: 25,
      after: 25,
    })
  })

  it('an unchanged edit shows no gain', () => {
    expect(getCompletionGain([owned], [catA, catB], 'L1', 'a', 'a1', 'i1')).toEqual({
      before: 25,
      after: 25,
    })
  })

  it('switching the linked master item in an edit is not a gain', () => {
    expect(getCompletionGain([owned], [catA, catB], 'L1', 'a', 'a2', 'i1')).toEqual({
      before: 25,
      after: 25,
    })
  })
})
