import type { Category, Item, Location, MasterItem } from '../types'

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
  const locationCategories = categories.filter(
    (c) => c.locationId === locationId && c.masterItems.length > 0
  )
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

function recommendationRank(item: Item): number {
  if (item.recommendation === 'recommend') return 0
  if (item.recommendation === 'notRecommend') return 1
  return 2
}

export function getRankingForCategory(items: Item[], categoryId: string): Item[] {
  return items
    .filter((i) => i.categoryId === categoryId)
    .slice()
    .sort((a, b) => recommendationRank(a) - recommendationRank(b))
}

export function getUpcomingNotifications(items: Item[], thresholdDays = 7): Item[] {
  return items
    .filter((i) => i.daysUntilEmpty !== undefined && i.daysUntilEmpty <= thresholdDays)
    .slice()
    .sort((a, b) => (a.daysUntilEmpty as number) - (b.daysUntilEmpty as number))
}

export function getLocationsRankedByItemCount(
  items: Item[],
  locations: Location[]
): Array<{ location: Location; itemCount: number }> {
  return locations
    .map((location) => ({
      location,
      itemCount: items.filter((i) => i.locationId === location.id).length,
    }))
    .sort((a, b) => b.itemCount - a.itemCount)
}

export function getCategoriesRankedByItemCount(
  items: Item[],
  categories: Category[],
  locationId: string
): Array<{ category: Category; itemCount: number }> {
  return categories
    .filter((c) => c.locationId === locationId)
    .map((category) => ({
      category,
      itemCount: items.filter((i) => i.categoryId === category.id).length,
    }))
    .sort((a, b) => b.itemCount - a.itemCount)
}

export function getCompletedPodium(
  items: Item[],
  categoryId: string
): { rank: 1 | 2 | 3; item: Item }[] | null {
  const categoryItems = items.filter((i) => i.categoryId === categoryId)
  const entries: { rank: 1 | 2 | 3; item: Item }[] = []
  for (const rank of [1, 2, 3] as const) {
    const item = categoryItems.find((i) => i.podiumRank === rank)
    if (!item) return null
    entries.push({ rank, item })
  }
  return entries
}

export function getMasterItemCounts(
  items: Item[],
  categories: Category[],
  locationId?: string
): { owned: number; total: number } {
  const scoped = locationId ? categories.filter((c) => c.locationId === locationId) : categories
  let owned = 0
  let total = 0
  for (const category of scoped) {
    total += category.masterItems.length
    owned += category.masterItems.length - getMissingMasterItems(items, category).length
  }
  return { owned, total }
}
