import type { Location } from '../types'
import { LOCATION_COLOR_HEX } from '../data/locationColors'
import { Icon, LOCATION_MATERIAL_ICON } from '../data/materialIcons'

export function LocationDexCard({
  location,
  percent,
  owned,
  total,
  onOpen,
}: {
  location: Location
  percent: number
  owned: number
  total: number
  onOpen: () => void
}) {
  const color = LOCATION_COLOR_HEX[location.colorToken] ?? '#3F6459'
  const icon = LOCATION_MATERIAL_ICON[location.colorToken] ?? 'inventory_2'

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-space-sm px-space-md py-3 text-left transition-colors hover:bg-surface-container-low"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}26`, color }}
      >
        <Icon name={icon} className="text-[24px]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-label-lg text-on-surface">{location.name}</span>
          <span className="shrink-0 text-label-md tabular-nums text-on-surface-variant">
            {percent >= 100 ? <span className="text-secondary">완성</span> : `${owned}/${total}`}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div className="h-full rounded-full bg-secondary" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
    </button>
  )
}
