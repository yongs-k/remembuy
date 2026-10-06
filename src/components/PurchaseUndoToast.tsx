import { useEffect, useState } from 'react'
import { useLocker } from '../state/LockerContext'
import { Sheet } from './Sheet'

// Long enough to read and reach; paused while hovered or focused (WCAG 2.2.1).
const VISIBLE_MS = 10000

type Editing = { id: string; name: string; date: string; price: string; place: string; lastPrice?: number }

/**
 * After each recorded purchase: "다시 산 걸로 기록했어요 · 가격 입력 · 되돌리기".
 * Undo keeps stray taps out of the learned cycle; 가격 입력 optionally adds the
 * price and store for that purchase without slowing down the one-tap record.
 */
export function PurchaseUndoToast() {
  const { items, lastPurchase, undoLastPurchase, dismissLastPurchase, recordPurchaseDetails } = useLocker()
  const [editing, setEditing] = useState<Editing | null>(null)
  const [paused, setPaused] = useState(false)

  // A toast removed while hovered (e.g. by 되돌리기) must not leave the next one paused.
  useEffect(() => {
    if (!lastPurchase) setPaused(false)
  }, [lastPurchase])

  useEffect(() => {
    if (!lastPurchase || paused) return
    const timer = setTimeout(dismissLastPurchase, VISIBLE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastPurchase, paused])

  function openDetails() {
    if (!lastPurchase) return
    const item = items.find((i) => i.id === lastPurchase.id)
    // Copy what the sheet needs; the toast (and lastPurchase) goes away now.
    setEditing({
      id: lastPurchase.id,
      name: lastPurchase.name,
      date: lastPurchase.date,
      price: item?.price !== undefined ? String(item.price) : '',
      lastPrice: item?.price,
      place: item?.place ?? '',
    })
    dismissLastPurchase()
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    const price = editing.price.trim() === '' ? undefined : Number(editing.price)
    recordPurchaseDetails(editing.id, editing.date, {
      ...(price !== undefined && Number.isFinite(price) && price >= 0 && { price }),
      ...(editing.place.trim() && { place: editing.place.trim() }),
    })
    setEditing(null)
  }

  const inputCls =
    'mt-1 w-full rounded-lg border-2 border-transparent bg-surface-container-low p-2.5 text-body-lg font-normal text-on-surface focus:border-primary focus:outline-none'

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 mx-auto flex max-w-3xl justify-center px-margin"
      >
        {lastPurchase && (
          <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className="pointer-events-auto flex w-full max-w-md items-center gap-1 rounded-xl bg-on-surface py-1 pl-space-md pr-1 text-surface shadow-float">
            {/* Two lines so the item name isn't cut off beside the two actions. */}
            <span className="flex min-w-0 flex-1 flex-col py-1">
              <span className="truncate text-label-lg">{lastPurchase.name}</span>
              <span className="text-body-sm text-surface/70">다시 산 걸로 기록했어요</span>
            </span>
            <button
              type="button"
              onClick={openDetails}
              className="min-h-11 shrink-0 rounded-lg px-2.5 text-label-lg text-surface hover:bg-surface/10"
            >
              가격 입력
            </button>
            <button
              type="button"
              onClick={undoLastPurchase}
              className="min-h-11 shrink-0 rounded-lg px-2.5 text-label-lg text-inverse-primary hover:bg-surface/10"
            >
              되돌리기
            </button>
          </div>
        )}
      </div>

      {editing && (
        <Sheet labelledBy="purchase-details-title" onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-space-sm">
            <h2 id="purchase-details-title" className="text-center text-label-lg text-on-surface">
              이번 구매 정보 <span className="font-normal text-on-surface-variant">(선택)</span>
            </h2>
            <p className="text-center text-body-sm text-on-surface-variant">{editing.name}</p>
            <label className="block text-label-md text-on-surface-variant">
              가격 (원)
              <input
                data-autofocus
                type="number"
                inputMode="numeric"
                min={0}
                value={editing.price}
                onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                className={inputCls}
              />
            </label>
            {editing.lastPrice !== undefined && (
              <p className="rounded-xl bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">
                지난 가격 {editing.lastPrice.toLocaleString()}원
                {(() => {
                  const now = Number(editing.price)
                  const saved = editing.price.trim() !== '' && Number.isFinite(now) ? editing.lastPrice - now : 0
                  return saved > 0 ? (
                    <strong className="ml-1 text-on-surface">· {saved.toLocaleString()}원 아껴서 +{saved.toLocaleString()}P</strong>
                  ) : (
                    ' · 더 싸게 샀다면 차액만큼 포인트를 받아요'
                  )
                })()}
              </p>
            )}
            <label className="block text-label-md text-on-surface-variant">
              구매처
              <input
                value={editing.place}
                onChange={(e) => setEditing({ ...editing, place: e.target.value })}
                placeholder="예: 쿠팡"
                className={inputCls}
              />
            </label>
            <button
              type="submit"
              className="min-h-12 w-full rounded-xl bg-primary text-label-lg text-on-primary active:scale-[0.98]"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="min-h-11 w-full text-center text-body-md text-on-surface-variant"
            >
              건너뛰기
            </button>
          </form>
        </Sheet>
      )}
    </>
  )
}
