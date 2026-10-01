import { useEffect } from 'react'
import { useLocker } from '../state/LockerContext'

const VISIBLE_MS = 6000

/** "재구매로 기록했어요 · 되돌리기" after each recorded purchase, so a stray tap never trains the cycle. */
export function PurchaseUndoToast() {
  const { lastPurchase, undoLastPurchase, dismissLastPurchase } = useLocker()

  useEffect(() => {
    if (!lastPurchase) return
    const timer = setTimeout(dismissLastPurchase, VISIBLE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastPurchase])

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 mx-auto flex max-w-3xl justify-center px-margin"
    >
      {lastPurchase && (
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-space-sm rounded-xl bg-on-surface py-1 pl-space-md pr-1 text-surface shadow-float">
          <span className="min-w-0 flex-1 truncate text-body-md">{lastPurchase.name} 재구매로 기록했어요</span>
          <button
            type="button"
            onClick={undoLastPurchase}
            className="min-h-11 shrink-0 rounded-lg px-3 text-label-lg text-inverse-primary hover:bg-surface/10"
          >
            되돌리기
          </button>
        </div>
      )}
    </div>
  )
}
