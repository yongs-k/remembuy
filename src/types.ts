export type Location = {
  id: string
  name: string
  colorToken: string // key into LOCATION_COLOR_HEX (src/data/locationColors.ts), e.g. "bathroom"
}

export type MasterItem = {
  id: string
  name: string
}

export type Category = {
  id: string
  locationId: string
  name: string
  masterItems: MasterItem[]
}

export type Item = {
  id: string
  name: string
  locationId: string
  categoryId: string
  masterItemId?: string
  note?: string
  recommendation?: 'recommend' | 'notRecommend' // mutually exclusive with daysUntilEmpty
  daysUntilEmpty?: number
  podiumRank?: 1 | 2 | 3 // per-category: at most one item holds each rank at a time
  price?: number
  place?: string
  restockCycle?: string | null
  affiliateUrl?: string | null
  createdAt: string
}

export type FeedPost = {
  id: string
  nickname: string
  itemName: string
  rating: number
  comment: string
  locationId: string
  categoryId: string
}

export type FamilyMember = {
  id: string
  name: string
  relation: string
  items: Array<{ itemName: string; daysUntilEmpty: number }>
}
