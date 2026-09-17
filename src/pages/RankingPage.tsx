import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import {
  getLocationsRankedByItemCount,
  getCategoriesRankedByItemCount,
  getRankingForCategory,
  getCompletedPodium,
} from '../state/selectors'
import { RecommendationBadge } from '../components/RecommendationBadge'
import { Badge } from '../components/Badge'
import { getDeviceId } from '../lib/deviceId'

type GlobalRankingEntry = { name: string; masterItemId: string | null; score: number; voters: number }

type DrillLevel =
  | { level: 'locations' }
  | { level: 'categories'; locationId: string }
  | { level: 'products'; locationId: string; categoryId: string }

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

  if (drill.level === 'locations') {
    const ranked = getLocationsRankedByItemCount(items, locations)
    return (
      <div className="space-y-4 p-4">
        <h1 className="text-xl font-bold">랭킹</h1>
        <ul className="space-y-2">
          {ranked.map(({ location, itemCount }) => (
            <li
              key={location.id}
              onClick={() => setDrill({ level: 'categories', locationId: location.id })}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-ink/10 bg-card p-3"
            >
              <span className="font-medium">{location.name}</span>
              <span className="text-sm text-ink/50">{itemCount}개 저장됨</span>
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
      <div className="space-y-4 p-4">
        <button
          type="button"
          onClick={() => setDrill({ level: 'locations' })}
          className="text-sm text-ink/60"
        >
          ← 장소 목록
        </button>
        <h1 className="text-xl font-bold">{location?.name}</h1>
        <ul className="space-y-2">
          {ranked.map(({ category, itemCount }) => (
            <li
              key={category.id}
              onClick={() =>
                setDrill({
                  level: 'products',
                  locationId: drill.locationId,
                  categoryId: category.id,
                })
              }
              className="flex cursor-pointer items-center justify-between rounded-lg border border-ink/10 bg-card p-3"
            >
              <span className="font-medium">{category.name}</span>
              <span className="text-sm text-ink/50">{itemCount}개 등록됨</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const category = categories.find((c) => c.id === drill.categoryId)
  const ranking = getRankingForCategory(items, drill.categoryId)

  return (
    <div className="space-y-4 p-4">
      <button
        type="button"
        onClick={() => setDrill({ level: 'categories', locationId: drill.locationId })}
        className="text-sm text-ink/60"
      >
        ← 카테고리 목록
      </button>
      <h1 className="text-xl font-bold">{category?.name}</h1>

      {ranking.length === 0 ? (
        <p className="text-sm text-ink/50">이 카테고리에는 기록된 상품이 없습니다.</p>
      ) : (
        <ol className="space-y-2">
          {ranking.map((item, index) => (
            <li
              key={item.id}
              onClick={() => navigate(`/item/${item.id}`)}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-ink/10 bg-card p-3"
            >
              <span className="w-6 text-center font-heading text-lg">{index + 1}</span>
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                {item.recommendation !== undefined && (
                  <RecommendationBadge recommendation={item.recommendation} />
                )}
              </div>
              <div className="flex gap-1 text-lg">
                {([1, 2, 3] as const).map((rank) => {
                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
                  const isAssigned = item.podiumRank === rank
                  return (
                    <button
                      key={rank}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPodiumRank(item.id, item.categoryId, isAssigned ? null : rank)
                      }}
                      className={isAssigned ? 'opacity-100' : 'opacity-30'}
                      aria-label={`${rank}등으로 지정`}
                    >
                      {medal}
                    </button>
                  )
                })}
              </div>
              {item.podiumRank === 1 && <Badge>다시 살래요</Badge>}
            </li>
          ))}
        </ol>
      )}

      <div className="space-y-2 border-t border-ink/10 pt-4">
        <h2 className="text-sm font-medium text-ink/70">🌍 전체 유저 인기 랭킹</h2>
        {globalRanking === null ? (
          <p className="text-sm text-ink/40">불러오는 중...</p>
        ) : globalRanking.length === 0 ? (
          <p className="text-sm text-ink/40">아직 데이터가 부족해요.</p>
        ) : (
          <ol className="space-y-1">
            {globalRanking.map((entry, i) => (
              <li
                key={`${entry.masterItemId ?? entry.name}-${i}`}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {i + 1}. {entry.name}
                </span>
                <span className="text-ink/40">{entry.voters}명 선택</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
