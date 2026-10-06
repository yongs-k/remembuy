import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../state/GameContext'
import { DexItemCard } from '../components/DexItemCard'
import { GameCatalogStatus } from '../components/GameCatalogStatus'
import { GemPiece } from '../components/Puzzle'
import { Sheet } from '../components/Sheet'
import { Icon } from '../data/materialIcons'
import { GRADE_ORDER, gradeColor, gradeLabel } from '../data/gradeColors'
import { placeName } from '../state/gameProgress'
import type { DexEntry } from '../lib/gameApi'

/** 아이템 수집함: the game's items as piece cards on the espresso cabinet, like the 조합 창. */
export default function DexPage() {
  const { dex } = useGame()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<DexEntry | null>(null)
  const completed = dex.filter((entry) => entry.status === 'COMPLETE').length

  return (
    <div
      className="-mb-20 min-h-[calc(100%+5rem)] space-y-space-md bg-inverse-surface px-4 pb-28 pt-space-md text-inverse-on-surface"
      style={{ backgroundImage: 'radial-gradient(ellipse 90% 40% at 50% 15%, rgb(255 185 95 / 0.14), transparent 70%)' }}
    >
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="relative inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-3 py-1.5 text-label-md text-inverse-on-surface/80 transition-colors before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] hover:bg-white/[0.12]"
      >
        <Icon name="arrow_back" className="text-[16px]" />
        뒤로
      </button>

      <div className="space-y-1 text-center">
        <h1 className="font-heading text-display-sm text-tertiary-fixed">아이템 수집함</h1>
        <p className="text-body-sm text-inverse-on-surface/70">
          상자를 열 때마다 그 아이템의 아이템 조각이 쌓이고, 다 모으면 완성돼요.
          {dex.length > 0 && (
            <>
              {' '}
              <strong className="tabular-nums text-tertiary-fixed-dim">
                {completed}/{dex.length}
              </strong>{' '}
              완성
            </>
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate('/dex/combine')}
        className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-[#f8dc9a] to-[#d9a24c] text-label-lg font-bold text-on-tertiary-fixed active:scale-[0.98]"
      >
        <Icon name="extension" className="text-[20px]" />
        장소 조각 조합
      </button>

      {dex.length === 0 ? (
        <div className="rounded-2xl bg-surface p-space-md text-on-surface">
          <GameCatalogStatus label="수집함 정보를" />
        </div>
      ) : (
        GRADE_ORDER.map((grade) => {
          const entries = dex.filter((entry) => entry.grade === grade)
          if (entries.length === 0) return null
          const done = entries.filter((entry) => entry.status === 'COMPLETE').length
          return (
            <section key={grade} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-label-lg font-bold" style={{ color: gradeColor(grade).hex }}>
                  {gradeLabel(grade)}
                </h2>
                <span className="text-label-sm tabular-nums text-inverse-on-surface/60">
                  {done}/{entries.length} 완성
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {entries.map((entry) => (
                  <DexItemCard key={entry.id} entry={entry} onOpen={() => setSelected(entry)} />
                ))}
              </div>
            </section>
          )
        })
      )}

      {selected && (
        <Sheet labelledBy="dex-sheet-title" onClose={() => setSelected(null)} tone="cabinet" placement="center">
          <div className="space-y-3 text-center">
            <GemPiece grade={selected.grade} className="mx-auto h-20 w-20 drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]" />
            <div className="space-y-0.5">
              <h2 id="dex-sheet-title" className="font-heading text-headline-md">
                {selected.name}
              </h2>
              <p className="text-body-sm" style={{ color: gradeColor(selected.grade).hex }}>
                {gradeLabel(selected.grade)}
                {selected.roomType && <span className="text-inverse-on-surface/70"> · {placeName(selected.roomType)}</span>}
              </p>
              <p className="text-body-sm tabular-nums text-inverse-on-surface/70">
                아이템 조각 {selected.fragmentCount} / {selected.fragmentsRequired}
              </p>
            </div>
            <button
              type="button"
              data-autofocus
              onClick={() => setSelected(null)}
              className="min-h-12 w-full rounded-xl bg-white/[0.08] text-label-lg transition-colors hover:bg-white/[0.12]"
            >
              닫기
            </button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
