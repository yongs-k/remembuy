import { DUMMY_PROFILE, DUMMY_STATS } from '../data/homeDummy'
import { Icon } from '../data/materialIcons'

export function HomeProfileCard({ itemCount }: { itemCount: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-space-md shadow-[0_4px_0px_#eae0de]">
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-primary-fixed/20 blur-2xl" />
      <div className="relative z-10 mb-space-md flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-on-secondary shadow-[0_2px_0px_#304c46]">
              나
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-tertiary-fixed text-on-tertiary-fixed shadow-sm">
              <Icon name="star" className="text-[11px]" />
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-heading text-headline-md text-on-surface">
                {DUMMY_PROFILE.name}
              </span>
              <button
                type="button"
                aria-label="칭호 변경"
                className="flex items-center gap-0.5 rounded-full bg-secondary-container/60 px-2 py-0.5 transition-colors hover:bg-secondary-container"
              >
                <span className="flex items-center gap-0.5 text-label-sm font-extrabold text-secondary">
                  <Icon name="auto_awesome" className="text-[13px] text-tertiary" />
                  {DUMMY_PROFILE.titleBadge.text}
                </span>
                <Icon name="expand_more" className="text-[14px] text-secondary" />
              </button>
            </div>
            <span className="text-body-sm text-on-surface-variant">
              LV.4 꼼꼼한 살림 탐험가
            </span>
          </div>
        </div>
        <button
          type="button"
          aria-label="프로필 설정"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant transition-colors hover:text-on-surface active:scale-95"
        >
          <Icon name="tune" className="text-[18px]" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1 rounded-lg bg-surface-container-low p-space-sm pt-space-sm">
        <div className="flex flex-col items-center text-center">
          <span className="font-heading text-body-lg font-extrabold text-primary">
            {itemCount}
            <span className="ml-0.5 text-label-sm font-bold">개</span>
          </span>
          <span className="mt-0.5 text-label-sm text-on-surface-variant">기록 상품</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="font-heading text-body-lg font-extrabold text-secondary">
            {(DUMMY_STATS.totalSaved / 10000).toFixed(1)}
            <span className="ml-0.5 text-label-sm font-bold">만</span>
          </span>
          <span className="mt-0.5 text-label-sm text-on-surface-variant">누적 절약</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-0.5 text-tertiary">
            <Icon name="monetization_on" className="text-[14px]" />
            <span className="font-heading text-body-lg font-extrabold">{DUMMY_STATS.points}</span>
          </div>
          <span className="mt-0.5 text-label-sm text-on-surface-variant">포인트</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="font-heading text-body-lg font-extrabold text-on-surface">
            {DUMMY_STATS.titleProgress.current}
            <span className="text-label-sm font-normal text-on-surface-variant">
              /{DUMMY_STATS.titleProgress.total}
            </span>
          </span>
          <span className="mt-0.5 text-label-sm text-on-surface-variant">칭호 도감</span>
        </div>
      </div>
    </div>
  )
}
