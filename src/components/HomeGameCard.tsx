import { useNavigate } from 'react-router-dom'
import { useGame } from '../state/GameContext'
import { Icon } from '../data/materialIcons'

export function HomeGameCard() {
  const { state, dex, catalogError, refresh } = useGame()
  const navigate = useNavigate()
  const points = state?.points ?? 0
  const completed = dex.filter((entry) => entry.status === 'COMPLETE').length

  return (
    <div className="rounded-2xl bg-inverse-surface p-space-lg text-inverse-on-surface shadow-float">
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="font-heading text-headline-md">가상 상자함</h2>
          <p role={catalogError ? 'alert' : undefined} className="text-body-sm text-inverse-on-surface/70">
            {catalogError
              ? '게임 정보를 불러오지 못했어요'
              : dex.length === 0
                ? '도감을 채워보세요'
                : `${completed}/${dex.length} 완성`}
          </p>
        </div>
        {!catalogError && (
          <span className="flex shrink-0 items-center gap-1 font-heading text-stat-counter tabular-nums text-tertiary-fixed-dim">
            <Icon name="monetization_on" className="text-[20px]" />
            <span>{points}P</span>
          </span>
        )}
      </div>
      <div className="mt-space-lg flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => (catalogError ? void refresh() : navigate('/store'))}
          className="min-h-11 flex-1 rounded-xl bg-tertiary-fixed-dim text-label-lg text-on-tertiary-fixed transition-transform active:scale-[0.98]"
        >
          {catalogError ? '다시 시도' : '상자 열기'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/dex')}
          className="min-h-11 flex-1 rounded-xl border border-inverse-on-surface/20 text-label-lg text-inverse-on-surface transition-colors hover:bg-inverse-on-surface/10"
        >
          도감 보기
        </button>
      </div>
    </div>
  )
}
