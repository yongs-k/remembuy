import { useNavigate } from 'react-router-dom'
import { DdayLabel } from './Badge'
import type { Item } from '../types'
import { useLocker } from '../state/LockerContext'
import { getSoonestRemaining, getRestockDueDays } from '../state/selectors'
import { Icon } from '../data/materialIcons'

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
    <li className="rounded-xl bg-surface-container-lowest p-space-md border border-hairline shadow-card">
      <div className="flex items-center gap-space-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
          <Icon name="inventory_2" className="text-[22px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-label-lg text-on-surface">{item.name}</p>
          {showLastPurchase && lastPurchase && (
            <p className="truncate text-body-sm text-on-surface-variant">지난 구매 {lastPurchase}</p>
          )}
        </div>
        {remaining !== undefined && <DdayLabel days={remaining} />}
      </div>
      <div className="mt-space-sm flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(`/item/${item.id}`)}
          className="rounded-lg bg-surface-container-high px-3 py-1.5 text-label-md text-on-surface"
        >
          상세보기
        </button>
        {canRestock && (
          <button
            type="button"
            onClick={() => updateItem(item.id, { restockedAt: new Date().toISOString().slice(0, 10) })}
            className="rounded-lg bg-surface-container-high px-3 py-1.5 text-label-md text-on-surface"
          >
            재구매함
          </button>
        )}
        {item.affiliateUrl && (
          <a
            href={item.affiliateUrl}
            className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-label-md text-on-primary active:scale-[0.98]"
          >
            구매하기
          </a>
        )}
      </div>
    </li>
  )
}
