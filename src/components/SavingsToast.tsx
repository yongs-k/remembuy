import { useEffect } from 'react'
import { useGame } from '../state/GameContext'
import { Icon } from '../data/materialIcons'

/** 재구매 할인 보상: "N원 아껴서 +NP" in the cabinet tone, after a cheaper repurchase is saved. */
export function SavingsToast() {
  const { savings, dismissSavings } = useGame()

  useEffect(() => {
    if (!savings) return
    const timer = window.setTimeout(() => dismissSavings?.(), 6000)
    return () => window.clearTimeout(timer)
  }, [savings, dismissSavings])

  if (!savings) return null
  const first = savings.paid[0]
  const more = savings.paid.length - 1

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 mx-auto flex max-w-3xl justify-center px-4">
      <div
        role="status"
        className="animate-badge-bounce pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-inverse-surface px-space-md py-3 text-inverse-on-surface shadow-float"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tertiary-fixed-dim text-on-tertiary-fixed">
          <Icon name="savings" className="text-[22px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-label-lg">
            더 싸게 샀어요! <span className="text-tertiary-fixed-dim">+{savings.points.toLocaleString()}P</span>
          </span>
          <span className="block truncate text-body-sm text-inverse-on-surface/70">
            {first.name} {first.from.toLocaleString()}원 → {first.to.toLocaleString()}원
            {more > 0 && ` 외 ${more}건`}
          </span>
        </span>
        <button
          type="button"
          onClick={() => dismissSavings?.()}
          aria-label="닫기"
          className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-inverse-on-surface/70"
        >
          <Icon name="close" className="text-[20px]" />
        </button>
      </div>
    </div>
  )
}
