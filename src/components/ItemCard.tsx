import { DdayLabel } from './Badge'
import { ItemThumb } from './ItemThumb'
import type { Item } from '../types'
import { Icon } from '../data/materialIcons'
import { RecommendationBadge } from './RecommendationBadge'
import { getSoonestRemaining } from '../state/selectors'

export function ItemCard({ item, onClick }: { item: Item; onClick: () => void }) {
  const remaining = getSoonestRemaining(item)
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl bg-surface-container-lowest p-space-md text-left border border-hairline shadow-card"
    >
      <ItemThumb item={item} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-label-lg text-on-surface">{item.name}</p>
        {(item.recommendation !== undefined || remaining !== undefined) && (
          <span className="flex flex-wrap items-center gap-2">
            {item.recommendation !== undefined && <RecommendationBadge recommendation={item.recommendation} />}
            {remaining !== undefined && <DdayLabel days={remaining} />}
          </span>
        )}
      </div>
      <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
    </button>
  )
}
