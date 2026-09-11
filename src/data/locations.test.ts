import { describe, it, expect } from 'vitest'
import { LOCATIONS, CATEGORIES, getCategoriesForLocation } from './locations'

describe('locations seed data', () => {
  it('has exactly 10 locations with unique ids', () => {
    expect(LOCATIONS).toHaveLength(10)
    const ids = new Set(LOCATIONS.map((l) => l.id))
    expect(ids.size).toBe(10)
  })

  it('every category belongs to a real location', () => {
    const locationIds = new Set(LOCATIONS.map((l) => l.id))
    for (const category of CATEGORIES) {
      expect(locationIds.has(category.locationId)).toBe(true)
    }
  })

  it('every category has at least one master item', () => {
    for (const category of CATEGORIES) {
      expect(category.masterItems.length).toBeGreaterThan(0)
    }
  })

  it('getCategoriesForLocation returns only that location categories', () => {
    const bathroomCategories = getCategoriesForLocation('bathroom')
    expect(bathroomCategories.length).toBeGreaterThan(0)
    expect(bathroomCategories.every((c) => c.locationId === 'bathroom')).toBe(true)
  })

  it('master item ids are globally unique', () => {
    const allIds = CATEGORIES.flatMap((c) => c.masterItems.map((m) => m.id))
    expect(new Set(allIds).size).toBe(allIds.length)
  })
})
