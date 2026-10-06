import { useState } from 'react'
import type { Category, Item, Location } from '../types'
import { getLocationCompletion, getMasterItemCounts } from '../state/selectors'
import { useGame } from '../state/GameContext'
import { HomeLocationTile } from './HomeLocationTile'
import { TitleManager } from './TitleManager'
import { HowToButton } from './HowTo'
import { useAchieveStage } from './AchieveStage'
import { useNavigate } from 'react-router-dom'
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
  const { dex, rooms } = useGame()
  const achieveStage = useAchieveStage()
  const navigate = useNavigate()
  const totalFragments = dex.reduce((sum, entry) => sum + entry.fragmentCount, 0)

  const overall = getMasterItemCounts(items, categories)
  const overallPercent = overall.total === 0 ? 0 : Math.round((overall.owned / overall.total) * 100)

  const rows = locations.map((location) => ({
    location,
    percent: getLocationCompletion(items, location.id, categories),
    count: items.filter((i) => categories.some((c) => c.id === i.categoryId && c.locationId === location.id)).length,
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
  // Only offer filters when one of them would actually narrow the list.
  const showFilters = chips.some((chip) => {
    const count = rows.filter((r) => matches[chip.key](r.percent)).length
    return count > 0 && count < rows.length
  })
  const activeFilter = showFilters ? filter : 'all'
  const visible = rows.filter((r) => matches[activeFilter](r.percent))
  const completedCount = rows.filter((r) => r.percent >= 100).length

  return (
    <div className="space-y-space-lg p-margin">
      {achieveStage.sheet}
      <section className="space-y-space-sm">
        <h1 className="font-heading text-display-sm text-on-surface">컬렉션</h1>
        <p className="text-body-md text-on-surface-variant">
          장소별 소모품 도감이에요. {overall.total}종 중 <strong className="text-on-surface">{overall.owned}종</strong>을 기록했어요.
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div className="h-full rounded-full bg-secondary" style={{ width: `${overallPercent}%` }} />
        </div>
        <dl className="grid grid-cols-3 divide-x divide-hairline rounded-2xl border border-hairline bg-surface-container-lowest py-space-md text-center shadow-card">
          {(
            [
              ['수집률', `${overallPercent}%`],
              dex.length > 0 ? ['아이템 조각', `${totalFragments}개`] : ['등록 상품', `${items.length}개`],
              ['도감 완성 장소', `${completedCount}/${locations.length}`],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex flex-col-reverse gap-0.5">
              <dt className="text-label-sm text-on-surface-variant">{label}</dt>
              <dd className="font-heading text-stat-counter tabular-nums text-on-surface">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <TitleManager />

      <section className="space-y-space-sm">
        <div className="flex items-baseline justify-between gap-space-sm">
          <h2 className="font-heading text-headline-md text-on-surface">장소별 도감</h2>
          <button
            type="button"
            onClick={() => navigate('/dex/combine')}
            className="-my-2 flex min-h-11 shrink-0 items-center gap-0.5 text-label-md text-on-surface-variant"
          >
            장소 조각 조합
            <Icon name="chevron_right" className="text-[18px]" />
          </button>
        </div>
        <div className="-mt-1 flex items-center justify-between gap-space-sm">
          <p className="text-body-sm text-on-surface-variant">장소 조각 +4를 모아 달성하면 등급이 올라가요.</p>
          <HowToButton topic="tiles" />
        </div>
        {showFilters && (
        <div className="flex gap-1.5 overflow-x-auto pb-space-xs [scrollbar-width:none]">
          {chips.map((chip) => {
            const count = rows.filter((r) => matches[chip.key](r.percent)).length
            const active = activeFilter === chip.key
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
        )}
        {visible.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">해당하는 장소가 없어요.</p>
        ) : (
          <div className="grid grid-cols-3 gap-space-sm sm:grid-cols-5">
            {visible.map((row) => (
              <HomeLocationTile
                key={row.location.id}
                location={row.location}
                percent={row.percent}
                count={row.count}
                room={rooms.find((room) => room.spaceId === row.location.id)}
                onAchieve={() => void achieveStage.run(row.location.id)}
                achieving={achieveStage.busy === row.location.id}
                onClick={() => onOpen(row.location.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
