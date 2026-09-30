import { Icon } from '../data/materialIcons'
import { gradeColor, gradeLabel } from '../data/gradeColors'
import type { OpenBoxResult } from '../lib/gameApi'

export function BoxOpenResultModal({
  result,
  onClose,
  onViewDex,
}: {
  result: OpenBoxResult
  onClose: () => void
  onViewDex: () => void
}) {
  const color = gradeColor(result.result.grade)
  const completed = result.result.type === 'FULL_ITEM' || result.dexEntry.status === 'COMPLETE'
  const percent = Math.min(
    100,
    Math.round((result.dexEntry.fragmentCount / result.dexEntry.fragmentsRequired) * 100)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-sm space-y-4 rounded-2xl bg-surface-container-lowest p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex flex-col items-center gap-2 rounded-xl ${color.bg} p-space-lg`}>
          <Icon name={completed ? 'military_tech' : 'redeem'} className={`text-[48px] ${color.text}`} />
          <span className={`text-label-md font-bold ${color.text}`}>{gradeLabel(result.result.grade)}</span>
        </div>

        <div className="space-y-1 text-center">
          <p className="font-heading text-headline-md text-on-surface">
            {completed ? '아이템을 완성했어요!' : '조각을 획득했어요!'}
          </p>
          <p className="text-body-md text-on-surface-variant">{result.result.itemName}</p>
        </div>

        {!completed && (
          <div className="space-y-1">
            <div className="h-3 w-full overflow-hidden rounded-full bg-surface-container-low">
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-center text-label-sm text-on-surface-variant">
              {result.dexEntry.fragmentCount} / {result.dexEntry.fragmentsRequired} 조각
            </p>
          </div>
        )}

        <div className="flex items-stretch gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-surface-container px-space-md py-2.5 text-label-lg text-on-surface-variant"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onViewDex}
            className="flex-1 rounded-xl bg-primary px-space-md py-2.5 text-label-lg text-on-primary active:scale-[0.98]"
          >
            수집함으로 이동
          </button>
        </div>
      </div>
    </div>
  )
}
