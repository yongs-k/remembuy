import { useNavigate } from 'react-router-dom'
import { DdayLabel } from './Badge'
import { ItemThumb } from './ItemThumb'
import type { Item } from '../types'
import { useLocker } from '../state/LockerContext'
import { usePendingPurchases } from '../hooks/usePendingPurchases'
import { getSoonestRemaining } from '../state/selectors'
import { Icon } from '../data/materialIcons'

/** One row of a restock list; the parent <ul> draws the card and dividers. */
export function RestockCard({
  item,
  showLastPurchase = false,
  isNew = false,
}: {
  item: Item
  showLastPurchase?: boolean
  /** Newly due since the user last looked (bell page). */
  isNew?: boolean
}) {
  const { recordPurchase } = useLocker()
  const pendingPurchases = usePendingPurchases()
  const navigate = useNavigate()
  const remaining = getSoonestRemaining(item)
  const dueSoon = remaining !== undefined && remaining <= 7
  // Items with a purchase link are only recorded after the link was used (구매 완료);
  // items without one keep the plain 다시 샀어요.
  const awaitingConfirm = Boolean(item.affiliateUrl) && pendingPurchases.isPending(item.id)
  const canRestock = dueSoon && !item.affiliateUrl
  const lastPurchase = [item.price !== undefined && `${item.price.toLocaleString()}원`, item.place]
    .filter(Boolean)
    .join(' · ')
  const hasActions = canRestock || Boolean(item.affiliateUrl)

  return (
    <li className="flex items-center gap-1.5 py-1 pl-space-md pr-2">
      <button
        type="button"
        onClick={() => navigate(`/item/${item.id}`)}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 text-left"
      >
        <ItemThumb item={item} />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-baseline gap-1.5">
            {isNew && <span className="shrink-0 text-label-sm text-primary">새로</span>}
            <span className="truncate text-label-lg text-on-surface">{item.name}</span>
          </span>
          {showLastPurchase && lastPurchase && (
            <span className="block truncate text-body-sm text-on-surface-variant">지난 구매 {lastPurchase}</span>
          )}
        </span>
        {remaining !== undefined && <DdayLabel days={remaining} />}
        {!hasActions && <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />}
      </button>
      {canRestock && (
        <button
          type="button"
          onClick={() => recordPurchase(item.id)}
          className="min-h-11 shrink-0 rounded-lg border border-hairline px-2.5 text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
        >
          다시 샀어요
        </button>
      )}
      {awaitingConfirm && (
        <button
          type="button"
          onClick={() => {
            recordPurchase(item.id)
            pendingPurchases.clear(item.id)
          }}
          className="min-h-11 shrink-0 rounded-lg border border-hairline px-2.5 text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
        >
          구매 완료
        </button>
      )}
      {item.affiliateUrl && !awaitingConfirm && (
        <a
          href={item.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => pendingPurchases.markOpened(item.id)}
          aria-label={`${item.name} 구매하기`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary active:scale-[0.98]"
        >
          <Icon name="shopping_cart" className="text-[20px]" />
        </a>
      )}
    </li>
  )
}
