import type { Location } from '../types'
import { LOCATION_COLOR_HEX } from '../data/locationColors'
import { Icon, LOCATION_MATERIAL_ICON } from '../data/materialIcons'

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
      className="flex h-[126px] flex-col justify-between rounded-xl bg-surface-container-lowest p-space-md text-left shadow-[0_3px_0px_#eae0de] transition-shadow hover:shadow-[0_4px_0px_#eae0de]"
    >
      <div className="flex items-start justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}33`, color }}
        >
          <Icon name={icon} className="text-[20px]" />
        </div>
        <div className="relative flex h-8 w-8 items-center justify-center">
          <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#eae0de"
              strokeWidth="4"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={color}
              strokeDasharray={`${clamped}, 100`}
              strokeLinecap="round"
              strokeWidth="4"
            />
          </svg>
          <span className="absolute text-label-sm font-extrabold text-on-surface">{clamped}%</span>
        </div>
      </div>
      <div className="mt-2 flex flex-col">
        <span className="truncate font-heading text-headline-md font-bold text-on-surface">
          {location.name}
        </span>
        <span className="flex items-center gap-1 text-body-sm text-on-surface-variant">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          {count}개 등록
        </span>
      </div>
    </button>
  )
}
