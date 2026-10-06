import { Icon } from '../data/materialIcons'
import { gradeColor, gradeLabel } from '../data/gradeColors'
import type { OpenBoxResult } from '../lib/gameApi'
import { placeName } from '../state/gameProgress'
import { Sheet } from './Sheet'
import { CountBadge, PuzzlePiece } from './Puzzle'

/** Several boxes at once (10개 한번에 열기): every draw as a grade tile, stages completed called out. */
export function BoxMultiResultModal({
  results,
  onClose,
  onViewCollection,
  onReopen,
  canReopen,
}: {
  results: OpenBoxResult[]
  /** 확인: close. */
  onClose: () => void
  /** 컬렉션 보기. */
  onViewCollection: () => void
  /** 다시 열기: the same number again. */
  onReopen: () => void
  canReopen: boolean
}) {
  // 장소 that reached +4 in this batch: they can 달성 now.
  const readyNow = [
    ...new Set(
      results.flatMap((r) =>
        r.room?.source === 'stage' && r.room.count === 4 ? [`${gradeLabel(r.room.grade)} ${placeName(r.room.spaceId)}`] : []
      )
    ),
  ]

  return (
    <Sheet labelledBy="box-multi-title" onClose={onClose} tone="cabinet" placement="center">
      <div className="space-y-4">
        <div className="space-y-0.5 text-center">
          <h2 id="box-multi-title" className="font-heading text-headline-md">
            상자 {results.length}개를 열었어요!
          </h2>
          <p className="text-body-sm text-inverse-on-surface/70">장소 등급과 같은 조각은 +N으로, 다른 등급은 조합 재료로 쌓였어요.</p>
        </div>

        <ul className="grid grid-cols-5 gap-1.5">
          {results.map((r, i) => {
            const color = gradeColor(r.result.grade)
            const place = r.room ? placeName(r.room.spaceId) : r.result.itemName
            return (
              <li
                key={i}
                className="animate-badge-bounce relative flex flex-col items-center gap-0.5 rounded-lg bg-white/[0.05] px-0.5 pb-1.5 pt-2"
                style={{ animationDelay: `${i * 70}ms` }}
                aria-label={`${gradeLabel(r.result.grade)} ${place} 조각 +${r.room?.count ?? 1}${r.room?.source === 'stock' ? ', 조합 재료' : ''}, ${r.result.itemName}`}
              >
                {r.room && <CountBadge count={r.room.count} className="absolute -top-1.5 right-0 z-10" />}
                {r.room ? (
                  <PuzzlePiece grade={r.room.grade} slot={r.room.slot} className="h-9 w-9" />
                ) : (
                  <Icon name="diamond" className={`text-[22px] ${color.text}`} />
                )}
                <span className="w-full truncate text-center text-[11px] font-bold leading-tight" style={{ color: color.hex }}>
                  {place.split('/')[0]}
                </span>
              </li>
            )
          })}
        </ul>

        {readyNow.length > 0 && (
          <p className="rounded-xl border border-tertiary-fixed-dim/40 bg-white/[0.04] px-3 py-2 text-center text-label-md text-tertiary-fixed">
            <Icon name="workspace_premium" className="mr-1 align-[-3px] text-[16px]" />
            {readyNow.join(', ')} 달성 가능!
          </p>
        )}

        <div className="space-y-2 pt-1">
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={onViewCollection}
              className="min-h-12 flex-1 rounded-xl border border-tertiary-fixed-dim/50 text-label-lg text-tertiary-fixed transition-colors hover:bg-white/[0.06]"
            >
              컬렉션 보기
            </button>
            <button
              type="button"
              disabled={!canReopen}
              onClick={onReopen}
              className="min-h-12 flex-1 rounded-xl bg-gradient-to-b from-[#f8dc9a] to-[#d9a24c] text-label-lg font-bold text-on-tertiary-fixed active:scale-[0.98] disabled:from-white/[0.12] disabled:to-white/[0.12] disabled:font-normal disabled:text-inverse-on-surface/60"
            >
              {canReopen ? `다시 ${results.length}개 열기` : '포인트 부족'}
            </button>
          </div>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            className="min-h-12 w-full rounded-xl bg-white/[0.08] text-label-lg text-inverse-on-surface transition-colors hover:bg-white/[0.12]"
          >
            확인
          </button>
        </div>
      </div>
    </Sheet>
  )
}
