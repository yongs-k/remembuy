import { useNavigate } from 'react-router-dom'
import { useGame } from '../state/GameContext'
import { Icon } from '../data/materialIcons'

export function HomeGameCard() {
  const { state, dex } = useGame()
  const navigate = useNavigate()
  const points = state?.points ?? 0
  const completed = dex.filter((entry) => entry.status === 'COMPLETE').length

  return (
    <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-[0_4px_0px_#eae0de]">
      <div className="mb-space-sm flex items-center justify-between">
        <h2 className="font-heading text-headline-md text-on-surface">가상 상자함</h2>
        <span className="flex items-center gap-1 text-label-lg font-bold text-tertiary">
          <Icon name="monetization_on" className="text-[16px]" />
          <span>{points}P</span>
        </span>
      </div>
      <p className="mb-space-md text-body-sm text-on-surface-variant">
        {dex.length === 0 ? '도감을 채워보세요' : `${completed}/${dex.length} 완성`}
      </p>
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => navigate('/store')}
          className="flex-1 rounded-xl bg-primary py-2.5 text-label-lg text-on-primary shadow-[0_3px_0px_#8b1901] active:translate-y-0.5 active:shadow-[0_1px_0px_#8b1901]"
        >
          상자 열기
        </button>
        <button
          type="button"
          onClick={() => navigate('/dex')}
          className="flex-1 rounded-xl bg-surface-container px-space-md py-2.5 text-label-lg text-on-surface-variant"
        >
          도감 보기
        </button>
      </div>
    </div>
  )
}
