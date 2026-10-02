import { Icon } from '../data/materialIcons'
import { GRADE_ORDER, gradeColor, gradeLabel } from '../data/gradeColors'
import { STAGE_SIZE, placeName } from '../state/gameProgress'
import { CopiesBadge, PuzzleBoard, PuzzlePiece } from './Puzzle'
import type { OpenBoxResult } from '../lib/gameApi'
import { Sheet } from './Sheet'

/**
 * The box itself: it shakes, the lid flies off, light spills out, and the item
 * rises from it (pure CSS in index.css, so the result is in the DOM at once).
 */
function OpeningBox() {
  return (
    <svg aria-hidden viewBox="0 0 120 120" className="box-open-shake h-36 w-36 overflow-visible">
      <defs>
        <radialGradient id="box-glow-fill">
          <stop offset="0%" stopColor="#ffddb8" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#ffb95f" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffb95f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="box-open-glow" cx="60" cy="52" r="56" fill="url(#box-glow-fill)" />
      <g className="box-open-rays" stroke="#ffb95f" strokeWidth="3" strokeLinecap="round" opacity="0.8">
        <line x1="60" y1="30" x2="60" y2="6" />
        <line x1="38" y1="36" x2="24" y2="16" />
        <line x1="82" y1="36" x2="96" y2="16" />
        <line x1="28" y1="52" x2="8" y2="44" />
        <line x1="92" y1="52" x2="112" y2="44" />
      </g>
      <ellipse cx="60" cy="108" rx="40" ry="5" fill="#000" opacity="0.25" />
      {/* base */}
      <rect x="22" y="58" width="76" height="48" rx="5" fill="#2e2118" />
      <rect x="22" y="58" width="76" height="8" fill="#1c140e" />
      <rect x="54" y="58" width="12" height="48" fill="#ffb95f" />
      <rect x="22" y="100" width="76" height="6" rx="3" fill="#c88a2e" />
      {/* lid */}
      <g className="box-open-lid">
        <rect x="16" y="42" width="88" height="18" rx="5" fill="#3a2a1f" />
        <rect x="16" y="54" width="88" height="6" rx="3" fill="#c88a2e" />
        <rect x="54" y="42" width="12" height="18" fill="#ffb95f" />
        <ellipse cx="50" cy="38" rx="11" ry="6" fill="#ffb95f" transform="rotate(-20 50 38)" />
        <ellipse cx="70" cy="38" rx="11" ry="6" fill="#ffb95f" transform="rotate(20 70 38)" />
        <circle cx="60" cy="41" r="4.5" fill="#c88a2e" />
      </g>
    </svg>
  )
}

/** Box-opening result: a cabinet-toned card in the middle of the screen (the game layer). */
export function BoxOpenResultModal({
  result,
  intro = true,
  onClose,
  onViewCollection,
  onReopen,
  canReopen = true,
}: {
  result: OpenBoxResult
  /** Play the box-opening scene first; false when the page already opened its own box. */
  intro?: boolean
  /** 확인: close. */
  onClose: () => void
  /** 도감 보기: the 컬렉션, where each 장소's grade stage shows. */
  onViewCollection: () => void
  /** 다시 열기: open the same box again; omitted where a box can't be reopened (출석). */
  onReopen?: () => void
  /** False when there aren't enough points for another one. */
  canReopen?: boolean
}) {
  const color = gradeColor(result.result.grade)
  const room = result.room
  // With a 장소 stage, "completed" means the stage (e.g. 일반 욕실); otherwise the item.
  const completed = room ? room.completed : result.result.type === 'FULL_ITEM' || result.dexEntry.status === 'COMPLETE'
  const nextGrade = room && GRADE_ORDER[GRADE_ORDER.indexOf(room.grade as (typeof GRADE_ORDER)[number]) + 1]
  const percent = Math.min(
    100,
    Math.round((result.dexEntry.fragmentCount / result.dexEntry.fragmentsRequired) * 100)
  )

  return (
    <Sheet labelledBy="box-result-title" onClose={onClose} tone="cabinet" placement="center">
      <div className="space-y-4">
        <div className={`relative flex justify-center ${intro ? 'h-44 items-end' : ''}`}>
          {intro && <OpeningBox />}
          <div
            className={`${intro ? 'box-open-item absolute top-0' : 'animate-badge-bounce'} relative flex flex-col items-center`}
          >
            {room ? (
              <>
                <CopiesBadge copies={room.copies} className="absolute -top-1 right-0 z-10 px-2 text-label-md leading-6" />
                <PuzzlePiece grade={room.grade} slot={room.slot} className="h-24 w-24 drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]" />
              </>
            ) : (
              <span className={`flex flex-col items-center gap-1 rounded-xl ${color.bg} px-space-md py-space-sm shadow-float`}>
                <Icon name={completed ? 'military_tech' : 'diamond'} className={`text-[36px] ${color.text}`} />
              </span>
            )}
            <span className="mt-1 text-label-md font-bold" style={{ color: color.hex }}>
              {gradeLabel(result.result.grade)}
              {room && room.copies > 1 && ' · 중복'}
            </span>
          </div>
        </div>

        <div className={`${intro ? 'box-open-text' : ''} space-y-1 text-center`}>
          <h2 id="box-result-title" className="font-heading text-headline-md">
            {room
              ? completed
                ? `${gradeLabel(room.grade)} ${placeName(room.spaceId)} 완성!`
                : `${placeName(room.spaceId)} 조각을 얻었어요!`
              : completed
                ? '아이템을 완성했어요!'
                : '조각을 획득했어요!'}
          </h2>
          <p className="text-body-md text-inverse-on-surface/70">{result.result.itemName}</p>
        </div>

        {room && (
          <div className={`${intro ? 'box-open-text' : ''} space-y-1.5`}>
            <PuzzleBoard grade={room.grade} pieces={room.pieces} className="mx-auto h-20 w-20 text-inverse-on-surface" />
            <p className="text-center text-label-sm tabular-nums text-inverse-on-surface/70">
              {gradeLabel(room.grade)} {placeName(room.spaceId)} 조각 {room.count} / {STAGE_SIZE}
              {completed && (nextGrade ? ` · 이제 ${gradeLabel(nextGrade)} 조각이 나와요` : ' · 전설까지 모두 모았어요')}
              {!completed && room.copies > 1 && ' · 중복 조각은 10개 모아 조합할 수 있어요'}
            </p>
          </div>
        )}

        {!room && !completed && (
          <div className={`${intro ? 'box-open-text' : ''} space-y-1`}>
            <div className="h-2 w-full overflow-hidden rounded-full bg-inverse-on-surface/15">
              <div className="h-full rounded-full bg-tertiary-fixed-dim" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-center text-label-sm tabular-nums text-inverse-on-surface/70">
              {result.dexEntry.fragmentCount} / {result.dexEntry.fragmentsRequired} 조각
            </p>
          </div>
        )}

        <div className="space-y-2 pt-1">
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={onViewCollection}
              className="min-h-12 flex-1 rounded-xl border border-tertiary-fixed-dim/50 text-label-lg text-tertiary-fixed transition-colors hover:bg-white/[0.06]"
            >
              도감 보기
            </button>
            {onReopen && (
              <button
                type="button"
                disabled={!canReopen}
                onClick={onReopen}
                className="min-h-12 flex-1 rounded-xl bg-gradient-to-b from-[#f8dc9a] to-[#d9a24c] text-label-lg font-bold text-on-tertiary-fixed active:scale-[0.98] disabled:from-white/[0.12] disabled:to-white/[0.12] disabled:font-normal disabled:text-inverse-on-surface/60"
              >
                {canReopen ? '다시 열기' : '포인트 부족'}
              </button>
            )}
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
