import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DdayLabel } from './Badge'
import { ItemThumb } from './ItemThumb'
import type { Item } from '../types'
import { useLocker } from '../state/LockerContext'
import { usePendingPurchases } from '../hooks/usePendingPurchases'
import { getSoonestRemaining } from '../state/selectors'
import { Icon } from '../data/materialIcons'
import { Sheet } from './Sheet'
import { SampleTag } from './Badge'
import { buyUrl } from './PodiumItemCard'

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
  const [rebuying, setRebuying] = useState(false)
  const remaining = getSoonestRemaining(item)
  const lastPurchase = [item.price !== undefined && `${item.price.toLocaleString()}원`, item.place]
    .filter(Boolean)
    .join(' · ')
  const titleId = `rebuy-${item.id}`
  // The action appears only when it's time; further-off rows just open the item.
  const due = remaining !== undefined && remaining <= 7

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
            {/* Two lines before cutting: the D-day and 재구매하기 leave the name little room. */}
            <span className="line-clamp-2 text-label-lg text-on-surface">{item.name}</span>
          </span>
          {(item.id.startsWith('seed-') || (showLastPurchase && lastPurchase)) && (
            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-body-sm text-on-surface-variant">
              {item.id.startsWith('seed-') && <SampleTag />}
              {showLastPurchase && lastPurchase && <span className="truncate">지난 구매 {lastPurchase}</span>}
            </span>
          )}
        </span>
        {remaining !== undefined && <DdayLabel days={remaining} />}
        {!due && <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />}
      </button>
      {due && (
      <button
        type="button"
        onClick={() => setRebuying(true)}
        className="min-h-11 shrink-0 rounded-lg border border-hairline px-2.5 text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
      >
        재구매하기
      </button>
      )}
      {rebuying && (
        <Sheet labelledBy={titleId} onClose={() => setRebuying(false)}>
          <div className="space-y-0.5 pb-1 text-center">
            <h2 id={titleId} className="text-label-lg text-on-surface">
              {item.name}
            </h2>
            {lastPurchase && <p className="text-body-sm text-on-surface-variant">지난 구매 {lastPurchase}</p>}
          </div>
          <a
            href={buyUrl(item)}
            target="_blank"
            rel="noopener noreferrer"
            data-autofocus
            onClick={() => {
              // Only a saved link counts toward the item page's 구매 완료 prompt.
              if (item.affiliateUrl) pendingPurchases.markOpened(item.id)
              setRebuying(false)
            }}
            className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-label-lg text-on-primary active:scale-[0.98]"
          >
            <Icon name="shopping_cart" className="text-[18px]" />
            구매하러 가기
          </a>
          {!item.affiliateUrl && (
            <p className="text-center text-body-sm text-on-surface-variant">저장된 링크가 없어 쿠팡 검색으로 열어요.</p>
          )}
          <button
            type="button"
            onClick={() => {
              recordPurchase(item.id)
              pendingPurchases.clear(item.id)
              setRebuying(false)
            }}
            className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-hairline text-label-lg text-on-surface transition-colors hover:bg-surface-container-low active:scale-[0.98]"
          >
            <Icon name="check" className="text-[18px]" />
            재구매 완료
          </button>
          <button
            type="button"
            onClick={() => setRebuying(false)}
            className="min-h-11 w-full text-center text-body-md text-on-surface-variant"
          >
            취소
          </button>
        </Sheet>
      )}
    </li>
  )
}
