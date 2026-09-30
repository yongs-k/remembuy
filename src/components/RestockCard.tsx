import { useNavigate } from 'react-router-dom'
import { DdayLabel } from './Badge'
import { ItemThumb } from './ItemThumb'
import type { Item } from '../types'
import { useLocker } from '../state/LockerContext'
import { getSoonestRemaining, getRestockDueDays } from '../state/selectors'
import { Icon } from '../data/materialIcons'

/** One row of a restock list; the parent <ul> draws the card and dividers. */
export function RestockCard({ item, showLastPurchase = false }: { item: Item; showLastPurchase?: boolean }) {
  const { updateItem } = useLocker()
  const navigate = useNavigate()
  const remaining = getSoonestRemaining(item)
  const due = getRestockDueDays(item)
  const canRestock = due !== undefined && due <= 7
  const lastPurchase = [item.price !== undefined && `${item.price.toLocaleString()}원`, item.place]
    .filter(Boolean)
    .join(' · ')

  return (
    <li className="px-space-md py-2">
      <button
        type="button"
        onClick={() => navigate(`/item/${item.id}`)}
        className="flex min-h-14 w-full items-center gap-3 text-left"
      >
        <ItemThumb item={item} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-label-lg text-on-surface">{item.name}</p>
          {showLastPurchase && lastPurchase && (
            <p className="truncate text-body-sm text-on-surface-variant">지난 구매 {lastPurchase}</p>
          )}
        </div>
        {remaining !== undefined && <DdayLabel days={remaining} />}
        <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
      </button>
      {(canRestock || item.affiliateUrl) && (
        <div className="flex gap-2 pb-1 pl-[3.75rem]">
          {canRestock && (
            <button
              type="button"
              onClick={() => updateItem(item.id, { restockedAt: new Date().toISOString().slice(0, 10) })}
              className="min-h-11 rounded-lg border border-hairline px-3 text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
            >
              재구매함
            </button>
          )}
          {item.affiliateUrl && (
            <a
              href={item.affiliateUrl}
              className="flex min-h-11 items-center rounded-lg bg-primary px-3 text-label-md text-on-primary active:scale-[0.98]"
            >
              구매하기
            </a>
          )}
        </div>
      )}
    </li>
  )
}
