import { Icon } from '../data/materialIcons'
import { gradeColor, gradeLabel } from '../data/gradeColors'
import type { OpenBoxResult } from '../lib/gameApi'
import { Sheet } from './Sheet'

/** Box-opening result: a cabinet-toned sheet, since it belongs to the game layer. */
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
    <Sheet labelledBy="box-result-title" onClose={onClose} tone="cabinet">
      <div className="space-y-4">
        <div className={`flex flex-col items-center gap-2 rounded-xl ${color.bg} p-space-lg`}>
          <Icon name={completed ? 'military_tech' : 'redeem'} className={`text-[48px] ${color.text}`} />
          <span className={`text-label-md font-bold ${color.text}`}>{gradeLabel(result.result.grade)}</span>
        </div>

        <div className="space-y-1 text-center">
          <h2 id="box-result-title" className="font-heading text-headline-md">
            {completed ? '아이템을 완성했어요!' : '조각을 획득했어요!'}
          </h2>
          <p className="text-body-md text-inverse-on-surface/70">{result.result.itemName}</p>
        </div>

        {!completed && (
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-inverse-on-surface/15">
              <div className="h-full rounded-full bg-tertiary-fixed-dim" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-center text-label-sm tabular-nums text-inverse-on-surface/70">
              {result.dexEntry.fragmentCount} / {result.dexEntry.fragmentsRequired} 조각
            </p>
          </div>
        )}

        <div className="flex items-stretch gap-2">
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl border border-inverse-on-surface/20 text-label-lg text-inverse-on-surface transition-colors hover:bg-inverse-on-surface/10"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onViewDex}
            className="min-h-11 flex-1 rounded-xl bg-tertiary-fixed-dim text-label-lg text-on-tertiary-fixed active:scale-[0.98]"
          >
            아이템 수집함 보기
          </button>
        </div>
      </div>
    </Sheet>
  )
}
