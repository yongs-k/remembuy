import type { Item } from '../types'
import { RecommendationBadge } from './RecommendationBadge'

export function ItemCard({ item, onClick }: { item: Item; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="chunky-btn flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded bg-paper text-xl">
        🧴
      </div>
      <div className="flex-1">
        <p className="font-medium">{item.name}</p>
        {item.recommendation !== undefined ? (
          <RecommendationBadge recommendation={item.recommendation} />
        ) : item.daysUntilEmpty !== undefined ? (
          <span className="text-sm text-warn">D-{item.daysUntilEmpty}</span>
        ) : null}
      </div>
    </button>
  )
}
