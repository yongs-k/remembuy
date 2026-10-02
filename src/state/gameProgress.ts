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

/** progress: 0..1, the mean of each item's completion (a finished item counts as 1). */
export type RoomFragments = { fragments: number; completed: number; total: number; progress: number }

/** 아이템 수집함 progress per 장소: fragments collected, items completed, items in the 장소. */
export function roomFragments(dex: DexEntry[]): Record<string, RoomFragments> {
  const byRoom: Record<string, RoomFragments> = {}
  for (const entry of dex) {
    if (!entry.roomType) continue
    const room = (byRoom[entry.roomType] ??= { fragments: 0, completed: 0, total: 0, progress: 0 })
    const done = entry.status === 'COMPLETE'
    room.fragments += entry.fragmentCount
    room.total += 1
    if (done) room.completed += 1
    // Sum for now; divided by total below.
    room.progress += done ? 1 : Math.min(1, entry.fragmentCount / entry.fragmentsRequired)
  }
  for (const room of Object.values(byRoom)) room.progress /= room.total
  return byRoom
}

/** The 대표 칭호 ("spaceId:tierCode"), kept per device. Null when unset or no longer earned. */
// ponytail: localStorage, so a recovery-code restore doesn't carry it; move to the server if that matters.
export function useMainTitle(state: GameState | null) {
  const [key, setKey] = useLocalStorage<string | null>('remembuy.mainTitle', null)
  const earned = state?.titles.find((title) => `${title.spaceId}:${title.tierCode}` === key) ?? null
  return [earned, setKey] as const
}
