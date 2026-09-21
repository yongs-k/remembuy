import { useRef, useState } from 'react'
import type { DummyQuest } from '../data/homeDummy'
import { Icon } from '../data/materialIcons'

export function QuestCarousel({ quests }: { quests: DummyQuest[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  function handleScroll() {
    const el = scrollRef.current
    if (!el || quests.length === 0) return
    const cardWidth = el.scrollWidth / quests.length
    const index = Math.round(el.scrollLeft / cardWidth)
    setActiveIndex(Math.min(quests.length - 1, Math.max(0, index)))
  }

  return (
    <div className="space-y-2">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1"
      >
        {quests.map((quest) => {
          const isComplete = quest.progress.current >= quest.progress.total
          const percent = Math.min(100, (quest.progress.current / quest.progress.total) * 100)
          return (
            <div
              key={quest.id}
              className="relative w-full flex-shrink-0 snap-center overflow-hidden rounded-xl bg-surface-container-lowest p-space-md shadow-[0_4px_0px_#eae0de]"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-tertiary-fixed/30 blur-xl" />
              <div className="flex items-start justify-between gap-space-sm">
                <div className="flex items-start gap-space-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-secondary shadow-[0_2px_0px_#aecdc4]">
                    <Icon name={quest.icon} className="text-[24px]" />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-heading text-headline-md font-bold text-on-surface">
                        {quest.title}
                      </span>
                      {isComplete && (
                        <span className="rounded bg-secondary/10 px-1.5 py-0.5 text-label-sm font-bold text-secondary">
                          도감 완성!
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-body-sm text-on-surface-variant">
                      {quest.subtitle}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-tertiary-fixed px-2 py-1 font-heading text-body-sm text-on-tertiary-fixed shadow-sm">
                  <Icon name="stars" className="text-[14px]" />
                  +{quest.rewardPoints}P
                </div>
              </div>
              <div className="my-0.5 flex flex-col gap-1">
                <div className="h-3 w-full overflow-hidden rounded-full bg-surface-container p-0.5 shadow-inner">
                  <div
                    className="relative h-full rounded-full bg-gradient-to-r from-secondary to-primary-container shadow-sm transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/25" />
                  </div>
                </div>
                <div className="flex items-center justify-between px-0.5 text-label-sm text-on-surface-variant">
                  <span>달성 현황: {quest.progress.current}종 수집 완료</span>
                  <span className="font-bold text-primary">
                    {quest.progress.current} / {quest.progress.total} 달성
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1">
                  {quests.map((q, i) => (
                    <span
                      key={q.id}
                      className={
                        i === activeIndex
                          ? 'h-1.5 w-4 rounded-full bg-primary'
                          : 'h-1.5 w-1.5 rounded-full bg-surface-variant'
                      }
                    />
                  ))}
                </div>
                <button
                  type="button"
                  disabled={!isComplete}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-space-lg py-2 text-label-lg text-on-primary shadow-[0_3px_0px_#8b1901] transition-all hover:bg-primary-container active:translate-y-0.5 active:shadow-[0_1px_0px_#8b1901] disabled:opacity-40 disabled:active:translate-y-0 disabled:active:shadow-[0_3px_0px_#8b1901]"
                >
                  <Icon name="redeem" className="text-[18px]" />
                  보상받기
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
