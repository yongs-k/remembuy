import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getRankingForCategory, getCompletedPodium } from '../state/selectors'
import { PodiumItemCard } from '../components/PodiumItemCard'
import { Icon, LOCATION_MATERIAL_ICON } from '../data/materialIcons'
import { LOCATION_COLOR_HEX } from '../data/locationColors'
import { getDeviceId } from '../lib/deviceId'
import { useBack } from '../hooks/useBack'

type GlobalRankingEntry = { name: string; masterItemId: string | null; score: number; voters: number }

type DrillLevel = { level: 'categories' } | { level: 'products'; categoryId: string }

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
  const goBack = useBack()
  // The drill-down lives in the URL so the phone's back gesture steps out of it.
  const [searchParams, setSearchParams] = useSearchParams()
  const cat = searchParams.get('cat')
  // Memoized: the effects below refetch whenever drill changes identity.
  const drill = useMemo<DrillLevel>(
    () => (cat ? { level: 'products', categoryId: cat } : { level: 'categories' }),
    [cat]
  )
  function setDrill(next: DrillLevel) {
    setSearchParams(next.level === 'products' ? { cat: next.categoryId } : {})
  }

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

  if (drill.level === 'categories') {
    return (
      <div className="space-y-space-lg p-margin">
        <div>
          <h1 className="font-heading text-display-sm text-on-surface">랭킹</h1>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            카테고리마다 내가 고른 1·2·3등이에요. 눌러서 순위를 정하고 바로 구매할 수 있어요.
          </p>
        </div>
        {locations.map((location) => {
          const locationCategories = categories.filter((c) => c.locationId === location.id)
          if (locationCategories.length === 0) return null
          const color = LOCATION_COLOR_HEX[location.colorToken]
          return (
            <section key={location.id} aria-labelledby={`rank-${location.id}`} className="space-y-space-sm">
              <h2
                id={`rank-${location.id}`}
                className="flex items-center gap-1.5 font-heading text-headline-md text-on-surface"
              >
                {location.name}
              </h2>
              <ul className={listCls}>
                {locationCategories.map((category) => {
                  const ranked = getRankingForCategory(items, category.id)
                  return (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() => setDrill({ level: 'products', categoryId: category.id })}
                        className="flex min-h-14 w-full items-center gap-3 px-space-md py-2 text-left transition-colors hover:bg-surface-container-low"
                      >
                        <span
                          aria-hidden
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant"
                          style={color ? { backgroundColor: `${color}26`, color } : undefined}
                        >
                          <Icon name={LOCATION_MATERIAL_ICON[location.colorToken] ?? 'category'} className="text-[20px]" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-label-lg text-on-surface">{category.name}</span>
                          <span className="truncate text-body-sm text-on-surface-variant">
                            {ranked.length === 0 ? '아직 기록이 없어요' : `1등 ${ranked[0].name} · ${ranked.length}개`}
                          </span>
                        </span>
                        <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    )
  }

  const category = categories.find((c) => c.id === drill.categoryId)
  const ranking = getRankingForCategory(items, drill.categoryId)

  return (
    <div className="flex flex-col gap-space-md p-margin">
      <BackPill label="카테고리 목록" onClick={() => goBack(() => setDrill({ level: 'categories' }))} />
      <h1 className="font-heading text-display-sm text-on-surface">{category?.name}</h1>
      <p className="-mt-2 text-body-sm text-on-surface-variant">
        순위 지정으로 1·2·3등을 바꿀 수 있어요. 정하지 않으면 추천한 상품이 먼저 와요.
      </p>

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
        onClick={() =>
          navigate('/new', {
            state: { prefill: { manual: true, locationId: category?.locationId, categoryId: drill.categoryId } },
          })
        }
        className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-hairline bg-surface-container-lowest text-label-lg text-on-surface transition-colors hover:bg-surface-container-low"
      >
        <Icon name="add" className="text-[20px]" />
        이 카테고리에 기록하기
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
