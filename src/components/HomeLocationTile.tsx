import type { Location } from '../types'
import { LOCATION_COLOR_HEX } from '../data/locationColors'
import { Icon, LOCATION_MATERIAL_ICON } from '../data/materialIcons'
import type { RoomStage } from '../lib/gameApi'
import { STAGE_SIZE } from '../state/gameProgress'
import { gradeColor, gradeLabel } from '../data/gradeColors'

// Clockwise from top-left: one quarter of the tile per fragment of the current grade.
const QUARTERS = ['left-0 top-0', 'right-0 top-0', 'bottom-0 right-0', 'bottom-0 left-0']

/** The 장소's grade stage as the tile itself: four quarters, lit in the grade's colour one fragment at a time. */
function StageQuarters({ room }: { room: RoomStage }) {
  // After 전설 the tile stays fully lit in 전설 red.
  const grade = room.stage ?? 'LEGENDARY'
  const lit = room.stage ? room.count : STAGE_SIZE
  const hex = gradeColor(grade).hex
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {QUARTERS.map((corner, i) => (
        <span
          key={corner}
          className={`absolute h-1/2 w-1/2 ${corner}`}
          style={i < lit ? { backgroundColor: `${hex}59` } : undefined}
        />
      ))}
      <span className="absolute inset-y-0 left-1/2 border-l border-dashed border-outline-variant/60" />
      <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-outline-variant/60" />
    </span>
  )
}

const RING_PATH = 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831'

/** Compact room tile: the collection-rate ring wraps the room icon; the tile's four quarters show the 장소's grade stage. */
export function HomeLocationTile({
  location,
  percent,
  count,
  room,
  onClick,
}: {
  location: Location
  percent: number
  count: number
  /** The 장소's grade stage, once the game catalog has loaded. */
  room?: RoomStage
  onClick: () => void
}) {
  const color = LOCATION_COLOR_HEX[location.colorToken] ?? '#3F6459'
  const icon = LOCATION_MATERIAL_ICON[location.colorToken] ?? 'inventory_2'
  const clamped = Math.min(100, Math.max(0, percent))

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${location.name}, ${count}개 등록, 수집률 ${clamped}%${room ? (room.stage ? `, ${gradeLabel(room.stage)} 조각 ${room.count}/${STAGE_SIZE}` : ', 전설까지 완성') : ''}`}
      className="relative flex flex-col items-center gap-1.5 overflow-hidden rounded-xl border border-hairline bg-surface-container-lowest px-1 py-space-md text-center shadow-card transition-colors hover:border-outline-variant"
    >
      {room && <StageQuarters room={room} />}
      <span className="relative flex h-11 w-11 items-center justify-center" style={{ color }}>
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
      <span className="relative w-full truncate text-label-md text-on-surface">{location.name}</span>
      <span className="relative text-label-sm font-medium tabular-nums text-on-surface-variant">
        {count}개 · {clamped}%
      </span>
      {room && (
        <span className={`relative text-label-sm font-bold tabular-nums ${gradeColor(room.stage ?? 'LEGENDARY').text}`}>
          {room.stage ? `${gradeLabel(room.stage)} ${room.count}/${STAGE_SIZE}` : '전설 완성'}
        </span>
      )}
    </button>
  )
}
