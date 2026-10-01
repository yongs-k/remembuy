import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../state/GameContext'
import { DexItemCard } from '../components/DexItemCard'
import { GameCatalogStatus } from '../components/GameCatalogStatus'
import { Sheet } from '../components/Sheet'
import { Icon } from '../data/materialIcons'
import { GRADE_ORDER, gradeLabel } from '../data/gradeColors'
import type { DexEntry } from '../lib/gameApi'

export default function DexPage() {
  const { dex } = useGame()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<DexEntry | null>(null)

  return (
    <div className="space-y-4 p-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 relative rounded-full bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']"
      >
        <Icon name="arrow_back" className="text-[16px]" />
        뒤로
      </button>

      <div className="flex items-end justify-between gap-space-sm rounded-2xl bg-inverse-surface p-space-lg text-inverse-on-surface">
        <h1 className="font-heading text-display-sm">아이템 수집함</h1>
        {dex.length > 0 && (
          <span className="shrink-0 font-heading text-stat-counter tabular-nums text-tertiary-fixed-dim">
            {dex.filter((entry) => entry.status === 'COMPLETE').length}/{dex.length}
          </span>
        )}
      </div>

      {dex.length === 0 ? (
        <GameCatalogStatus label="수집함 정보를" />
      ) : (
        GRADE_ORDER.map((grade) => {
          const entries = dex.filter((entry) => entry.grade === grade)
          if (entries.length === 0) return null
          return (
            <div key={grade} className="space-y-2">
              <h2 className="text-label-lg font-bold text-on-surface-variant">{gradeLabel(grade)}</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {entries.map((entry) => (
                  <DexItemCard key={entry.id} entry={entry} onOpen={() => setSelected(entry)} />
                ))}
              </div>
            </div>
          )
        })
      )}

      {selected && (
        <Sheet labelledBy="dex-sheet-title" onClose={() => setSelected(null)}>
          <h2 id="dex-sheet-title" className="text-center font-heading text-headline-md text-on-surface">
            {selected.name}
          </h2>
          <p className="text-center text-body-sm text-on-surface-variant">{gradeLabel(selected.grade)}</p>
          <p className="text-center text-body-sm tabular-nums text-on-surface-variant">
            {selected.fragmentCount} / {selected.fragmentsRequired} 조각
          </p>
          <button
            type="button"
            data-autofocus
            onClick={() => setSelected(null)}
            className="min-h-11 w-full text-center text-body-md text-on-surface-variant"
          >
            닫기
          </button>
        </Sheet>
      )}
    </div>
  )
}
