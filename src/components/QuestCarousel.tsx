import { useRef, useState } from 'react'
import type { DummyQuest } from '../data/homeDummy'

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
        {quests.map((quest) => (
          <div
            key={quest.id}
            className="chunky-card w-full flex-shrink-0 snap-center p-4"
          >
            <div className="flex items-start gap-2">
              <span className="text-xl">{quest.icon}</span>
              <div className="flex-1">
                <p className="font-medium">{quest.title}</p>
                <p className="text-xs text-ink/50">{quest.subtitle}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-paper">
                <div
                  className="h-2 rounded-full bg-stamp"
                  style={{
                    width: `${Math.min(
                      100,
                      (quest.progress.current / quest.progress.total) * 100
                    )}%`,
                  }}
                />
              </div>
              <span className="text-xs text-ink/50">
                {quest.progress.current}/{quest.progress.total}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-medium text-stamp">+{quest.rewardPoints}P</span>
              <button
                type="button"
                disabled={quest.progress.current < quest.progress.total}
                className="rounded-full border-2 border-ink bg-stamp px-4 py-1.5 text-sm text-white disabled:opacity-40"
              >
                보상받기
              </button>
            </div>
          </div>
        ))}
      </div>
      {quests.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {quests.map((quest, i) => (
            <span
              key={quest.id}
              className={`h-1.5 w-1.5 rounded-full ${
                i === activeIndex ? 'bg-stamp' : 'bg-ink/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
