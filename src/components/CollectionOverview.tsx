import { useState } from 'react'
import type { Category, Item, Location } from '../types'
import { getLocationCompletion, getMasterItemCounts } from '../state/selectors'
import { LocationDexCard } from './LocationDexCard'

type Filter = 'all' | 'progress' | 'almost' | 'none'

export function CollectionOverview({
  items,
  locations,
  categories,
  onOpen,
}: {
  items: Item[]
  locations: Location[]
  categories: Category[]
  onOpen: (locationId: string) => void
}) {
  const [filter, setFilter] = useState<Filter>('all')

  const overall = getMasterItemCounts(items, categories)
  const overallPercent = overall.total === 0 ? 0 : Math.round((overall.owned / overall.total) * 100)

  const rows = locations.map((location) => ({
    location,
    percent: getLocationCompletion(items, location.id, categories),
    ...getMasterItemCounts(items, categories, location.id),
  }))
  const matches: Record<Filter, (p: number) => boolean> = {
    all: () => true,
    progress: (p) => p > 0 && p < 100,
    almost: (p) => p >= 70 && p < 100,
    none: (p) => p === 0,
  }
  const chips: Array<{ key: Filter; label: string }> = [
    { key: 'all', label: '전체' },
    { key: 'progress', label: '진행 중' },
    { key: 'almost', label: '완성 임박' },
    { key: 'none', label: '미시작' },
  ]
  const visible = rows.filter((r) => matches[filter](r.percent))
  const completedCount = rows.filter((r) => r.percent >= 100).length

  return (
    <div className="space-y-space-lg p-margin">
      <section className="space-y-space-sm">
        <h1 className="font-heading text-display-sm text-on-surface">컬렉션</h1>
        <p className="text-body-md text-on-surface-variant">
          표준 소모품 {overall.total}종 중 <strong className="text-on-surface">{overall.owned}종</strong>을
          모았어요
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div className="h-full rounded-full bg-secondary" style={{ width: `${overallPercent}%` }} />
        </div>
        <dl className="grid grid-cols-3 divide-x divide-hairline rounded-2xl border border-hairline bg-surface-container-lowest py-space-md text-center shadow-card">
          {(
            [
              ['수집률', `${overallPercent}%`],
              ['등록 상품', `${items.length}개`],
              ['완성한 공간', `${completedCount}/${locations.length}`],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex flex-col-reverse gap-0.5">
              <dt className="text-label-sm text-on-surface-variant">{label}</dt>
              <dd className="font-heading text-stat-counter tabular-nums text-on-surface">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-space-sm">
        <h2 className="font-heading text-headline-md text-on-surface">공간별 도감</h2>
        <div className="flex gap-1.5 overflow-x-auto pb-space-xs [scrollbar-width:none]">
          {chips.map((chip) => {
            const count = rows.filter((r) => matches[chip.key](r.percent)).length
            const active = filter === chip.key
            return (
              <button
                key={chip.key}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(chip.key)}
                className={`min-h-9 shrink-0 rounded-full px-3 text-label-md ${
                  active ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {chip.label} {count}
              </button>
            )
          })}
        </div>
        {visible.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">해당하는 공간이 없어요.</p>
        ) : (
          <ul className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest shadow-card">
            {visible.map((row) => (
              <li key={row.location.id}>
                <LocationDexCard
                  location={row.location}
                  percent={row.percent}
                  owned={row.owned}
                  total={row.total}
                  onOpen={() => onOpen(row.location.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
