import { useState } from 'react'
import type { Quest } from '../lib/gameApi'
import { useGame } from '../state/GameContext'

/** One quest in the game cabinet tone: progress toward the target and a 받기 button when done. */
export function QuestCard({ quest, className = '' }: { quest: Quest; className?: string }) {
  const { claimQuest } = useGame()
  const [claiming, setClaiming] = useState(false)
  const percent = Math.round((quest.progress / quest.target) * 100)

  return (
    <div
      className={`flex flex-col justify-between gap-space-sm rounded-2xl bg-inverse-surface p-space-md text-inverse-on-surface ${className}`}
    >
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-label-lg">{quest.title}</p>
          <span className="shrink-0 font-heading text-label-lg tabular-nums text-tertiary-fixed-dim">
            +{quest.reward}P
          </span>
        </div>
        {quest.kind === 'daily' && <p className="text-label-sm text-inverse-on-surface/70">오늘의 퀘스트</p>}
      </div>
      <div className="space-y-1.5">
        <div
          role="progressbar"
          aria-label={`${quest.title} 진행`}
          aria-valuemin={0}
          aria-valuemax={quest.target}
          aria-valuenow={quest.progress}
          className="h-1.5 overflow-hidden rounded-full bg-inverse-on-surface/15"
        >
          <div className="h-full rounded-full bg-tertiary-fixed-dim" style={{ width: `${percent}%` }} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-body-sm tabular-nums text-inverse-on-surface/70">
            {quest.progress} / {quest.target}
          </span>
          {quest.claimed ? (
            <span className="text-label-md text-inverse-on-surface/70">받았어요</span>
          ) : quest.claimable ? (
            <button
              type="button"
              disabled={claiming}
              onClick={async () => {
                setClaiming(true)
                await claimQuest(quest.id)
                setClaiming(false)
              }}
              className="min-h-11 rounded-lg bg-tertiary-fixed-dim px-4 text-label-md text-on-tertiary-fixed active:scale-[0.98] disabled:opacity-70"
            >
              {claiming ? '받는 중...' : '받기'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
