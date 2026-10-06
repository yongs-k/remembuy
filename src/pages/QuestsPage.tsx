import { useNavigate } from 'react-router-dom'
import { useGame } from '../state/GameContext'
import { useBack } from '../hooks/useBack'
import { pickEasiestQuests } from '../state/quests'
import { QuestCard } from '../components/QuestCard'
import { Icon } from '../data/materialIcons'
import type { Quest } from '../lib/gameApi'

/** Unclaimed (closest to done first), then the ones already claimed. */
function ordered(quests: Quest[]) {
  const open = pickEasiestQuests(quests, quests.length)
  return [...open, ...quests.filter((quest) => quest.claimed)]
}

export default function QuestsPage() {
  const { quests, questsError, reloadQuests, state } = useGame()
  const navigate = useNavigate()
  const goBack = useBack()
  // Rewards waiting go first, in their own section; the rest by kind.
  const ready = quests.filter((quest) => quest.claimable && !quest.claimed)
  const daily = ordered(quests.filter((quest) => quest.kind === 'daily' && !ready.includes(quest)))
  const once = ordered(quests.filter((quest) => quest.kind === 'once' && !ready.includes(quest)))

  return (
    <div className="space-y-space-lg p-margin">
      <button
        type="button"
        onClick={() => goBack(() => navigate('/'))}
        className="relative inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant transition-colors before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] hover:bg-surface-container-high"
      >
        <Icon name="arrow_back" className="text-[16px]" />
        뒤로
      </button>

      <div className="flex items-end justify-between gap-space-sm">
        <h1 className="font-heading text-display-sm text-on-surface">퀘스트</h1>
        {state && (
          <span className="shrink-0 text-label-lg tabular-nums text-on-surface-variant">
            내 포인트 <strong className="text-on-surface">{state.points.toLocaleString()}P</strong>
          </span>
        )}
      </div>
      <p className="-mt-2 text-body-sm text-on-surface-variant">
        기록하면서 퀘스트를 채우면 포인트를 받아요. 포인트로 상자를 열 수 있어요.
      </p>

      {quests.length === 0 ? (
        questsError ? (
          <div role="alert" className="space-y-space-sm rounded-2xl border border-hairline bg-surface-container-lowest px-space-md py-space-lg">
            <p className="text-body-sm text-on-surface-variant">퀘스트를 불러오지 못했어요.</p>
            <button
              type="button"
              onClick={() => reloadQuests?.()}
              className="min-h-11 rounded-xl border border-hairline px-space-md text-label-lg text-on-surface transition-colors hover:bg-surface-container-low"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <p className="px-1 text-body-sm text-on-surface-variant">퀘스트를 불러오는 중...</p>
        )
      ) : (
        <>
          {ready.length > 0 && (
            <section aria-labelledby="ready-quests" className="space-y-space-sm">
              <h2 id="ready-quests" className="font-heading text-headline-md text-on-surface">
                지금 받을 수 있어요
              </h2>
              <div className="grid gap-space-sm sm:grid-cols-2">
                {ready.map((quest) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="daily-quests" className="space-y-space-sm">
            <h2 id="daily-quests" className="font-heading text-headline-md text-on-surface">
              오늘의 퀘스트
            </h2>
            <p className="-mt-1 text-body-sm text-on-surface-variant">매일 자정(한국 시간)에 새로 시작돼요.</p>
            <div className="grid gap-space-sm sm:grid-cols-2">
              {daily.map((quest) => (
                <QuestCard key={quest.id} quest={quest} showKind={false} />
              ))}
            </div>
          </section>

          <section aria-labelledby="once-quests" className="space-y-space-sm">
            <h2 id="once-quests" className="font-heading text-headline-md text-on-surface">
              도전 퀘스트
            </h2>
            <div className="grid gap-space-sm sm:grid-cols-2">
              {once.map((quest) => (
                <QuestCard key={quest.id} quest={quest} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
