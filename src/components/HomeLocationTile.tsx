import type { Location } from '../types'
import { LOCATION_COLOR_HEX } from '../data/locationColors'
import { Icon, LOCATION_MATERIAL_ICON } from '../data/materialIcons'
import type { RoomStage } from '../lib/gameApi'
import { STAGE_SIZE } from '../state/gameProgress'
import { gradeColor, gradeLabel } from '../data/gradeColors'
import { CountBadge, PuzzleBoard, litPieces } from './Puzzle'

const RING_PATH = 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831'

/**
 * Compact room tile: the collection-rate ring wraps the room icon. Behind it, the 장소's
 * grade stage: a border in the grade's colour and four puzzle pieces lit by its +N.
 * At +4, 달성 moves it to the next grade.
 */
export function HomeLocationTile({
  location,
  percent,
  count,
  room,
  onClick,
  onAchieve,
  achieving = false,
}: {
  location: Location
  percent: number
  count: number
  /** The 장소's grade stage, once the game catalog has loaded. */
  room?: RoomStage
  onClick: () => void
  /** 달성, offered once the stage has four pieces. */
  onAchieve?: () => void
  achieving?: boolean
}) {
  const color = LOCATION_COLOR_HEX[location.colorToken] ?? '#3F6459'
  const icon = LOCATION_MATERIAL_ICON[location.colorToken] ?? 'inventory_2'
  const clamped = Math.min(100, Math.max(0, percent))
  // After 전설 the tile stays in 전설 red, fully lit.
  const grade = room ? (room.stage ?? 'LEGENDARY') : null
  const ready = Boolean(room?.stage && room.count >= STAGE_SIZE)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-label={`${location.name}, ${count}개 등록, 수집률 ${clamped}%${room ? (room.stage ? `, ${gradeLabel(room.stage)} 조각 +${room.count}` : ', 전설까지 달성') : ''}`}
        className={`relative flex w-full flex-col items-center gap-1.5 overflow-hidden rounded-xl border-2 bg-surface-container-lowest px-1 py-space-md text-center shadow-card transition-colors duration-500 ${grade ? '' : 'border-hairline'}`}
        style={grade ? { borderColor: gradeColor(grade).hex } : undefined}
      >
        {room && grade && (
          <span aria-hidden className="pointer-events-none absolute inset-0 text-on-surface-variant">
            <PuzzleBoard
              grade={grade}
              pieces={room.stage ? litPieces(room.count) : [1, 1, 1, 1]}
              flat
              stretch
              className="absolute inset-0 h-full w-full"
            />
          </span>
        )}
        {/* Icon and text sit on Card White so the puzzle lines behind never cross them. */}
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-lowest" style={{ color }}>
          <svg aria-hidden className="absolute inset-0 h-11 w-11 -rotate-90" viewBox="0 0 36 36">
            <path d={RING_PATH} fill="none" stroke="#e7e2db" strokeWidth="2.5" />
            <path
              d={RING_PATH}
              fill="none"
              stroke={color}
              strokeDasharray={`${clamped}, 100`}
              strokeLinecap="round"
              strokeWidth="2.5"
            />
          </svg>
          <Icon name={icon} className="text-[20px]" />
        </span>
        <span className="relative flex max-w-full flex-col items-center rounded-lg bg-surface-container-lowest/90 px-2 py-0.5 shadow-[0_0_0_1px_rgb(0_0_0/0.04)]">
          <span className="max-w-full truncate text-label-md font-bold text-on-surface">{location.name}</span>
          <span className="text-label-sm font-medium tabular-nums text-on-surface-variant">
            {count}개 · {clamped}%
          </span>
          {room && grade && (
            <span className={`text-label-sm font-bold ${gradeColor(grade).text}`}>
              {room.stage ? `${gradeLabel(room.stage)} 단계` : '전설 달성'}
            </span>
          )}
        </span>
      </button>
      {room?.stage && <CountBadge count={room.count} className="pointer-events-none absolute left-1.5 top-1.5" />}
      {ready && onAchieve && (
        <button
          type="button"
          disabled={achieving}
          onClick={onAchieve}
          aria-label={`${location.name} ${gradeLabel(room!.stage!)} 달성`}
          className="absolute right-1 top-1 min-h-8 rounded-full before:absolute before:-inset-1.5 before:content-[''] bg-gradient-to-b from-[#f8dc9a] to-[#d9a24c] px-2.5 text-label-sm font-bold text-on-tertiary-fixed shadow-float active:scale-[0.97] disabled:opacity-70"
        >
          {achieving ? '…' : '달성'}
        </button>
      )}
    </div>
  )
}
