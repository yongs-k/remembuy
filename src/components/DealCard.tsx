import { Icon } from '../data/materialIcons'
import { percentOff, type DummyDeal } from '../data/purchaseDummy'

export function DealCard({ deal, onAction }: { deal: DummyDeal; onAction: () => void }) {
  const off = percentOff(deal.originalPrice, deal.price)

  return (
    <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]">
      <div className="mb-space-sm flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded bg-tertiary-fixed px-1.5 py-0.5 text-label-sm text-on-tertiary-fixed">
            {deal.badge}
          </span>
          <span className="rounded bg-secondary-container px-1.5 py-0.5 text-label-sm text-on-secondary-container">
            {deal.tag}
          </span>
        </div>
        {deal.aside && <span className="text-label-sm text-primary">{deal.aside}</span>}
      </div>
      <div className="flex gap-space-md">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
          <Icon name="inventory_2" className="text-[26px]" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h4 className="line-clamp-2 font-heading text-label-lg text-on-surface">{deal.name}</h4>
          <p className="text-body-sm text-on-surface-variant">{deal.subtitle}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
            <span className="font-heading text-headline-md text-primary">{deal.price.toLocaleString()}원</span>
            <span className="text-label-sm text-primary">{off}% OFF</span>
            <span className="text-body-sm text-on-surface-variant line-through">
              {deal.originalPrice.toLocaleString()}원
            </span>
          </div>
        </div>
      </div>
      <div className="mt-space-sm flex items-center justify-between gap-space-sm border-t border-surface-container-high pt-space-sm">
        <span className="flex min-w-0 items-center gap-1 text-label-sm text-on-surface-variant">
          <Icon name="confirmation_number" className="text-[14px]" />
          <span className="truncate">{deal.footnote}</span>
        </span>
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-label-sm text-on-primary shadow-[0_2px_0px_#8b1901] active:translate-y-0.5"
        >
          {deal.cta}
        </button>
      </div>
    </div>
  )
}
