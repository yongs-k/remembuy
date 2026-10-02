import type { Item } from '../types'
import { Icon } from '../data/materialIcons'
import { RecommendationBadge } from './RecommendationBadge'
import { DdayLabel } from './Badge'
import { ItemThumb } from './ItemThumb'
import { getSoonestRemaining } from '../state/selectors'
import { usePendingPurchases } from '../hooks/usePendingPurchases'

/** Where 구매하기 goes: the item's own purchase link, else a shopping search for its name. */
export function buyUrl(item: Item): string {
  return item.affiliateUrl || `https://www.coupang.com/np/search?q=${encodeURIComponent(item.name)}`
}

export function PodiumItemCard({
  item,
  index,
  onOpen,
  onAssign,
}: {
  item: Item
  /** Position in the category ranking; the first three are shown as 1등·2등·3등. */
  index: number
  onOpen: () => void
  onAssign: (rank: 1 | 2 | 3 | null) => void
}) {
  const pendingPurchases = usePendingPurchases()
  const place = index < 3 ? index + 1 : null
  const compact = place === null
  const remaining = getSoonestRemaining(item)

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface-container-lowest shadow-card">
      <button
        type="button"
        onClick={onOpen}
        className={`flex w-full items-start gap-space-md text-left transition-colors hover:bg-surface-container-low ${
          compact ? 'p-space-sm' : 'p-space-md'
        }`}
      >
        {place !== null && (
          <span
            className={`w-9 shrink-0 pt-0.5 font-heading tabular-nums text-on-surface ${
              place === 1 ? 'text-headline-lg' : 'text-headline-md'
            }`}
          >
            {place}등
          </span>
        )}
        <ItemThumb item={item} className={compact ? 'h-12 w-12' : place === 1 ? 'h-20 w-20' : 'h-16 w-16'} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span
            className={`line-clamp-2 font-heading text-on-surface ${compact ? 'text-label-lg' : 'text-headline-md'}`}
          >
            {item.name}
          </span>
          <span className="flex flex-wrap items-center gap-2">
            {item.recommendation !== undefined && <RecommendationBadge recommendation={item.recommendation} />}
            {remaining !== undefined && <DdayLabel days={remaining} />}
          </span>
          {!compact && item.price !== undefined && (
            <span className="text-body-sm tabular-nums text-on-surface-variant">
              지난 구매 {item.price.toLocaleString()}원{item.place ? ` · ${item.place}` : ''}
            </span>
          )}
        </span>
      </button>
      <div className="flex items-center justify-between gap-2 border-t border-hairline py-1 pl-space-md pr-1">
        <a
          href={buyUrl(item)}
          target="_blank"
          rel="noopener noreferrer"
          // Only a real purchase link can later be confirmed with 구매 완료.
          onClick={() => item.affiliateUrl && pendingPurchases.markOpened(item.id)}
          className="flex min-h-11 items-center gap-1 rounded-lg border border-hairline px-3 text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
        >
          <Icon name="shopping_cart" className="text-[18px]" />
          구매하기
        </a>
        <div className="flex items-center">
          <span className="mr-1 text-label-sm text-on-surface-variant">순위 지정</span>
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
                      ? 'bg-on-surface text-surface'
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
