import { useState } from 'react'
import { DdayLabel } from './Badge'
import type { Item } from '../types'
import { Icon } from '../data/materialIcons'
import { RecommendationBadge } from './RecommendationBadge'
import { getRemainingDays } from '../state/selectors'

export function ItemCard({ item, onClick }: { item: Item; onClick: () => void }) {
  const remaining = getRemainingDays(item)
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(item.imageUrl) && !imageFailed
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl bg-surface-container-lowest p-space-md text-left border border-hairline shadow-card"
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
          <DdayLabel days={remaining} />
        ) : null}
      </div>
      <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
    </button>
  )
}
