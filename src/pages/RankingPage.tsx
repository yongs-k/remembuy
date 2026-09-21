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
      className="flex items-center gap-1 self-start rounded-full bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant"
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

  if (drill.level === 'locations') {
    const ranked = getLocationsRankedByItemCount(items, locations)
    const totalItems = ranked.reduce((sum, r) => sum + r.itemCount, 0)
    return (
      <div className="space-y-space-md p-margin">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 rounded-full bg-error-container px-2.5 py-1 text-label-sm text-on-error-container">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            실시간 집계중
          </span>
          <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
            <Icon name="schedule" className="text-[14px]" />
            매주 월요일 00:00 갱신
          </span>
        </div>
        <div>
          <h1 className="flex items-center gap-1.5 font-heading text-headline-lg text-on-surface">
            명예의 전당 · 도감 랭킹
            <Icon name="workspace_premium" className="text-[22px] text-tertiary" />
          </h1>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            공간별로 가장 많이 채운 도감 순위예요. 총 {totalItems}개 등록됨
          </p>
        </div>
        <ul className="space-y-space-sm">
          {ranked.map(({ location, itemCount }, index) => (
            <li key={location.id}>
              <RankRow
                rank={index + 1}
                hero={index === 0}
                title={location.name}
                subtitle={`${itemCount}개 저장됨 · 완성도 ${getLocationCompletion(items, location.id, categories)}%`}
                icon={LOCATION_MATERIAL_ICON[location.colorToken] ?? 'inventory_2'}
                onClick={() => setDrill({ level: 'categories', locationId: location.id })}
              />
            </li>
          ))}
        </ul>
        <div className="rounded-2xl bg-surface-container p-space-md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tertiary-container text-on-tertiary-container shadow-[0_3px_0px_#653e00]">
              <Icon name="verified" className="text-[26px]" />
            </div>
            <div className="flex flex-col">
              <span className="text-label-md text-tertiary">내 랭킹 기여도</span>
              <p className="mt-0.5 text-body-sm text-on-surface">
                실사용 인증한 랭킹 아이템으로 도감 신뢰도 점수 <strong className="text-primary">+45점</strong>을
                획득했어요!
              </p>
            </div>
          </div>
          <div className="mt-space-sm h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div className="h-full rounded-full bg-primary" style={{ width: '65%' }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-label-sm text-on-surface-variant">
            <span className="flex items-center gap-1">
              <Icon name="stars" className="text-[15px] text-primary" />
              랭킹 1위 상품 도감 신규 등록 시
            </span>
            <span className="text-primary">+30P 추가 보너스</span>
          </div>
        </div>
      </div>
    )
  }

  if (drill.level === 'categories') {
    const location = locations.find((l) => l.id === drill.locationId)
    const ranked = getCategoriesRankedByItemCount(items, categories, drill.locationId)
    return (
      <div className="flex flex-col gap-space-md p-margin">
        <BackPill label="장소 목록" onClick={() => setDrill({ level: 'locations' })} />
        <h1 className="font-heading text-headline-lg text-on-surface">{location?.name}</h1>
        <ul className="space-y-space-sm">
          {ranked.map(({ category, itemCount }, index) => (
            <li key={category.id}>
              <RankRow
                rank={index + 1}
                title={category.name}
                subtitle={`${itemCount}개 등록됨`}
                icon="category"
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
      <h1 className="font-heading text-headline-lg text-on-surface">{category?.name}</h1>

      {ranking.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">이 카테고리에는 기록된 상품이 없습니다.</p>
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

      <div className="flex items-center justify-between rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-space-md">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container-highest text-outline">
            <Icon name="add" className="text-[24px]" />
          </div>
          <div className="flex flex-col">
            <span className="text-label-lg text-on-surface">{ranking.length + 1}위 상품 등록하기</span>
            <span className="text-body-sm text-on-surface-variant">
              자주 쓰는 다른 상품을 이 카테고리에 추가해보세요
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/new')}
          className="rounded-lg bg-surface-container-lowest px-3 py-1.5 text-label-sm text-primary shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        >
          추가
        </button>
      </div>

      <div className="space-y-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]">
        <h2 className="flex items-center gap-1.5 font-heading text-label-lg text-on-surface">
          <Icon name="public" className="text-[18px] text-secondary" />
          전체 유저 인기 랭킹
        </h2>
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
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-label-md ${
                      i === 0
                        ? 'bg-tertiary-fixed text-tertiary'
                        : 'bg-surface-container-high text-outline'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="truncate text-on-surface">{entry.name}</span>
                </span>
                <span className="shrink-0 text-on-surface-variant">{entry.voters}명 선택</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="sticky bottom-20 z-40 flex items-center gap-space-sm md:bottom-4">
        <button
          type="button"
          onClick={() => navigate('/new')}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface-container-lowest p-3 text-label-lg text-on-surface shadow-[0_4px_12px_rgba(0,0,0,0.08),0_3px_0px_rgba(43,38,37,0.12)] active:translate-y-0.5"
        >
          <Icon name="add_box" className="text-[20px] text-primary" />
          아이템 직접등록
        </button>
        <button
          type="button"
          aria-label="바코드 스캔"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary p-3 text-label-lg text-on-primary shadow-[0_4px_12px_rgba(170,48,21,0.25),0_4px_0px_#8b1901] active:translate-y-0.5 active:shadow-[0_1px_0px_#8b1901]"
        >
          <Icon name="barcode_scanner" className="text-[20px]" />
          바코드 찍고 랭킹 등록
        </button>
      </div>
    </div>
  )
}
