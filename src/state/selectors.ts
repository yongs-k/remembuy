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

/** Counts down from the last repurchase, so 재구매함 starts a fresh supply of the same length. */
export function getRemainingDays(item: Item, today: string = new Date().toISOString().slice(0, 10)): number | undefined {
  if (item.daysUntilEmpty === undefined) return undefined
  const anchor = item.restockedAt ?? item.createdAt
  const elapsedDays = Math.round(
    (new Date(today).getTime() - new Date(anchor).getTime()) / 86_400_000
  )
  return item.daysUntilEmpty - elapsedDays
}

export function formatDday(days: number): string {
  return days >= 0 ? `D-${days}` : `D+${Math.abs(days)}`
}

const CYCLE_UNIT_DAYS: Record<string, number> = { 일: 1, 주: 7, 개월: 30, 달: 30, 년: 365 }

/** "약 45일마다", "약 1.5개월마다", "3주마다" → days. A month counts as 30 days. */
export function parseRestockCycleDays(restockCycle: string | null | undefined): number | undefined {
  const match = restockCycle?.match(/(\d+(?:\.\d+)?)\s*(개월|달|주|일|년)/)
  if (!match) return undefined
  const days = Math.round(Number(match[1]) * CYCLE_UNIT_DAYS[match[2]])
  return days > 0 ? days : undefined
}

export function getRestockDueDays(item: Item, today: string = new Date().toISOString().slice(0, 10)): number | undefined {
  const cycleDays = parseRestockCycleDays(item.restockCycle)
  if (cycleDays === undefined) return undefined
  const anchor = item.restockedAt ?? item.createdAt
  const elapsedDays = Math.round(
    (new Date(today).getTime() - new Date(anchor).getTime()) / 86_400_000
  )
  return cycleDays - elapsedDays
}

export function getSoonestRemaining(item: Item, today?: string): number | undefined {
  const a = getRemainingDays(item, today)
  const b = getRestockDueDays(item, today)
  if (a === undefined) return b
  if (b === undefined) return a
  return Math.min(a, b)
}

export function getUpcomingNotifications(items: Item[], thresholdDays = 7, today?: string): Item[] {
  return items
    .map((item) => ({ item, remaining: getSoonestRemaining(item, today) }))
    .filter((entry): entry is { item: Item; remaining: number } => entry.remaining !== undefined)
    .filter((entry) => entry.remaining <= thresholdDays)
    .sort((a, b) => a.remaining - b.remaining)
    .map((entry) => entry.item)
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

export function getCompletionGain(
  items: Item[],
  categories: Category[],
  locationId: string,
  categoryId: string,
  masterItemId: string,
  excludeItemId?: string
): { before: number; after: number } {
  const base = excludeItemId ? items.filter((i) => i.id !== excludeItemId) : items
  const preview: Item = {
    id: '__preview__',
    name: '',
    locationId,
    categoryId,
    masterItemId: masterItemId || undefined,
    createdAt: '',
  }
  return {
    before: getLocationCompletion(items, locationId, categories),
    after: getLocationCompletion([...base, preview], locationId, categories),
  }
}
