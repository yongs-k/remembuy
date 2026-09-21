import { Icon } from '../data/materialIcons'
import type { DummyParty } from '../data/purchaseDummy'

export function GroupBuyCard({
  party,
  variant,
  onAction,
}: {
  party: DummyParty
  variant: 'featured' | 'compact'
  onAction: () => void
}) {
  const percent = Math.round((party.joined / party.target) * 100)

  if (variant === 'compact') {
    return (
      <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]">
        <div className="flex items-start justify-between gap-space-sm">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-label-sm text-secondary">
              {party.joined}/{party.target}명 모집중
            </span>
            <h4 className="line-clamp-2 font-heading text-label-lg text-on-surface">{party.name}</h4>
            <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
              <span className="font-heading text-headline-md text-on-surface">
                {party.price.toLocaleString()}원
              </span>
              {party.originalPrice !== undefined && (
                <span className="text-body-sm text-on-surface-variant line-through">
                  {party.originalPrice.toLocaleString()}원
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {party.note && <span className="text-label-sm text-on-surface-variant">{party.note}</span>}
            <button
              type="button"
              onClick={onAction}
              className="rounded-lg bg-surface-container-high px-3 py-1.5 text-label-sm text-on-surface shadow-[0_2px_0px_#e1bfb8] active:translate-y-0.5"
            >
              {party.cta}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-[0_4px_12px_rgba(170,48,21,0.08),0_3px_0px_rgba(43,38,37,0.1)]">
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {party.urgency && (
            <span className="rounded bg-primary px-1.5 py-0.5 text-label-sm text-on-primary">
              {party.urgency}
            </span>
          )}
          {party.region && <span className="text-label-sm text-on-surface-variant">{party.region}</span>}
        </div>
        {party.countdown && (
          <span className="flex shrink-0 items-center gap-0.5 text-label-sm text-primary">
            <Icon name="hourglass_top" className="text-[14px]" />
            {party.countdown}
          </span>
        )}
      </div>
      <div className="flex gap-space-md">
        <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
          <Icon name="inventory_2" className="text-[28px]" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h4 className="line-clamp-2 font-heading text-headline-md text-on-surface">{party.name}</h4>
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="font-heading text-headline-lg text-primary">
              {party.price.toLocaleString()}원
            </span>
            {party.saving && <span className="text-label-sm text-secondary">{party.saving}</span>}
          </div>
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex -space-x-1.5">
            {Array.from({ length: party.target }, (_, i) => {
              const filled = i < party.joined
              return (
                <span
                  key={i}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface-container-lowest text-[9px] font-bold ${
                    filled
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-surface-container-high text-outline'
                  }`}
                >
                  {filled ? (i === 0 ? '방장' : `${i + 1}번`) : '?'}
                </span>
              )
            })}
          </div>
          <span className="text-label-sm text-on-surface-variant">
            {party.joined} / {party.target}명 달성 ({percent}%)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary p-3 text-label-lg text-on-primary shadow-[0_4px_0px_#8b1901] active:translate-y-0.5 active:shadow-[0_1px_0px_#8b1901]"
      >
        <Icon name="group_add" className="text-[18px]" />
        {party.cta}
      </button>
    </div>
  )
}
