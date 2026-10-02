import { Icon } from '../data/materialIcons'
import { gradeColor, gradeLabel } from '../data/gradeColors'
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
      <rect x="22" y="58" width="76" height="48" rx="5" fill="#7a4a26" />
      <rect x="22" y="58" width="76" height="8" fill="#5f3819" />
      <rect x="54" y="58" width="12" height="48" fill="#ffb95f" />
      <rect x="22" y="100" width="76" height="6" rx="3" fill="#c88a2e" />
      {/* lid */}
      <g className="box-open-lid">
        <rect x="16" y="42" width="88" height="18" rx="5" fill="#8d5a30" />
        <rect x="16" y="54" width="88" height="6" rx="3" fill="#c88a2e" />
        <rect x="54" y="42" width="12" height="18" fill="#ffb95f" />
        <ellipse cx="50" cy="38" rx="11" ry="6" fill="#ffb95f" transform="rotate(-20 50 38)" />
        <ellipse cx="70" cy="38" rx="11" ry="6" fill="#ffb95f" transform="rotate(20 70 38)" />
        <circle cx="60" cy="41" r="4.5" fill="#c88a2e" />
      </g>
    </svg>
  )
}

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
        <div className="relative flex h-44 items-end justify-center">
          <OpeningBox />
          <div
            className={`box-open-item absolute top-0 flex flex-col items-center gap-1 rounded-xl ${color.bg} px-space-md py-space-sm shadow-float`}
          >
            <Icon name={completed ? 'military_tech' : 'diamond'} className={`text-[36px] ${color.text}`} />
            <span className={`text-label-md font-bold ${color.text}`}>{gradeLabel(result.result.grade)}</span>
          </div>
        </div>

        <div className="box-open-text space-y-1 text-center">
          <h2 id="box-result-title" className="font-heading text-headline-md">
            {completed ? '아이템을 완성했어요!' : '조각을 획득했어요!'}
          </h2>
          <p className="text-body-md text-inverse-on-surface/70">{result.result.itemName}</p>
        </div>

        {!completed && (
          <div className="box-open-text space-y-1">
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
