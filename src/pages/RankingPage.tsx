import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import {
  getLocationsRankedByItemCount,
  getCategoriesRankedByItemCount,
  getRankingForCategory,
  getCompletedPodium,
  getLocationCompletion,
} from '../state/selectors'
import { RankRow } from '../components/RankRow'
import { PodiumItemCard } from '../components/PodiumItemCard'
import { Icon, LOCATION_MATERIAL_ICON } from '../data/materialIcons'
import { LOCATION_COLOR_HEX } from '../data/locationColors'
import { getDeviceId } from '../lib/deviceId'

type GlobalRankingEntry = { name: string; masterItemId: string | null; score: number; voters: number }

type DrillLevel =
  | { level: 'locations' }
  | { level: 'categories'; locationId: string }
  | { level: 'products'; locationId: string; categoryId: string }

function BackPill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 self-start relative rounded-full bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']"
    >
      <Icon name="arrow_back" className="text-[16px]" />
      {label}
    </button>
  )
}

export default function RankingPage() {
  const { items, locations, categories, setPodiumRank } = useLocker()
  const navigate = useNavigate()
  const [drill, setDrill] = useState<DrillLevel>({ level: 'locations' })

  const lastSubmittedRef = useRef<string | null>(null)
  const [globalRanking, setGlobalRanking] = useState<GlobalRankingEntry[] | null>(null)

  useEffect(() => {
    if (drill.level !== 'products') return
    const completed = getCompletedPodium(items, drill.categoryId)
    if (!completed) return
    const signature = completed.map((e) => `${e.rank}:${e.item.id}`).join(',')
    if (lastSubmittedRef.current === signature) return
    lastSubmittedRef.current = signature
    fetch('/api/podium-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: getDeviceId(),
        categoryId: drill.categoryId,
        items: completed.map((e) => ({
          rank: e.rank,
          masterItemId: e.item.masterItemId ?? null,
          name: e.item.name,
        })),
      }),
    }).catch(() => {})
  }, [items, drill])

  useEffect(() => {
    if (drill.level !== 'products') return
    let cancelled = false
    setGlobalRanking(null)
    fetch(`/api/podium-rankings/${encodeURIComponent(drill.categoryId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setGlobalRanking(data?.ranking ?? [])
      })
      .catch(() => {
        if (!cancelled) setGlobalRanking([])
      })
    return () => {
      cancelled = true
    }
  }, [drill])

  const listCls =
    'divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest shadow-card'

  if (drill.level === 'locations') {
    const ranked = getLocationsRankedByItemCount(items, locations)
    const totalItems = ranked.reduce((sum, r) => sum + r.itemCount, 0)
    return (
      <div className="space-y-space-md p-margin">
        <div>
          <h1 className="font-heading text-display-sm text-on-surface">내 공간 랭킹</h1>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            기록한 상품이 많은 공간 순서예요. 모두 {totalItems}개를 기록했어요.
          </p>
        </div>
        <ul className={listCls}>
          {ranked.map(({ location, itemCount }, index) => (
            <li key={location.id}>
              <RankRow
                rank={index + 1}
                title={location.name}
                subtitle={`${itemCount}개 기록 · 수집률 ${getLocationCompletion(items, location.id, categories)}%`}
                icon={LOCATION_MATERIAL_ICON[location.colorToken] ?? 'inventory_2'}
                color={LOCATION_COLOR_HEX[location.colorToken]}
                onClick={() => setDrill({ level: 'categories', locationId: location.id })}
              />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (drill.level === 'categories') {
    const location = locations.find((l) => l.id === drill.locationId)
    const ranked = getCategoriesRankedByItemCount(items, categories, drill.locationId)
    return (
      <div className="flex flex-col gap-space-md p-margin">
        <BackPill label="공간 목록" onClick={() => setDrill({ level: 'locations' })} />
        <h1 className="font-heading text-display-sm text-on-surface">{location?.name}</h1>
        <ul className={listCls}>
          {ranked.map(({ category, itemCount }, index) => (
            <li key={category.id}>
              <RankRow
                rank={index + 1}
                title={category.name}
                subtitle={`${itemCount}개 기록`}
                icon={LOCATION_MATERIAL_ICON[location?.colorToken ?? ''] ?? 'category'}
                color={LOCATION_COLOR_HEX[location?.colorToken ?? '']}
                onClick={() =>
                  setDrill({
                    level: 'products',
                    locationId: drill.locationId,
                    categoryId: category.id,
                  })
                }
              />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const category = categories.find((c) => c.id === drill.categoryId)
  const ranking = getRankingForCategory(items, drill.categoryId)

  return (
    <div className="flex flex-col gap-space-md p-margin">
      <BackPill
        label="카테고리 목록"
        onClick={() => setDrill({ level: 'categories', locationId: drill.locationId })}
      />
      <h1 className="font-heading text-display-sm text-on-surface">{category?.name}</h1>

      {ranking.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">이 카테고리에는 기록된 상품이 없어요.</p>
      ) : (
        <ol className="space-y-space-md">
          {ranking.map((item, index) => (
            <li key={item.id}>
              <PodiumItemCard
                item={item}
                index={index}
                onOpen={() => navigate(`/item/${item.id}`)}
                onAssign={(rank) => setPodiumRank(item.id, item.categoryId, rank)}
              />
            </li>
          ))}
        </ol>
      )}

      <button
        type="button"
        onClick={() => navigate('/new')}
        className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-hairline bg-surface-container-lowest text-label-lg text-on-surface transition-colors hover:bg-surface-container-low"
      >
        <Icon name="add" className="text-[20px]" />
        이 카테고리에 상품 추가
      </button>

      <section className="space-y-space-sm rounded-2xl border border-hairline bg-surface-container-lowest p-space-md shadow-card">
        <h2 className="font-heading text-headline-md text-on-surface">다른 사람들이 고른 순위</h2>
        {globalRanking === null ? (
          <p className="text-body-sm text-on-surface-variant">불러오는 중...</p>
        ) : globalRanking.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">아직 데이터가 부족해요.</p>
        ) : (
          <ol className="space-y-1.5">
            {globalRanking.map((entry, i) => (
              <li
                key={`${entry.masterItemId ?? entry.name}-${i}`}
                className="flex items-center justify-between gap-2 text-body-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-5 shrink-0 text-center text-label-md tabular-nums text-on-surface-variant">
                    {i + 1}
                  </span>
                  <span className="truncate text-on-surface">{entry.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-on-surface-variant">{entry.voters}명 선택</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
