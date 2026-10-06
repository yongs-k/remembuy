import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Quest } from '../lib/gameApi'
import { Icon } from '../data/materialIcons'
import { useGame } from '../state/GameContext'

/**
 * "+NP" rising from where the card was, with sparks (CSS in index.css). It lives
 * on <body> because a claimed quest leaves the home row at once.
 */
function celebrateClaim(anchor: DOMRect, points: number) {
  const burst = document.createElement('div')
  burst.className = 'quest-burst'
  burst.setAttribute('role', 'status')
  burst.style.left = `${anchor.left + anchor.width / 2}px`
  burst.style.top = `${anchor.top + anchor.height / 2}px`
  const sparks = Array.from({ length: 10 }, (_, i) => `<i style="--a:${i * 36}deg"></i>`).join('')
  burst.innerHTML = `<b></b>${sparks}<strong>+${points}P</strong><span class="sr-only">받았어요</span>`
  document.body.appendChild(burst)
  window.setTimeout(() => burst.remove(), 1400)
}

/** One quest in the game cabinet tone: progress toward the target and a 받기 button when done. */
// Where each quest is done (by id prefix), for its 하러 가기 link.
const QUEST_ROUTE: Array<[string, string]> = [
  ['daily-attend', '/store'],
  ['attend', '/store'],
  ['daily-restock', '/purchase'],
  ['restock', '/purchase'],
  ['price', '/purchase'],
  ['link', '/collection'],
  ['rate', '/purchase'],
  ['daily-record', '/new'],
  ['record', '/new'],
]

export function QuestCard({
  quest,
  className = '',
  showKind = true,
}: {
  quest: Quest
  className?: string
  /** False where a heading already says 오늘의 퀘스트. */
  showKind?: boolean
}) {
  const navigate = useNavigate()
  const route = QUEST_ROUTE.find(([prefix]) => quest.id.startsWith(prefix))?.[1]
  const { claimQuest } = useGame()
  const [claiming, setClaiming] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const percent = Math.round((quest.progress / quest.target) * 100)

  return (
    <div
      ref={cardRef}
      className={`flex flex-col justify-between gap-space-sm rounded-2xl bg-inverse-surface p-space-md text-inverse-on-surface ${className}`}
    >
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-label-lg">{quest.title}</p>
          <span className="shrink-0 font-heading text-label-lg tabular-nums text-tertiary-fixed-dim">
            +{quest.reward}P
          </span>
        </div>
        {showKind && quest.kind === 'daily' && <p className="text-label-sm text-inverse-on-surface/70">오늘의 퀘스트</p>}
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
                const rect = cardRef.current?.getBoundingClientRect()
                const awarded = await claimQuest(quest.id)
                setClaiming(false)
                if (awarded > 0 && rect) celebrateClaim(rect, awarded)
              }}
              className="min-h-11 rounded-lg bg-tertiary-fixed-dim px-4 text-label-md text-on-tertiary-fixed active:scale-[0.98] disabled:opacity-70"
            >
              {claiming ? '받는 중...' : '받기'}
            </button>
          ) : route ? (
            <button
              type="button"
              onClick={() => navigate(route)}
              className="-my-2 inline-flex min-h-11 items-center text-label-md text-inverse-on-surface/80"
            >
              하러 가기
              <Icon name="chevron_right" className="text-[18px]" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
