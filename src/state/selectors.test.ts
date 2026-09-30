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
  getRemainingDays,
  formatDday,
  parseRestockCycleDays,
  getRestockDueDays,
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

describe('getRemainingDays', () => {
  it('returns undefined when the item has no daysUntilEmpty', () => {
    const item = makeItem({ id: 'i1' })
    expect(getRemainingDays(item, '2026-09-05')).toBeUndefined()
  })

  it('returns the stored value unchanged when today equals createdAt', () => {
    const item = makeItem({ id: 'i1', daysUntilEmpty: 7, createdAt: '2026-09-01' })
    expect(getRemainingDays(item, '2026-09-01')).toBe(7)
  })

  it('subtracts elapsed days from the stored value', () => {
    const item = makeItem({ id: 'i1', daysUntilEmpty: 7, createdAt: '2026-09-01' })
    expect(getRemainingDays(item, '2026-09-04')).toBe(4)
  })

  it('returns a negative number once the estimate has passed', () => {
    const item = makeItem({ id: 'i1', daysUntilEmpty: 7, createdAt: '2026-09-01' })
    expect(getRemainingDays(item, '2026-09-11')).toBe(-3)
  })

  it('restarts the countdown from restockedAt after a repurchase', () => {
    const item = makeItem({ id: 'i1', daysUntilEmpty: 7, createdAt: '2026-09-01', restockedAt: '2026-09-11' })
    expect(getRemainingDays(item, '2026-09-11')).toBe(7)
    expect(getRemainingDays(item, '2026-09-14')).toBe(4)
  })
})

describe('formatDday', () => {
  it('formats zero and positive numbers as D-N', () => {
    expect(formatDday(0)).toBe('D-0')
    expect(formatDday(7)).toBe('D-7')
  })

  it('formats negative numbers as D+N (absolute value)', () => {
    expect(formatDday(-3)).toBe('D+3')
  })
})

describe('parseRestockCycleDays', () => {
  it('parses each of the three preset strings', () => {
    expect(parseRestockCycleDays('약 45일마다')).toBe(45)
    expect(parseRestockCycleDays('약 60일마다')).toBe(60)
    expect(parseRestockCycleDays('약 90일마다')).toBe(90)
  })

  it('parses free-text cycles in days, weeks, months and years', () => {
    expect(parseRestockCycleDays('약 2개월마다')).toBe(60)
    expect(parseRestockCycleDays('약 1.5개월마다')).toBe(45)
    expect(parseRestockCycleDays('약 3주마다')).toBe(21)
    expect(parseRestockCycleDays('두 달, 약 2달마다')).toBe(60)
    expect(parseRestockCycleDays('1년에 한 번')).toBe(365)
  })

  it('returns undefined for text without a number and unit, or a zero cycle', () => {
    expect(parseRestockCycleDays('가끔')).toBeUndefined()
    expect(parseRestockCycleDays('0일마다')).toBeUndefined()
  })

  it('returns undefined for null and undefined', () => {
    expect(parseRestockCycleDays(null)).toBeUndefined()
    expect(parseRestockCycleDays(undefined)).toBeUndefined()
  })
})

describe('getRestockDueDays', () => {
  it('returns undefined when restockCycle cannot be parsed', () => {
    const item = makeItem({ id: 'i1', restockCycle: '가끔' })
    expect(getRestockDueDays(item, '2026-09-05')).toBeUndefined()
  })

  it('returns undefined when restockCycle is unset', () => {
    const item = makeItem({ id: 'i1' })
    expect(getRestockDueDays(item, '2026-09-05')).toBeUndefined()
  })

  it('counts down from createdAt when restockedAt is unset', () => {
    const item = makeItem({ id: 'i1', restockCycle: '약 45일마다', createdAt: '2026-09-01' })
    expect(getRestockDueDays(item, '2026-09-01')).toBe(45)
    expect(getRestockDueDays(item, '2026-09-11')).toBe(35)
  })

  it('counts down from restockedAt when set, ignoring createdAt', () => {
    const item = makeItem({
      id: 'i1',
      restockCycle: '약 45일마다',
      createdAt: '2026-01-01',
      restockedAt: '2026-09-01',
    })
    expect(getRestockDueDays(item, '2026-09-11')).toBe(35)
  })

  it('returns a negative number once the cycle has passed', () => {
    const item = makeItem({ id: 'i1', restockCycle: '약 45일마다', createdAt: '2026-09-01' })
    expect(getRestockDueDays(item, '2026-10-20')).toBe(-4)
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
    const result = getUpcomingNotifications(items, 7, '2026-09-01')
    expect(result.map((i) => i.id)).toEqual(['i2', 'i3'])
  })

  it('includes an item whose stored value is above the threshold but whose live value has dropped into it', () => {
    const items = [makeItem({ id: 'i1', daysUntilEmpty: 10, createdAt: '2026-09-01' })]
    // 5 days have passed since createdAt, so the live remaining value is
    // 10 - 5 = 5, which is within a threshold of 7 even though the
    // stored 10 is not.
    const result = getUpcomingNotifications(items, 7, '2026-09-06')
    expect(result.map((i) => i.id)).toEqual(['i1'])
  })

  it('includes an item whose restock cycle is due, alongside daysUntilEmpty-based items', () => {
    const items = [
      makeItem({ id: 'i1', daysUntilEmpty: 10, createdAt: '2026-09-01' }),
      makeItem({ id: 'i2', restockCycle: '약 45일마다', createdAt: '2026-08-01' }),
    ]
    // i1's live remaining is 10 - 0 = 10 (outside threshold 7).
    // i2's restock due is 45 - 31 = 14 (outside threshold 7).
    const outside = getUpcomingNotifications(items, 7, '2026-09-01')
    expect(outside.map((i) => i.id)).toEqual([])

    // Move forward so i2's restock cycle (45 days from 2026-08-01) is within 7 days.
    // i1's remaining becomes 10 - 13 = -3 (also within threshold).
    const within = getUpcomingNotifications(items, 7, '2026-09-14')
    expect(within.map((i) => i.id)).toEqual(['i1', 'i2'])
  })

  it('uses whichever signal is more urgent when both are present', () => {
    const item = makeItem({
      id: 'i1',
      daysUntilEmpty: 3,
      restockCycle: '약 90일마다',
      createdAt: '2026-09-01',
    })
    // daysUntilEmpty-based remaining: 3 - 0 = 3 (within threshold).
    // restock-based remaining: 90 - 0 = 90 (outside threshold).
    // The item should surface because the more urgent signal wins.
    const result = getUpcomingNotifications([item], 7, '2026-09-01')
    expect(result.map((i) => i.id)).toEqual(['i1'])
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
