import type { Location } from '../types'
import { LOCATION_COLOR_HEX } from '../data/locationColors'
import { Icon, LOCATION_MATERIAL_ICON } from '../data/materialIcons'
import type { RoomFragments } from '../state/gameProgress'

// Clockwise from top-left: each quarter of the tile is 25% of the 장소's items.
const QUARTERS = ['left-0 top-0', 'right-0 top-0', 'bottom-0 right-0', 'bottom-0 left-0']

/** 장소 fragments as the tile itself in four pieces that light up one by one, each filling from the bottom. */
function FragmentQuarters({ progress }: { progress: number }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {QUARTERS.map((corner, i) => {
        const fill = Math.min(1, Math.max(0, progress * 4 - i))
        return (
          <span key={corner} className={`absolute h-1/2 w-1/2 ${corner}`}>
            {fill > 0 && (
              <span className="absolute inset-x-0 bottom-0 bg-tertiary-fixed/60" style={{ height: `${fill * 100}%` }} />
            )}
          </span>
        )
      })}
      <span className="absolute inset-y-0 left-1/2 border-l border-dashed border-outline-variant/50" />
      <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-outline-variant/50" />
    </span>
  )
}

const RING_PATH = 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831'

/** Compact room tile: the collection-rate ring wraps the room icon; the tile's four quarters fill with the 장소's game fragments. */
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
      className="relative flex flex-col items-center gap-1.5 overflow-hidden rounded-xl border border-hairline bg-surface-container-lowest px-1 py-space-md text-center shadow-card transition-colors hover:border-outline-variant"
    >
      {game && game.total > 0 && <FragmentQuarters progress={game.progress} />}
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
      {game && game.total > 0 && (
        <span className="relative text-label-sm tabular-nums text-on-surface-variant">
          조각 {game.fragments}
          {game.completed > 0 && <span> · 완성 {game.completed}</span>}
        </span>
      )}
    </button>
  )
}
