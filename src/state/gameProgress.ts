import type { GameState, RoomStage } from '../lib/gameApi'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { LOCATIONS } from '../data/locations'
import { gradeLabel } from '../data/gradeColors'

// Mirrors the server's default title_tiers (server/game/db.js DEFAULT_TIERS).
export const TIER_NAMES: Record<string, string> = {
  SPROUT: '새싹',
  MANAGER: '관리자',
  EXPERT: '전문가',
  MASTER: '마스터',
}

export const tierName = (code: string) => TIER_NAMES[code] ?? code

/** Fragments of one grade that complete a 장소 stage (server/game/itemService.js STAGE_SIZE). */
export const STAGE_SIZE = 4

export const placeName = (spaceId: string) => LOCATIONS.find((location) => location.id === spaceId)?.name ?? spaceId

export type EarnedTitle = { key: string; label: string }

/**
 * Every title the user holds: record titles (욕실 새싹, from real records) and
 * grade titles (일반 욕실, from completing a 장소 stage with box fragments).
 */
export function earnedTitles(state: GameState | null, rooms: RoomStage[]): EarnedTitle[] {
  const record = [...(state?.titles ?? [])]
    .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))
    .map((title) => ({
      key: `${title.spaceId}:${title.tierCode}`,
      label: `${placeName(title.spaceId)} ${tierName(title.tierCode)}`,
    }))
  const grade = rooms.flatMap((room) =>
    room.completedGrades.map((code) => ({
      key: `grade:${room.spaceId}:${code}`,
      label: `${gradeLabel(code)} ${placeName(room.spaceId)}`,
    }))
  )
  return [...grade.reverse(), ...record]
}

/** The 대표 칭호, kept per device. Null when unset or no longer held. */
// ponytail: localStorage, so a recovery-code restore doesn't carry it; move to the server if that matters.
export function useMainTitle(titles: EarnedTitle[]) {
  const [key, setKey] = useLocalStorage<string | null>('remembuy.mainTitle', null)
  return [titles.find((title) => title.key === key) ?? null, setKey] as const
}
