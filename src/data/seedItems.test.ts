import { describe, it, expect } from 'vitest'
import { LOCATIONS, CATEGORIES } from './locations'
import { SEED_ITEMS, withFreshSeedDates } from './seedItems'
import { getSoonestRemaining } from '../state/selectors'

describe('seed items', () => {
  it('every seed item references a real location and category', () => {
    const locationIds = new Set(LOCATIONS.map((l) => l.id))
    const categoryIds = new Set(CATEGORIES.map((c) => c.id))
    for (const item of SEED_ITEMS) {
      expect(locationIds.has(item.locationId)).toBe(true)
      expect(categoryIds.has(item.categoryId)).toBe(true)
    }
  })

  it('never sets both recommendation and daysUntilEmpty', () => {
    for (const item of SEED_ITEMS) {
      const hasBoth = item.recommendation !== undefined && item.daysUntilEmpty !== undefined
      expect(hasBoth).toBe(false)
    }
  })

  it('recommendation is only ever "recommend" or "notRecommend" when set', () => {
    for (const item of SEED_ITEMS) {
      if (item.recommendation !== undefined) {
        expect(['recommend', 'notRecommend']).toContain(item.recommendation)
      }
    }
  })

  it('includes at least one notRecommend item for testing variety', () => {
    expect(SEED_ITEMS.some((i) => i.recommendation === 'notRecommend')).toBe(true)
  })

  it('every referenced masterItemId exists in its category', () => {
    const categoryById = new Map(CATEGORIES.map((c) => [c.id, c]))
    for (const item of SEED_ITEMS) {
      if (!item.masterItemId) continue
      const category = categoryById.get(item.categoryId)!
      const found = category.masterItems.some((m) => m.id === item.masterItemId)
      expect(found).toBe(true)
    }
  })

  it('covers every location with at least one item', () => {
    const coveredLocations = new Set(SEED_ITEMS.map((i) => i.locationId))
    for (const location of LOCATIONS) {
      expect(coveredLocations.has(location.id)).toBe(true)
    }
  })

  it('has unique item ids', () => {
    const ids = SEED_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('starts with only a few items due soon and none overdue', () => {
    const remaining = SEED_ITEMS.map((i) => getSoonestRemaining(i)).filter((d): d is number => d !== undefined)
    expect(remaining.every((d) => d >= 0)).toBe(true)
    const dueSoon = remaining.filter((d) => d <= 7).length
    expect(dueSoon).toBeGreaterThan(0)
    expect(dueSoon).toBeLessThanOrEqual(5)
  })
})

describe('withFreshSeedDates', () => {
  it('re-anchors seed dates but keeps user edits and non-seed items', () => {
    const seed = SEED_ITEMS[0]
    const stale = { ...seed, name: '내가 바꾼 이름', createdAt: '2020-01-01' }
    const mine = { ...seed, id: 'item-1', createdAt: '2020-01-01' }
    const [fresh, untouched] = withFreshSeedDates([stale, mine])
    expect(fresh.createdAt).toBe(seed.createdAt)
    expect(fresh.name).toBe('내가 바꾼 이름')
    expect(untouched.createdAt).toBe('2020-01-01')
  })
})
