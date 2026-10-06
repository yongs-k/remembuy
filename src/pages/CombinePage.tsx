import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../state/GameContext'
import { useBack } from '../hooks/useBack'
import { Icon } from '../data/materialIcons'
import { GRADE_ORDER, gradeColor, gradeLabel } from '../data/gradeColors'
import { placeName } from '../state/gameProgress'
import { CountBadge, PuzzlePiece } from '../components/Puzzle'
import { Sheet } from '../components/Sheet'
import { HowToButton } from '../components/HowTo'
import type { CombinePick, PieceResult, PieceStack } from '../lib/gameApi'

/** Pieces of one grade that make one piece of the next (server COMBINE_COST). */
export const COMBINE_COST = 10
/** 자동 넣기 only uses piles at least this tall (server AUTO_MIN_STACK). */
export const AUTO_MIN_STACK = 4

type Piece = { spaceId: string; source: PieceStack['source'] }
const key = (p: Piece) => `${p.spaceId}|${p.source}`

/** Stage pieces 달성 needs (server STAGE_SIZE); 자동 넣기 leaves them in place. */
const STAGE_KEEP = 4

/**
 * 자동 넣기 (mirrors the server): ten from piles of four or more, kept pieces before
 * stage pieces, tallest first, and a stage pile only past its four. Null when short of ten.
 */
export function autoFill(stacks: PieceStack[]): Piece[] | null {
  const spare = (s: PieceStack) => (s.count < AUTO_MIN_STACK ? 0 : s.source === 'stage' ? s.count - STAGE_KEEP : s.count)
  const ordered = [...stacks].sort((a, b) => (a.source === b.source ? b.count - a.count : a.source === 'stock' ? -1 : 1))
  const pieces: Piece[] = []
  for (const stack of ordered) {
    for (let i = 0; i < spare(stack) && pieces.length < COMBINE_COST; i++) pieces.push({ spaceId: stack.spaceId, source: stack.source })
  }
  return pieces.length === COMBINE_COST ? pieces : null
}

function toPicks(pieces: Piece[]): CombinePick[] {
  const counts = new Map<string, CombinePick>()
  for (const p of pieces) {
    const pick = counts.get(key(p)) ?? { spaceId: p.spaceId, source: p.source, count: 0 }
    pick.count += 1
    counts.set(key(p), pick)
  }
  return [...counts.values()]
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

/** 조각 조합: ten pieces of one grade in, one random piece of the next grade out. */
export default function CombinePage() {
  const { stacks, combine } = useGame()
  const navigate = useNavigate()
  const goBack = useBack()
  const [grade, setGrade] = useState<string>('COMMON')
  const [slots, setSlots] = useState<Piece[]>([])
  const [merging, setMerging] = useState(false)
  const [made, setMade] = useState<{ piece: PieceResult; itemName: string } | null>(null)
  const [failed, setFailed] = useState(false)

  const next = GRADE_ORDER[GRADE_ORDER.indexOf(grade as (typeof GRADE_ORDER)[number]) + 1]
  const piles = stacks.filter((s) => s.grade === grade).sort((a, b) => b.count - a.count)
  const used = (stack: PieceStack) => slots.filter((p) => key(p) === key(stack)).length
  const auto = autoFill(piles)
  const full = slots.length === COMBINE_COST

  function pickGrade(g: string) {
    setGrade(g)
    setSlots([])
    setFailed(false)
  }

  async function run() {
    setMerging(true)
    setFailed(false)
    const still = !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const [result] = await Promise.all([combine(grade, toPicks(slots)), wait(still ? 0 : 900)])
    setMerging(false)
    if (result) {
      setSlots([])
      setMade(result)
    } else {
      setFailed(true)
    }
  }

  return (
    <div
      className="-mb-20 min-h-[calc(100%+5rem)] space-y-space-md bg-inverse-surface px-4 pb-28 pt-space-md text-inverse-on-surface"
      style={{ backgroundImage: 'radial-gradient(ellipse 90% 40% at 50% 25%, rgb(255 185 95 / 0.14), transparent 70%)' }}
    >
      <button
        type="button"
        onClick={() => goBack(() => navigate('/dex'))}
        className="relative inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-3 py-1.5 text-label-md text-inverse-on-surface/80 transition-colors before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] hover:bg-white/[0.12]"
      >
        <Icon name="arrow_back" className="text-[16px]" />
        뒤로
      </button>

      <div className="space-y-1 text-center">
        <h1 className="font-heading text-display-sm text-tertiary-fixed">조각 조합</h1>
        <p className="text-body-sm text-inverse-on-surface/70">
          같은 등급 장소 조각 {COMBINE_COST}개를 넣으면 다음 등급 장소 조각 1개가 무작위로 나와요.
        </p>
        <HowToButton topic="combine" tone="cabinet" />
      </div>

      <div role="tablist" aria-label="넣을 등급" className="grid grid-cols-3 gap-1.5">
        {GRADE_ORDER.slice(0, -1).map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={grade === g}
            onClick={() => pickGrade(g)}
            className={`min-h-11 rounded-xl text-label-lg font-bold transition-colors ${
              grade === g ? 'bg-white/[0.14] ring-2' : 'bg-white/[0.04] text-inverse-on-surface/60'
            }`}
            style={grade === g ? { color: gradeColor(g).hex, ['--tw-ring-color' as string]: gradeColor(g).hex } : undefined}
          >
            {gradeLabel(g)}
          </button>
        ))}
      </div>

      {/* Ten slots, then the piece they become. */}
      <section aria-label="조합 슬롯" className="space-y-3 rounded-2xl border border-tertiary-fixed-dim/20 bg-white/[0.03] p-space-md">
        <div className="flex items-center justify-between text-label-md">
          <span>
            <strong style={{ color: gradeColor(grade).hex }}>{gradeLabel(grade)}</strong> 조각{' '}
            <span className="tabular-nums">{slots.length}</span>
            <span className="text-inverse-on-surface/60">/{COMBINE_COST}</span>
          </span>
          {slots.length > 0 && (
            <button type="button" onClick={() => setSlots([])} className="-my-2 min-h-11 px-1 text-inverse-on-surface/70">
              비우기
            </button>
          )}
        </div>
        <ul className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: COMBINE_COST }, (_, i) => {
            const piece = slots[i]
            return (
              <li key={i} className="aspect-square">
                {piece ? (
                  <button
                    type="button"
                    aria-label={`${placeName(piece.spaceId)} 조각 빼기`}
                    onClick={() => setSlots((prev) => prev.filter((_, j) => j !== i))}
                    className={`flex h-full w-full items-center justify-center rounded-lg bg-white/[0.06] ${merging ? 'animate-pulse' : ''}`}
                  >
                    <PuzzlePiece grade={grade} slot={i % 4} className="h-[80%] w-[80%]" />
                  </button>
                ) : (
                  <span className="block h-full w-full rounded-lg border border-dashed border-white/15" />
                )}
              </li>
            )
          })}
        </ul>
        <div className="flex items-center justify-center gap-2 text-label-md text-inverse-on-surface/70">
          <Icon name="arrow_downward" className="text-[18px]" />
          {next && (
            <>
              <PuzzlePiece grade={next} slot={1} className="h-8 w-8" />
              <span>
                <strong style={{ color: gradeColor(next).hex }}>{gradeLabel(next)}</strong> 조각 1개 (장소 무작위)
              </span>
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!auto || merging}
            onClick={() => auto && setSlots(auto)}
            className="min-h-12 rounded-xl border border-tertiary-fixed-dim/50 text-label-lg text-tertiary-fixed transition-colors hover:bg-white/[0.06] disabled:border-white/10 disabled:text-inverse-on-surface/40"
          >
            자동 넣기
          </button>
          <button
            type="button"
            disabled={!full || merging}
            onClick={() => void run()}
            className="min-h-12 rounded-xl bg-gradient-to-b from-[#f8dc9a] to-[#d9a24c] text-label-lg font-bold text-on-tertiary-fixed active:scale-[0.98] disabled:from-white/10 disabled:to-white/10 disabled:font-normal disabled:text-inverse-on-surface/50"
          >
            {merging ? '조합 중...' : '조합하기'}
          </button>
        </div>
        {!auto && (
          <p className="text-center text-label-sm text-inverse-on-surface/60">
            {AUTO_MIN_STACK}개 이상 쌓인 조각을 다 모아도 10개가 안 돼요(달성용 4개는 빼고). 아래에서 직접 넣어 주세요.
          </p>
        )}
        {failed && (
          <p role="alert" className="text-center text-body-sm text-inverse-primary">
            조합하지 못했어요. 다시 시도해 주세요.
          </p>
        )}
      </section>

      <section aria-labelledby="piles-title" className="space-y-2">
        <h2 id="piles-title" className="text-label-lg font-bold">
          가진 {gradeLabel(grade)} 장소 조각 · 눌러서 넣기
        </h2>
        {piles.length === 0 ? (
          <p className="rounded-xl bg-white/[0.04] px-space-md py-space-md text-center text-body-sm text-inverse-on-surface/60">
            {gradeLabel(grade)} 조각이 아직 없어요. 상자를 열어 모아 보세요.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {piles.map((stack) => {
              const left = stack.count - used(stack)
              return (
                <li key={key(stack)}>
                  <button
                    type="button"
                    disabled={left === 0 || full || merging}
                    onClick={() => setSlots((prev) => [...prev, { spaceId: stack.spaceId, source: stack.source }])}
                    aria-label={`${placeName(stack.spaceId)} ${stack.source === 'stage' ? '단계' : '보관'} 조각 넣기, ${left}개 남음`}
                    className="relative flex w-full flex-col items-center gap-0.5 rounded-xl bg-white/[0.05] px-1 pb-2 pt-3 transition-colors hover:bg-white/[0.09] disabled:opacity-40"
                  >
                    <CountBadge count={left} className="absolute right-1 top-1" />
                    <PuzzlePiece grade={grade} slot={0} className="h-10 w-10" />
                    <span className="max-w-full truncate text-label-sm font-bold">{placeName(stack.spaceId).split('/')[0]}</span>
                    <span className="text-[11px] text-inverse-on-surface/60">{stack.source === 'stage' ? '단계 조각' : '보관 조각'}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <p className="text-label-sm text-inverse-on-surface/60">
          단계 조각을 넣으면 그 장소의 +N이 줄어요.
        </p>
      </section>

      {made && (
        <Sheet labelledBy="combine-result-title" tone="cabinet" placement="center" onClose={() => setMade(null)}>
          <div className="space-y-4 text-center">
            <div className="animate-badge-bounce relative mx-auto w-fit">
              <CountBadge count={made.piece.count} className="absolute -top-1 right-0 z-10 px-2 text-label-md leading-6" />
              <PuzzlePiece
                grade={made.piece.grade}
                slot={made.piece.slot}
                className="h-24 w-24 drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]"
              />
            </div>
            <div className="space-y-0.5">
              <h2 id="combine-result-title" className="font-heading text-headline-md">
                <span style={{ color: gradeColor(made.piece.grade).hex }}>{gradeLabel(made.piece.grade)}</span>{' '}
                {placeName(made.piece.spaceId)} 조각을 얻었어요!
              </h2>
              <p className="text-body-sm text-inverse-on-surface/70">{made.itemName}</p>
              <p className="text-body-sm text-inverse-on-surface/70">
                {made.piece.source === 'stage'
                  ? `${placeName(made.piece.spaceId)} +${made.piece.count}${made.piece.ready ? ' · 홈에서 달성할 수 있어요!' : ''}`
                  : '그 장소의 지금 단계가 아니라 조합 재료로 보관했어요.'}
              </p>
            </div>
            <button
              type="button"
              data-autofocus
              onClick={() => setMade(null)}
              className="min-h-12 w-full rounded-xl bg-white/[0.08] text-label-lg transition-colors hover:bg-white/[0.12]"
            >
              확인
            </button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
