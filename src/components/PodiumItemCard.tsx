import type { Item } from '../types'
import { Icon } from '../data/materialIcons'
import { RecommendationBadge } from './RecommendationBadge'
import { Badge } from './Badge'

const RANK_CHIP = [
  'bg-tertiary text-on-tertiary',
  'bg-secondary text-on-secondary',
  'bg-tertiary-container text-on-tertiary-container',
]

export function PodiumItemCard({
  item,
  index,
  onOpen,
  onAssign,
}: {
  item: Item
  index: number
  onOpen: () => void
  onAssign: (rank: 1 | 2 | 3 | null) => void
}) {
  const isFirst = index === 0
  const compact = index >= 3
  const urgent = item.daysUntilEmpty !== undefined && item.daysUntilEmpty <= 7
  const chip = RANK_CHIP[index] ?? 'bg-surface-container-high text-outline'

  return (
    <div
      onClick={onOpen}
      className={`cursor-pointer overflow-hidden rounded-xl bg-surface-container-lowest ${
        isFirst
          ? 'border-2 border-primary/20 shadow-[0_4px_12px_rgba(170,48,21,0.08),0_3px_0px_rgba(43,38,37,0.1)]'
          : 'shadow-[0_3px_0px_rgba(43,38,37,0.08)]'
      }`}
    >
      {isFirst && (
        <div className="flex items-center gap-1.5 bg-primary-container px-space-md py-1.5 text-on-primary-container">
          <Icon name="workspace_premium" className="text-[18px] text-tertiary-fixed" />
          <span className="text-label-md tracking-wider">1ST PLACE</span>
        </div>
      )}
      <div className={`flex gap-space-md ${compact ? 'p-space-sm' : 'p-space-md'}`}>
        <div
          className={`relative flex shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant ${
            compact ? 'h-12 w-12' : isFirst ? 'h-24 w-20' : 'h-20 w-16'
          }`}
        >
          <Icon name="inventory_2" className="text-[28px]" />
          <span
            className={`absolute left-1 top-1 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-label-sm ${chip}`}
          >
            {index + 1}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {item.daysUntilEmpty !== undefined && (
              <span
                className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-label-sm ${
                  urgent
                    ? 'bg-error-container text-on-error-container'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <Icon name="alarm" className="text-[12px]" />
                D-{item.daysUntilEmpty}
                {urgent ? ' 소진임박' : ''}
              </span>
            )}
            {item.podiumRank === 1 && <Badge>다시 살래요</Badge>}
          </div>
          <h3
            className={`truncate font-heading text-on-surface ${
              compact ? 'text-label-lg' : 'text-headline-md'
            }`}
          >
            {item.name}
          </h3>
          {item.recommendation !== undefined && (
            <RecommendationBadge recommendation={item.recommendation} />
          )}
          {!compact && (item.price !== undefined || item.restockCycle) && (
            <p className="text-body-sm text-on-surface-variant">
              {item.restockCycle ? `재구매 주기: ${item.restockCycle}` : ''}
              {item.restockCycle && item.price !== undefined ? ' · ' : ''}
              {item.price !== undefined ? `이전 구매가 ${item.price.toLocaleString()}원` : ''}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-surface-container-high px-space-md py-1.5">
        <span className="text-label-sm text-on-surface-variant">순위 지정</span>
        <div className="flex gap-1.5">
          {([1, 2, 3] as const).map((rank) => {
            const isAssigned = item.podiumRank === rank
            return (
              <button
                key={rank}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onAssign(isAssigned ? null : rank)
                }}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-label-md ${
                  isAssigned
                    ? 'bg-tertiary-fixed text-tertiary shadow-[0_2px_0px_#a36700]'
                    : 'bg-surface-container-high text-outline'
                }`}
                aria-label={`${rank}등으로 지정`}
              >
                {rank}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
