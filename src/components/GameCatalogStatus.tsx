import { useGame } from '../state/GameContext'

export function GameCatalogStatus({ label }: { label: string }) {
  const { catalogError, refresh } = useGame()

  if (!catalogError) {
    return <p className="text-body-sm text-on-surface-variant">{label} 불러오는 중...</p>
  }
  return (
    <div role="alert" className="space-y-space-sm rounded-xl bg-surface-container-low p-space-md">
      <p className="text-body-md text-on-surface">{label} 불러오지 못했어요.</p>
      <p className="text-body-sm text-on-surface-variant">게임 서버와 연결되지 않았어요. 잠시 후 다시 시도해 주세요.</p>
      <button
        type="button"
        onClick={() => void refresh()}
        className="min-h-11 rounded-xl bg-primary px-space-md text-label-lg text-on-primary"
      >
        다시 시도
      </button>
    </div>
  )
}
