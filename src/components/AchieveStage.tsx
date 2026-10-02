import { useState } from 'react'
import { useGame } from '../state/GameContext'
import { GRADE_ORDER, gradeColor, gradeLabel } from '../data/gradeColors'
import { placeName } from '../state/gameProgress'
import { PuzzleBoard } from './Puzzle'
import { Sheet } from './Sheet'

/**
 * 달성 on a 장소 tile: spends four pieces, moves the 장소 to the next grade and
 * celebrates the title it earned (e.g. 일반 욕실) in a centred card.
 */
export function useAchieveStage() {
  const { achieve } = useGame()
  const [busy, setBusy] = useState<string | null>(null)
  const [done, setDone] = useState<{ spaceId: string; grade: string } | null>(null)

  async function run(spaceId: string) {
    setBusy(spaceId)
    const achieved = await achieve(spaceId)
    setBusy(null)
    if (achieved) setDone(achieved)
  }

  const next = done && GRADE_ORDER[GRADE_ORDER.indexOf(done.grade as (typeof GRADE_ORDER)[number]) + 1]
  const sheet = done && (
    <Sheet labelledBy="achieve-title" tone="cabinet" placement="center" onClose={() => setDone(null)}>
      <div className="space-y-4 text-center">
        <PuzzleBoard
          grade={done.grade}
          pieces={[1, 1, 1, 1]}
          className="animate-badge-bounce mx-auto h-24 w-24 text-inverse-on-surface drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]"
        />
        <div className="space-y-1">
          <h2 id="achieve-title" className="font-heading text-headline-md">
            {gradeLabel(done.grade)} {placeName(done.spaceId)} 달성!
          </h2>
          <p className="text-body-sm text-inverse-on-surface/70">
            칭호 &lsquo;{gradeLabel(done.grade)} {placeName(done.spaceId)}&rsquo;을 받았어요.
            <br />
            {next ? (
              <>
                이제{' '}
                <strong className="font-bold" style={{ color: gradeColor(next).hex }}>
                  {gradeLabel(next)}
                </strong>{' '}
                조각을 모아요.
              </>
            ) : (
              '전설까지 모두 달성했어요.'
            )}
          </p>
        </div>
        <button
          type="button"
          data-autofocus
          onClick={() => setDone(null)}
          className="min-h-12 w-full rounded-xl bg-white/[0.08] text-label-lg transition-colors hover:bg-white/[0.12]"
        >
          확인
        </button>
      </div>
    </Sheet>
  )

  return { run, busy, sheet }
}
