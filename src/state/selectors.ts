import type { Category, Item, MasterItem } from '../types'

export function getCategoryCompletion(items: Item[], category: Category): number {
  if (category.masterItems.length === 0) return 0
  const owned = new Set(
    items
      .filter((i) => i.categoryId === category.id && i.masterItemId)
      .map((i) => i.masterItemId as string)
  )
  const coveredCount = category.masterItems.filter((m) => owned.has(m.id)).length
  return Math.round((coveredCount / category.masterItems.length) * 100)
}

export function getLocationCompletion(
  items: Item[],
  locationId: string,
  categories: Category[]
): number {
  const locationCategories = categories.filter((c) => c.locationId === locationId)
  if (locationCategories.length === 0) return 0
  const total = locationCategories.reduce(
    (sum, category) => sum + getCategoryCompletion(items, category),
    0
  )
  return Math.round(total / locationCategories.length)
}

export function getMissingMasterItems(items: Item[], category: Category): MasterItem[] {
  const owned = new Set(
    items
      .filter((i) => i.categoryId === category.id && i.masterItemId)
      .map((i) => i.masterItemId as string)
  )
  return category.masterItems.filter((m) => !owned.has(m.id))
}

export function getRankingForCategory(items: Item[], categoryId: string): Item[] {
  return items
    .filter((i) => i.categoryId === categoryId)
    .slice()
    .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
}

export function getUpcomingNotifications(items: Item[], thresholdDays = 7): Item[] {
  return items
    .filter((i) => i.daysUntilEmpty !== undefined && i.daysUntilEmpty <= thresholdDays)
    .slice()
    .sort((a, b) => (a.daysUntilEmpty as number) - (b.daysUntilEmpty as number))
}
