import type { DexEntry } from '../lib/gameApi'
import { Icon } from '../data/materialIcons'
import { gradeColor, gradeLabel } from '../data/gradeColors'

export function DexItemCard({ entry, onOpen }: { entry: DexEntry; onOpen: () => void }) {
  if (entry.status === 'LOCKED') {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl bg-surface-container p-space-sm text-center opacity-60">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
          <Icon name="lock" className="text-[18px]" />
        </div>
        <span className="text-label-md text-on-surface-variant">???</span>
      </div>
    )
  }

  const color = gradeColor(entry.grade)
  const percent = Math.min(100, Math.round((entry.fragmentCount / entry.fragmentsRequired) * 100))

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full flex-col items-center gap-1 rounded-xl ${color.bg} p-space-sm text-center ${color.shadow} transition-transform active:scale-95`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest ${color.text}`}>
        <Icon name={entry.status === 'COMPLETE' ? 'check_circle' : 'inventory_2'} className="text-[18px]" />
      </div>
      <span className={`text-label-md font-bold ${color.text}`}>{entry.name}</span>
      <span className="text-label-sm text-on-surface-variant">{gradeLabel(entry.grade)}</span>
      {entry.status === 'COLLECTING' && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-low">
          <div
            data-testid="dex-progress-fill"
            className="h-full rounded-full bg-primary"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </button>
  )
}
