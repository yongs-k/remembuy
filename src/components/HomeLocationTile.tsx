import type { Location } from '../types'
import { LOCATION_COLOR_HEX } from '../data/locationColors'
import { Icon, LOCATION_MATERIAL_ICON } from '../data/materialIcons'

const RING_PATH = 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831'

/** Compact room tile: the collection-rate ring wraps the room icon. */
export function HomeLocationTile({
  location,
  percent,
  count,
  onClick,
}: {
  location: Location
  percent: number
  count: number
  onClick: () => void
}) {
  const color = LOCATION_COLOR_HEX[location.colorToken] ?? '#3F6459'
  const icon = LOCATION_MATERIAL_ICON[location.colorToken] ?? 'inventory_2'
  const clamped = Math.min(100, Math.max(0, percent))

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${location.name}, ${count}개 등록, 수집률 ${clamped}%`}
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
    </button>
  )
}
