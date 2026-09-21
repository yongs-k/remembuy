import { Icon } from '../data/materialIcons'
import { DUMMY_BUTLER, percentOff } from '../data/purchaseDummy'

export function ButlerHero({
  greetingName,
  itemName,
  locationName,
  daysUntilEmpty,
  onAction,
}: {
  greetingName: string
  itemName: string
  locationName: string
  daysUntilEmpty: number
  onAction: () => void
}) {
  const B = DUMMY_BUTLER
  const off = percentOff(B.originalPrice, B.price)

  return (
    <section className="space-y-space-sm">
      <div className="flex items-start gap-space-sm rounded-2xl bg-secondary-container/40 p-space-md">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-on-secondary shadow-[0_2px_0px_#304c46]">
          <Icon name="smart_toy" className="text-[22px]" />
        </div>
        <div className="min-w-0">
          <span className="flex flex-wrap items-center gap-1 text-label-sm text-secondary">
            AI 리멤버 비서
            <span className="rounded bg-secondary-container px-1.5 py-0.5 text-on-secondary-container">
              스마트 리더 ON
            </span>
          </span>
          <p className="mt-1 text-body-md text-on-surface">
            {greetingName}, {locationName} 도감의 {itemName} —{' '}
            <strong className="text-primary">{daysUntilEmpty}일 뒤</strong> 바닥나요! 지금 역대 최저가
            근접이라 미리 채워두는 걸 추천해요.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-surface-container-lowest p-space-md shadow-[0_4px_0px_#e1bfb8]">
        <div className="flex items-center justify-between gap-space-sm">
          <div className="flex min-w-0 items-center gap-1.5 text-label-sm">
            <span className="rounded bg-tertiary-fixed px-1.5 py-0.5 text-on-tertiary-fixed">
              {B.rankTag}
            </span>
            <span className="truncate text-on-surface-variant">
              {locationName} {B.slotLabel}
            </span>
          </div>
          <span className="flex shrink-0 items-center gap-0.5 rounded bg-error-container px-1.5 py-0.5 text-label-sm text-on-error-container">
            <Icon name="alarm" className="text-[12px]" />D-{daysUntilEmpty} 소진임박
          </span>
        </div>

        <div className="mt-space-sm flex gap-space-md">
          <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
            <Icon name="inventory_2" className="text-[28px]" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="line-clamp-2 font-heading text-headline-md text-on-surface">{itemName}</h3>
            <p className="text-body-sm text-on-surface-variant">
              평균 소모 주기 {B.cycleDays}일 기준 · 잔여 {B.remainPercent}% ({B.remainText})
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
              <div className="h-full rounded-full bg-primary" style={{ width: `${B.remainPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-space-sm flex flex-wrap items-baseline gap-2 rounded-lg bg-surface-container-low p-space-sm">
          <span className="font-heading text-headline-lg text-primary">{B.price.toLocaleString()}원</span>
          <span className="rounded bg-error-container px-1.5 py-0.5 text-label-sm text-on-error-container">
            {off}% 할인
          </span>
          <span className="text-body-sm text-on-surface-variant line-through">
            {B.originalPrice.toLocaleString()}원
          </span>
          <span className="ml-auto flex items-center gap-0.5 text-label-sm text-secondary">
            <Icon name="verified" className="text-[14px]" />
            {B.lowestNote}
          </span>
        </div>

        <div className="mt-space-sm flex items-stretch gap-space-sm">
          <button
            type="button"
            onClick={onAction}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary p-3 text-label-lg text-on-primary shadow-[0_4px_0px_#8b1901] active:translate-y-0.5 active:shadow-[0_1px_0px_#8b1901]"
          >
            <Icon name="shopping_cart" className="text-[18px]" />
            최저가 즉시 재구매
          </button>
          <button
            type="button"
            onClick={onAction}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface-container-high p-3 text-label-lg text-on-surface shadow-[0_3px_0px_#e1bfb8] active:translate-y-0.5"
          >
            <Icon name="update" className="text-[18px]" />
            주기 미루기
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
            <Icon name="inventory_2" className="text-[20px]" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="flex items-center gap-1.5 text-label-lg text-on-surface">
              <span className="truncate">{B.next.name}</span>
              <span className="shrink-0 rounded bg-secondary-container px-1.5 py-0.5 text-label-sm text-on-secondary-container">
                {B.next.dday}
              </span>
            </span>
            <span className="truncate text-body-sm text-on-surface-variant">{B.next.note}</span>
          </div>
        </div>
        <button
          type="button"
          aria-label="상세보기"
          onClick={onAction}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant"
        >
          <Icon name="chevron_right" className="text-[20px]" />
        </button>
      </div>
    </section>
  )
}
