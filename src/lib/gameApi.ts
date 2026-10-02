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

export type Box = { id: string; name: string; costPoints: number }

export type DexEntry = {
  id: string
  name: string
  grade: string
  fragmentsRequired: number
  /** The 장소 (location id) the item belongs to. */
  roomType: string | null
  status: 'LOCKED' | 'COLLECTING' | 'COMPLETE'
  fragmentCount: number
}

/**
 * A 장소's stage: the grade it is collecting (null once 전설 is achieved) and `count`,
 * that grade's pieces so far (the tile's +N, no limit). 4 or more lets 달성 happen.
 */
export type RoomStage = { spaceId: string; stage: string | null; count: number; completedGrades: string[] }

/**
 * One piece arriving. `source` 'stage' when it is the 장소's grade (count = its +N),
 * 'stock' when it was kept for 조합 instead (count = that pile). `slot` only picks the shape.
 */
export type PieceResult = {
  spaceId: string
  grade: string
  slot: number
  source: 'stage' | 'stock'
  count: number
  ready: boolean
}

/** A pile of pieces that 조합 can draw from. */
export type PieceStack = { spaceId: string; grade: string; source: 'stage' | 'stock'; count: number }

/** Pieces chosen for 조합, per pile. */
export type CombinePick = { spaceId: string; source: 'stage' | 'stock'; count: number }

export type OpenBoxResult = {
  result: { type: 'FRAGMENT' | 'FULL_ITEM'; itemId: string; itemName: string; grade: string }
  /** The 장소 stage the fragment went to, after this open. */
  room?: PieceResult
  pointsSpent: number
  pointsBalance: number
  dexEntry: DexEntry
}

export const fetchBoxes = () => request<{ boxes: Box[] }>('/api/game/boxes')

export const fetchDex = () =>
  request<{ items: DexEntry[]; rooms?: RoomStage[]; stacks?: PieceStack[] }>('/api/game/dex')

/** 조합: ten pieces of `grade` (these `picks`) become one random piece of the next grade. */
export const combinePieces = (grade: string, picks: CombinePick[]) =>
  request<{ piece: PieceResult; itemName: string; rooms: RoomStage[]; stacks: PieceStack[] }>('/api/game/combine', {
    method: 'POST',
    body: JSON.stringify({ grade, picks }),
  })

/** 달성: spend four of the 장소's grade and move it to the next grade. */
export const achieveStage = (spaceId: string) =>
  request<{ achieved: { spaceId: string; grade: string }; rooms: RoomStage[]; stacks: PieceStack[] }>('/api/game/achieve', {
    method: 'POST',
    body: JSON.stringify({ spaceId }),
  })

export const openBox = (boxId: string) =>
  request<OpenBoxResult>(`/api/game/boxes/${encodeURIComponent(boxId)}/open`, { method: 'POST' })

/** Opens `count` boxes in one go (all or none; the server allows up to 10). */
export const openBoxes = (boxId: string, count: number) =>
  request<{ results: OpenBoxResult[]; pointsBalance: number }>(
    `/api/game/boxes/${encodeURIComponent(boxId)}/open?count=${count}`,
    { method: 'POST' }
  )

/** 출석하기: whether today's free box was already opened (the day is Korea time, server-side). */
export type Attendance = { day: string; claimedToday: boolean }

export const fetchAttendance = () => request<Attendance>('/api/game/attendance')

export const claimAttendance = () => request<OpenBoxResult>('/api/game/attendance', { method: 'POST' })

/** 퀘스트 progress, computed by the server from the synced records and attendance. */
export type Quest = {
  id: string
  kind: 'daily' | 'once'
  title: string
  target: number
  progress: number
  reward: number
  claimed: boolean
  claimable: boolean
}

export const fetchQuests = () => request<{ quests: Quest[] }>('/api/game/quests')

export const claimQuest = (questId: string) =>
  request<{ pointsAwarded: number; quests: Quest[] }>(`/api/game/quests/${encodeURIComponent(questId)}/claim`, {
    method: 'POST',
  })
