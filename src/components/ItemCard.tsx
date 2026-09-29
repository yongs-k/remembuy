import { useState } from 'react'
import type { Item } from '../types'
import { Icon } from '../data/materialIcons'
import { RecommendationBadge } from './RecommendationBadge'
import { getRemainingDays, formatDday } from '../state/selectors'

export function ItemCard({ item, onClick }: { item: Item; onClick: () => void }) {
  const remaining = getRemainingDays(item)
  const urgent = remaining !== undefined && remaining <= 7
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(item.imageUrl) && !imageFailed
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl bg-surface-container-lowest p-space-md text-left shadow-[0_3px_0px_#eae0de]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container-low text-on-surface-variant">
        {showImage ? (
          <img
            src={item.imageUrl ?? undefined}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Icon name="inventory_2" className="text-[24px]" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-label-lg text-on-surface">{item.name}</p>
        {item.recommendation !== undefined ? (
          <RecommendationBadge recommendation={item.recommendation} />
        ) : remaining !== undefined ? (
          <span
            className={`self-start rounded px-1.5 py-0.5 text-label-sm ${
              urgent
                ? 'bg-error-container text-on-error-container'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {formatDday(remaining)}
          </span>
        ) : null}
      </div>
      <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
    </button>
  )
}
