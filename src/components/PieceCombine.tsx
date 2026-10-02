import { useState } from 'react'
import { useGame } from '../state/GameContext'
import { GRADE_ORDER, gradeColor, gradeLabel } from '../data/gradeColors'
import { placeName, STAGE_SIZE } from '../state/gameProgress'
import type { PieceResult } from '../lib/gameApi'
import { Icon } from '../data/materialIcons'
import { PuzzleBoard, PuzzlePiece } from './Puzzle'
import { Sheet } from './Sheet'

/** Spare pieces of one grade that make one piece of the next (server COMBINE_COST). */
const COMBINE_COST = 10

/** 조각 조합: ten spare pieces of a grade become one piece of the grade above. */
export function PieceCombine() {
  const { duplicates, combine } = useGame()
  const [busy, setBusy] = useState<string | null>(null)
  const [made, setMade] = useState<{ from: string; piece: PieceResult } | null>(null)
  const [failed, setFailed] = useState(false)
  // 전설 is the top: nothing to combine it into.
  const grades = GRADE_ORDER.slice(0, -1)

  async function run(grade: string) {
    setBusy(grade)
    setFailed(false)
    const piece = await combine(grade)
    setBusy(null)
    if (piece) setMade({ from: grade, piece })
    else setFailed(true)
  }

  return (
    <section
      aria-labelledby="combine-title"
      className="space-y-space-sm rounded-2xl bg-inverse-surface p-space-lg text-inverse-on-surface shadow-float"
    >
      <div>
        <h2 id="combine-title" className="font-heading text-headline-md">
          조각 조합
        </h2>
        <p className="text-body-sm text-inverse-on-surface/70">
          같은 등급의 중복 조각 {COMBINE_COST}개로 한 단계 위 조각 1개를 만들어요.
        </p>
      </div>
      <ul className="space-y-2">
        {grades.map((grade, i) => {
          const next = GRADE_ORDER[i + 1]
          const spare = duplicates[grade] ?? 0
          const ready = spare >= COMBINE_COST
          return (
            <li key={grade} className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-2 py-2">
              <PuzzlePiece grade={grade} className="h-9 w-9 shrink-0" />
              <Icon name="arrow_forward" className="shrink-0 text-[14px] text-inverse-on-surface/40" />
              <PuzzlePiece grade={next} slot={1} className="h-9 w-9 shrink-0" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-label-md">
                  <span className="font-bold" style={{ color: gradeColor(grade).hex }}>
                    {gradeLabel(grade)}
                  </span>{' '}
                  중복 <span className="tabular-nums">{spare}</span>
                  <span className="text-inverse-on-surface/60">/{COMBINE_COST}</span>
                </p>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, (spare / COMBINE_COST) * 100)}%`, backgroundColor: gradeColor(grade).hex }}
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={!ready || busy !== null}
                onClick={() => void run(grade)}
                className="min-h-11 shrink-0 rounded-lg bg-gradient-to-b from-[#f8dc9a] to-[#d9a24c] px-3 text-label-md font-bold text-on-tertiary-fixed active:scale-[0.98] disabled:from-white/10 disabled:to-white/10 disabled:font-normal disabled:text-inverse-on-surface/50"
              >
                {busy === grade ? '조합 중...' : '조합'}
              </button>
            </li>
          )
        })}
      </ul>
      {failed && (
        <p role="alert" className="text-center text-body-sm text-inverse-primary">
          조합하지 못했어요. 다시 시도해 주세요.
        </p>
      )}

      {made && (
        <Sheet labelledBy="combine-result-title" tone="cabinet" placement="center" onClose={() => setMade(null)}>
          <div className="space-y-4 text-center">
            <div className="animate-badge-bounce flex justify-center">
              <PuzzlePiece
                grade={made.piece.grade}
                slot={made.piece.slot}
                className="h-24 w-24 drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]"
              />
            </div>
            <div className="space-y-0.5">
              <h2 id="combine-result-title" className="font-heading text-headline-md">
                {gradeLabel(made.piece.grade)} 조각을 만들었어요!
              </h2>
              <p className="text-body-sm text-inverse-on-surface/70">
                {placeName(made.piece.spaceId)}에 들어갔어요 · {gradeLabel(made.piece.grade)} {placeName(made.piece.spaceId)}{' '}
                {made.piece.count}/{STAGE_SIZE}
                {made.piece.completed && ' 완성!'}
              </p>
            </div>
            <PuzzleBoard grade={made.piece.grade} pieces={made.piece.pieces} className="mx-auto h-20 w-20 text-inverse-on-surface" />
            <div className="space-y-2">
              {(duplicates[made.from] ?? 0) >= COMBINE_COST && (
                <button
                  type="button"
                  onClick={() => {
                    const grade = made.from
                    setMade(null)
                    void run(grade)
                  }}
                  className="min-h-12 w-full rounded-xl bg-gradient-to-b from-[#f8dc9a] to-[#d9a24c] text-label-lg font-bold text-on-tertiary-fixed active:scale-[0.98]"
                >
                  한 번 더 조합
                </button>
              )}
              <button
                type="button"
                data-autofocus
                onClick={() => setMade(null)}
                className="min-h-12 w-full rounded-xl bg-white/[0.08] text-label-lg transition-colors hover:bg-white/[0.12]"
              >
                확인
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </section>
  )
}
