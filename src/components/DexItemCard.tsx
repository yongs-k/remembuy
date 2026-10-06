import type { DexEntry } from '../lib/gameApi'
import { gradeColor } from '../data/gradeColors'
import { placeName } from '../state/gameProgress'
import { CountBadge, PuzzlePiece } from './Puzzle'

/** One 아이템 수집함 entry, styled like a 조합 pile: a grade piece, its +N, the name and progress. */
export function DexItemCard({ entry, onOpen }: { entry: DexEntry; onOpen: () => void }) {
  if (entry.status === 'LOCKED') {
    return (
      <div
        role="img"
        aria-label={`잠긴 ${entry.roomType ? placeName(entry.roomType) + ' ' : ''}아이템`}
        className="flex flex-col items-center gap-0.5 rounded-xl border border-dashed border-white/15 px-1 pb-2 pt-3 text-center"
      >
        <PuzzlePiece grade={entry.grade} className="h-10 w-10 opacity-20 grayscale" />
        <span className="text-label-sm font-bold text-inverse-on-surface/50">???</span>
        <span className="text-[11px] text-inverse-on-surface/40">{entry.roomType ? placeName(entry.roomType).split('/')[0] : '잠김'}</span>
      </div>
    )
  }

  const hex = gradeColor(entry.grade).hex
  const complete = entry.status === 'COMPLETE'
  const percent = Math.min(100, Math.round((entry.fragmentCount / entry.fragmentsRequired) * 100))

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative flex w-full flex-col items-center gap-0.5 rounded-xl bg-white/[0.05] px-1.5 pb-2 pt-3 text-center transition-colors hover:bg-white/[0.09] active:scale-[0.98]"
      style={complete ? { boxShadow: `inset 0 0 0 1.5px ${hex}` } : undefined}
    >
      <CountBadge count={entry.fragmentCount} className="absolute right-1 top-1" />
      <PuzzlePiece grade={entry.grade} slot={entry.id.length % 4} className="h-10 w-10" />
      <span className="max-w-full truncate text-label-sm font-bold text-inverse-on-surface">{entry.name}</span>
      {complete ? (
        <span className="text-[11px] font-bold" style={{ color: hex }}>
          완성
        </span>
      ) : (
        <>
          <span className="text-[11px] tabular-nums text-inverse-on-surface/60">
            {entry.fragmentCount}/{entry.fragmentsRequired}
          </span>
          <span className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <span
              data-testid="dex-progress-fill"
              className="block h-full rounded-full"
              style={{ width: `${percent}%`, backgroundColor: hex }}
            />
          </span>
        </>
      )}
    </button>
  )
}
