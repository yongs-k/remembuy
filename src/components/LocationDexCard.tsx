import type { Location } from '../types'
import { LOCATION_COLOR_HEX } from '../data/locationColors'
import { Icon, LOCATION_MATERIAL_ICON } from '../data/materialIcons'

export function LocationDexCard({
  rank,
  location,
  percent,
  owned,
  total,
  onOpen,
}: {
  rank: number
  location: Location
  percent: number
  owned: number
  total: number
  onOpen: () => void
}) {
  const color = LOCATION_COLOR_HEX[location.colorToken] ?? '#3F6459'
  const icon = LOCATION_MATERIAL_ICON[location.colorToken] ?? 'inventory_2'
  const tag =
    percent >= 100
      ? { text: '완성', cls: 'bg-secondary-container text-on-secondary-container' }
      : percent >= 70
        ? { text: '완성 임박!', cls: 'bg-primary-fixed text-primary' }
        : null

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl bg-surface-container-lowest p-space-md text-left shadow-[0_3px_0px_#e1bfb8] transition-colors hover:bg-surface-bright"
    >
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex min-w-0 items-center gap-space-sm">
          <div
            className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}33`, color }}
          >
            <Icon name={icon} className="text-[28px]" />
            <span className="absolute left-1 top-1 rounded bg-inverse-surface/80 px-1 text-[9px] font-bold text-inverse-on-surface">
              #{String(rank).padStart(2, '0')}
            </span>
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-1.5">
              <h4 className="truncate font-heading text-headline-md text-on-surface">{location.name}</h4>
              {tag && (
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-label-sm ${tag.cls}`}>
                  {tag.text}
                </span>
              )}
            </div>
            <span className="mt-0.5 text-body-sm text-on-surface-variant">
              {owned} / {total}종 수집 완료 ({percent}%)
            </span>
          </div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-label-sm text-on-surface">
          {percent}%
        </div>
      </div>
      <div className="mt-space-sm h-2 w-full overflow-hidden rounded-full bg-surface-container">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
      <div className="mt-space-sm flex items-center justify-end text-on-surface-variant">
        <Icon name="chevron_right" className="text-[18px]" />
      </div>
    </button>
  )
}
