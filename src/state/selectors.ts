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

/** The user's 순위 지정 (1·2·3) first, then recommended, not recommended, unrated. */
export function getRankingForCategory(items: Item[], categoryId: string): Item[] {
  const podium = (item: Item) => item.podiumRank ?? 4
  return items
    .filter((i) => i.categoryId === categoryId)
    .slice()
    .sort((a, b) => podium(a) - podium(b) || recommendationRank(a) - recommendationRank(b))
}

const DAY_MS = 86_400_000

/** createdAt plus every confirmed repurchase, oldest first, one entry per day. */
export function getPurchaseDates(item: Item): string[] {
  const later = item.purchaseHistory ?? (item.restockedAt ? [item.restockedAt] : [])
  return [...new Set([item.createdAt, ...later])].sort()
}

/** Gaps needed before the observed cycle replaces what the user typed. */
export const MIN_OBSERVED_GAPS = 2

/** Median days between purchases; undefined until MIN_OBSERVED_GAPS gaps exist. */
export function getObservedCycleDays(item: Item): number | undefined {
  const dates = getPurchaseDates(item)
  const gaps = dates
    .slice(1)
    .map((date, i) => Math.round((new Date(date).getTime() - new Date(dates[i]).getTime()) / DAY_MS))
    .filter((gap) => gap > 0)
  if (gaps.length < MIN_OBSERVED_GAPS) return undefined
  const sorted = [...gaps].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

/**
 * Counts down from the last repurchase, so 재구매함 starts a fresh supply. Once
 * enough purchases are recorded, the observed cycle replaces the typed estimate.
 */
export function getRemainingDays(item: Item, today: string = new Date().toISOString().slice(0, 10)): number | undefined {
  if (item.daysUntilEmpty === undefined) return undefined
  const supplyDays = getObservedCycleDays(item) ?? item.daysUntilEmpty
  const anchor = item.restockedAt ?? item.createdAt
  const elapsedDays = Math.round(
    (new Date(today).getTime() - new Date(anchor).getTime()) / 86_400_000
  )
  return supplyDays - elapsedDays
}

export function formatDday(days: number): string {
  return days > 0 ? `D-${days}` : days === 0 ? '오늘' : `${Math.abs(days)}일 지남`
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
  const statedDays = parseRestockCycleDays(item.restockCycle)
  if (statedDays === undefined) return undefined
  const cycleDays = getObservedCycleDays(item) ?? statedDays
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
