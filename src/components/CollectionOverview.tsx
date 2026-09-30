import { useState } from 'react'
import type { Category, Item, Location } from '../types'
import { getLocationCompletion, getMasterItemCounts } from '../state/selectors'
import { LocationDexCard } from './LocationDexCard'
import { Icon } from '../data/materialIcons'

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

  const rows = locations.map((location, index) => ({
    location,
    rank: index + 1,
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
    { key: 'progress', label: '수집 진행 중' },
    { key: 'almost', label: '완성 임박' },
    { key: 'none', label: '미시작' },
  ]
  const visible = rows.filter((r) => matches[filter](r.percent))
  const completedCount = rows.filter((r) => r.percent >= 100).length

  return (
    <div className="space-y-space-lg p-margin">
      <section className="rounded-xl bg-surface-container-lowest p-space-md">
        <div className="mb-space-sm flex items-center gap-space-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
            <Icon name="auto_stories" className="text-[26px]" />
          </div>
          <div className="flex min-w-0 flex-col">
            <h1 className="font-heading text-headline-md text-on-surface">내 도감 현황</h1>
            <span className="text-body-sm text-on-surface-variant">
              표준 소모품 {overall.total}종 중 <span className="font-bold text-primary">{overall.owned}종</span> 수집
            </span>
          </div>
        </div>
        <div className="mb-space-md h-2.5 w-full overflow-hidden rounded-full bg-surface-container-high p-0.5">
          <div className="h-full rounded-full bg-primary-container" style={{ width: `${overallPercent}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-space-xs">
          <div className="flex flex-col items-center rounded-lg bg-surface-container-low p-2.5 text-center">
            <span className="mb-0.5 text-label-sm text-on-surface-variant">전체 수집률</span>
            <span className="font-heading text-stat-counter text-primary">
              {overallPercent}
              <span className="text-label-sm">%</span>
            </span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-surface-container-low p-2.5 text-center">
            <span className="mb-0.5 text-label-sm text-on-surface-variant">등록 상품</span>
            <span className="font-heading text-stat-counter text-tertiary">
              {items.length}
              <span className="text-label-sm">개</span>
            </span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-surface-container-low p-2.5 text-center">
            <span className="mb-0.5 text-label-sm text-on-surface-variant">완성한 공간</span>
            <span className="font-heading text-stat-counter text-secondary">
              {completedCount}
              <span className="text-label-sm text-on-surface-variant"> / {locations.length}</span>
            </span>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-space-sm flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon name="shelves" className="text-[20px] text-primary" />
            <h2 className="font-heading text-headline-md text-on-surface">공간별 도감 컬렉션</h2>
          </div>
          <span className="text-label-sm text-on-surface-variant">총 {locations.length}개 공간</span>
        </div>
        <div className="mb-space-sm flex gap-1.5 overflow-x-auto pb-space-sm">
          {chips.map((chip) => {
            const count = rows.filter((r) => matches[chip.key](r.percent)).length
            const active = filter === chip.key
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-label-md ${
                  active
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {chip.label} ({count})
              </button>
            )
          })}
        </div>
        <div className="flex flex-col gap-space-sm">
          {visible.map((row) => (
            <LocationDexCard
              key={row.location.id}
              rank={row.rank}
              location={row.location}
              percent={row.percent}
              owned={row.owned}
              total={row.total}
              onOpen={() => onOpen(row.location.id)}
            />
          ))}
          {visible.length === 0 && (
            <p className="text-body-sm text-on-surface-variant">해당하는 공간이 없어요.</p>
          )}
        </div>
      </section>

      <button
        type="button"
        disabled
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary p-3 text-label-lg text-on-primary disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:shadow-none disabled:opacity-100"
      >
        <Icon name="barcode_scanner" className="text-[20px]" />
        바코드 찍고 새 아이템 도감 등록하기
          <span className="text-label-sm font-normal">준비 중</span>
      </button>
    </div>
  )
}
