import type { Location } from '../types'
import { LOCATION_COLOR_HEX } from '../data/locationColors'
import { Icon, LOCATION_MATERIAL_ICON } from '../data/materialIcons'
import type { RoomFragments } from '../state/gameProgress'

// Clockwise from top-left: each quarter of the square is 25% of the 장소's items.
const QUADRANTS = [
  [0, 0],
  [9, 0],
  [9, 9],
  [0, 9],
] as const

/** 장소 fragments as a square in four pieces that light up one by one, each filling from the bottom. */
function FragmentSquare({ progress }: { progress: number }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-[18px] w-[18px] shrink-0">
      {QUADRANTS.map(([x, y], i) => {
        const fill = Math.min(1, Math.max(0, progress * 4 - i))
        return (
          <g key={i}>
            <rect x={x} y={y} width="7" height="7" rx="1.5" fill="#e7e2db" />
            {fill > 0 && (
              <rect x={x} y={y + 7 * (1 - fill)} width="7" height={7 * fill} rx="1.5" className="fill-tertiary" />
            )}
          </g>
        )
      })}
    </svg>
  )
}

const RING_PATH = 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831'

/** Compact room tile: the collection-rate ring wraps the room icon; the 장소's game fragments sit underneath. */
export function HomeLocationTile({
  location,
  percent,
  count,
  game,
  onClick,
}: {
  location: Location
  percent: number
  count: number
  /** 아이템 수집함 progress for this 장소, once the game catalog has loaded. */
  game?: RoomFragments
  onClick: () => void
}) {
  const color = LOCATION_COLOR_HEX[location.colorToken] ?? '#3F6459'
  const icon = LOCATION_MATERIAL_ICON[location.colorToken] ?? 'inventory_2'
  const clamped = Math.min(100, Math.max(0, percent))

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${location.name}, ${count}개 등록, 수집률 ${clamped}%${game ? `, 조각 ${game.fragments}개, 아이템 ${game.completed}/${game.total} 완성` : ''}`}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-hairline bg-surface-container-lowest px-1 py-space-md text-center shadow-card transition-colors hover:border-outline-variant"
    >
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
      <span className="w-full truncate text-label-md text-on-surface">{location.name}</span>
      <span className="text-label-sm font-medium tabular-nums text-on-surface-variant">
        {count}개 · {clamped}%
      </span>
      {game && game.total > 0 && (
        <span className="flex items-center gap-1 text-label-sm tabular-nums text-on-surface-variant">
          <FragmentSquare progress={game.progress} />
          조각 {game.fragments}
          {game.completed > 0 && <span> · 완성 {game.completed}</span>}
        </span>
      )}
    </button>
  )
}
