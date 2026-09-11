import { describe, it, expect } from 'vitest'
import { LOCATIONS, CATEGORIES } from './locations'
import { SEED_ITEMS } from './seedItems'

describe('seed items', () => {
  it('every seed item references a real location and category', () => {
    const locationIds = new Set(LOCATIONS.map((l) => l.id))
    const categoryIds = new Set(CATEGORIES.map((c) => c.id))
    for (const item of SEED_ITEMS) {
      expect(locationIds.has(item.locationId)).toBe(true)
      expect(categoryIds.has(item.categoryId)).toBe(true)
    }
  })

  it('never sets both rating and daysUntilEmpty', () => {
    for (const item of SEED_ITEMS) {
      const hasBoth = item.rating !== undefined && item.daysUntilEmpty !== undefined
      expect(hasBoth).toBe(false)
    }
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
})
