import type { DexEntry, GameState } from '../lib/gameApi'
import { useLocalStorage } from '../hooks/useLocalStorage'

// Mirrors the server's default title_tiers (server/game/db.js DEFAULT_TIERS).
export const TIER_NAMES: Record<string, string> = {
  SPROUT: '새싹',
  MANAGER: '관리자',
  EXPERT: '전문가',
  MASTER: '마스터',
}

export const tierName = (code: string) => TIER_NAMES[code] ?? code

export type RoomFragments = { fragments: number; completed: number; total: number }

/** 아이템 수집함 progress per 장소: fragments collected, items completed, items in the 장소. */
export function roomFragments(dex: DexEntry[]): Record<string, RoomFragments> {
  const byRoom: Record<string, RoomFragments> = {}
  for (const entry of dex) {
    if (!entry.roomType) continue
    const room = (byRoom[entry.roomType] ??= { fragments: 0, completed: 0, total: 0 })
    room.fragments += entry.fragmentCount
    room.total += 1
    if (entry.status === 'COMPLETE') room.completed += 1
  }
  return byRoom
}

/** The 대표 칭호 ("spaceId:tierCode"), kept per device. Null when unset or no longer earned. */
// ponytail: localStorage, so a recovery-code restore doesn't carry it; move to the server if that matters.
export function useMainTitle(state: GameState | null) {
  const [key, setKey] = useLocalStorage<string | null>('remembuy.mainTitle', null)
  const earned = state?.titles.find((title) => `${title.spaceId}:${title.tierCode}` === key) ?? null
  return [earned, setKey] as const
}
