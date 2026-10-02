import { useEffect, useRef, useState } from 'react'
import { Icon } from '../data/materialIcons'
import { useModalDialog } from './Sheet'

const CONFETTI = [
  { left: '20%', color: '#ffb95f', delay: '0s' },
  { left: '70%', color: '#f9eeec', delay: '0.3s' },
  { left: '40%', color: '#ffddb8', delay: '0.6s' },
  { left: '85%', color: '#ffb95f', delay: '0.9s' },
]

export function CompletionCelebration({
  itemName,
  icon,
  pointsAwarded,
  dexBefore,
  dexAfter,
  locationName,
  onDismiss,
}: {
  itemName: string
  icon: string
  pointsAwarded: number
  dexBefore: number
  dexAfter: number
  locationName: string
  onDismiss: () => void
}) {
  const hasGain = dexAfter > dexBefore
  const [barGrown, setBarGrown] = useState(false)
  const ref = useRef<HTMLDialogElement>(null)
  useModalDialog(ref)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setBarGrown(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <dialog
      ref={ref}
      aria-label="기록 완료"
      onClick={onDismiss}
      onCancel={(e) => {
        e.preventDefault()
        onDismiss()
      }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none cursor-pointer overflow-y-auto bg-inverse-surface text-inverse-on-surface"
    >
      <div className="relative mx-auto flex min-h-full w-full max-w-sm flex-col items-center justify-center gap-space-sm p-margin">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {CONFETTI.map((c) => (
            <span
              key={c.left}
              className="absolute top-0 h-3.5 w-2 animate-confetti-fall opacity-0"
              style={{ left: c.left, backgroundColor: c.color, animationDelay: c.delay }}
            />
          ))}
        </div>

        <div className="relative h-[180px] w-[180px] shrink-0">
          <div className="absolute inset-0 animate-burst-pop rounded-full bg-[radial-gradient(circle,rgba(255,185,95,0.35),transparent_65%)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-[72px] w-[72px] animate-badge-bounce items-center justify-center rounded-full bg-tertiary-fixed-dim text-on-tertiary-fixed shadow-[0_0_30px_rgba(255,185,95,0.5)]">
              <Icon name={icon} className="text-[34px]" />
            </div>
          </div>
        </div>

        <h2 className="text-headline-lg font-extrabold">{hasGain ? '도감 등록 완료!' : '기록 완료!'}</h2>
        <p className="text-body-sm text-outline-variant">{itemName}</p>

        {pointsAwarded > 0 && (
          <p className="mt-1 animate-point-in text-headline-md font-extrabold text-tertiary-fixed-dim opacity-0">
            +{pointsAwarded}P 획득
          </p>
        )}

        {hasGain && (
          <div className="mt-2 w-full max-w-[200px] shrink-0">
            <div className="mb-1 flex justify-between text-label-sm text-outline-variant">
              <span>{locationName} 도감 수집률</span>
              <span>
                {dexBefore}% → {dexAfter}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-tertiary-fixed-dim transition-[width] duration-1000 ease-out"
                style={{ width: `${barGrown ? dexAfter : dexBefore}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          data-autofocus
          onClick={onDismiss}
          className="mt-space-lg min-h-11 rounded-xl border border-white/25 px-space-xl text-label-lg text-white transition-colors hover:bg-white/10"
        >
          확인
        </button>
      </div>
    </dialog>
  )
}
