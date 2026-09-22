import { getDeviceId } from './deviceId'

export type GameSpaceProgress = {
  spaceId: string
  claimed: number
  total: number
  percent: number
  highestTier: string | null
  nextTier: string | null
  percentToNext: number
  bonusRateBp: number
}

export type GameTitle = { spaceId: string; tierCode: string; earnedAt: string }

export type GameBenefit = {
  spaceId: string
  tierCode: string
  type: string
  value: number
  payload: string | null
  startAt: string | null
  endAt: string | null
  eventId: string | null
}

export type GameState = {
  points: number
  spaces: GameSpaceProgress[]
  titles: GameTitle[]
  benefits: GameBenefit[]
}

export type PointHistoryItem = {
  id: number
  amount: number
  type: string
  sourceId: string
  createdAt: string
}

export type ClaimResult = {
  newSlots: string[]
  ignored: string[]
  pointsAwarded: number
  history: PointHistoryItem[]
  state: GameState
}

export type GameCatalog = {
  spaces: Array<{
    id: string
    name: string
    groups: Array<{ id: string; name: string; slots: Array<{ id: string; name: string }> }>
  }>
  titleTiers: Array<{
    code: string
    name: string
    minPercent: number
    colorToken: string
    rewardPoints: number
  }>
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Id': getDeviceId(),
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) throw new Error(`game api ${res.status}`)
  return (await res.json()) as T
}

export const fetchGameState = () => request<GameState>('/api/game/state')

export const fetchGameCatalog = () => request<GameCatalog>('/api/game/catalog')

export const claimSlots = (slotIds: string[]) =>
  request<ClaimResult>('/api/game/claims', { method: 'POST', body: JSON.stringify({ slotIds }) })

export const fetchPointHistory = (limit = 50, before?: number) =>
  request<{ items: PointHistoryItem[]; nextBefore: number | null }>(
    `/api/game/points-history?limit=${limit}${before === undefined ? '' : `&before=${before}`}`
  )
