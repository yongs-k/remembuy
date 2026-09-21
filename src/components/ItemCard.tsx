import type { Item } from '../types'
import { Icon } from '../data/materialIcons'
import { RecommendationBadge } from './RecommendationBadge'

export function ItemCard({ item, onClick }: { item: Item; onClick: () => void }) {
  const urgent = item.daysUntilEmpty !== undefined && item.daysUntilEmpty <= 7
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl bg-surface-container-lowest p-space-md text-left shadow-[0_3px_0px_#eae0de]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
        <Icon name="inventory_2" className="text-[24px]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-label-lg text-on-surface">{item.name}</p>
        {item.recommendation !== undefined ? (
          <RecommendationBadge recommendation={item.recommendation} />
        ) : item.daysUntilEmpty !== undefined ? (
          <span
            className={`self-start rounded px-1.5 py-0.5 text-label-sm ${
              urgent
                ? 'bg-error-container text-on-error-container'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            D-{item.daysUntilEmpty}
          </span>
        ) : null}
      </div>
      <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
    </button>
  )
}
