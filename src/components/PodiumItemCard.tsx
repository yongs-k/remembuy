import type { Item } from '../types'
import { Icon } from '../data/materialIcons'
import { RecommendationBadge } from './RecommendationBadge'
import { Badge, DdayLabel } from './Badge'
import { ItemThumb } from './ItemThumb'
import { getSoonestRemaining } from '../state/selectors'

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
  // The ranking sorts recommended items first; only call it 추천 1위 when it really is recommended.
  const isFirst = index === 0 && item.recommendation === 'recommend'
  const compact = index >= 3
  const remaining = getSoonestRemaining(item)

  return (
    <div
      className={`overflow-hidden rounded-xl bg-surface-container-lowest ${
        isFirst
          ? 'border border-primary/30 shadow-card'
          : 'border border-hairline shadow-card'
      }`}
    >
      {isFirst && (
        <div className="flex items-center gap-1.5 bg-primary-container px-space-md py-1.5 text-on-primary-container">
          <Icon name="workspace_premium" className="text-[18px] text-tertiary-fixed" />
          <span className="text-label-md tracking-wider">추천한 상품</span>
        </div>
      )}
      <button
        type="button"
        onClick={onOpen}
        className={`flex w-full gap-space-md text-left transition-colors hover:bg-surface-container-low ${compact ? 'p-space-sm' : 'p-space-md'}`}
      >
        <div
          className={`relative shrink-0 ${
            compact ? 'h-12 w-12' : isFirst ? 'h-24 w-20' : 'h-20 w-16'
          }`}
        >
          {/* No positional number here: the user's own 순위 지정 below is the rank that matters. */}
          <ItemThumb item={item} className="h-full w-full" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {remaining !== undefined && (
              <DdayLabel days={remaining} />
            )}
            {item.podiumRank === 1 && <Badge>내 1위</Badge>}
          </div>
          <p
            className={`line-clamp-2 font-heading text-on-surface ${
              compact ? 'text-label-lg' : 'text-headline-md'
            }`}
          >
            {item.name}
          </p>
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
      </button>
      <div className="flex items-center justify-between border-t border-surface-container-high px-space-md py-1">
        <span className="text-label-sm text-on-surface-variant">순위 지정</span>
        <div className="-mr-1.5 flex">
          {([1, 2, 3] as const).map((rank) => {
            const isAssigned = item.podiumRank === rank
            return (
              <button
                key={rank}
                type="button"
                onClick={() => onAssign(isAssigned ? null : rank)}
                aria-pressed={isAssigned}
                aria-label={`${rank}등으로 지정`}
                className="group flex h-11 w-11 items-center justify-center"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-label-md tabular-nums transition-colors ${
                    isAssigned
                      ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                      : 'border border-hairline text-on-surface-variant group-hover:bg-surface-container-low'
                  }`}
                >
                  {rank}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
