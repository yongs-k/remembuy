import { useState } from 'react'
import { useGame } from '../state/GameContext'
import { DexItemCard } from '../components/DexItemCard'
import { GRADE_ORDER, gradeLabel } from '../data/gradeColors'
import type { DexEntry } from '../lib/gameApi'

export default function DexPage() {
  const { dex } = useGame()
  const [selected, setSelected] = useState<DexEntry | null>(null)

  return (
    <div className="space-y-4 p-4">
      <h1 className="font-heading text-headline-lg text-on-surface">가상 아이템 도감</h1>

      {dex.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">도감 정보를 불러오는 중...</p>
      ) : (
        GRADE_ORDER.map((grade) => {
          const entries = dex.filter((entry) => entry.grade === grade)
          if (entries.length === 0) return null
          return (
            <div key={grade} className="space-y-2">
              <h2 className="text-label-lg font-bold text-on-surface-variant">{gradeLabel(grade)}</h2>
              <div className="grid grid-cols-2 gap-2">
                {entries.map((entry) => (
                  <DexItemCard key={entry.id} entry={entry} onOpen={() => setSelected(entry)} />
                ))}
              </div>
            </div>
          )
        })
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md space-y-2 rounded-t-2xl bg-surface-container-lowest p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-center font-heading text-headline-md text-on-surface">{selected.name}</p>
            <p className="text-center text-body-sm text-on-surface-variant">{gradeLabel(selected.grade)}</p>
            <p className="text-center text-body-sm text-on-surface-variant">
              {selected.fragmentCount} / {selected.fragmentsRequired} 조각
            </p>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="w-full pt-2 text-center text-body-sm text-on-surface-variant"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
