import { useState } from 'react'
import type { Category, Item, Location } from '../types'
import { getLocationCompletion, getMasterItemCounts } from '../state/selectors'
import { LocationDexCard } from './LocationDexCard'
import { Icon } from '../data/materialIcons'
import {
  DUMMY_BADGES,
  DUMMY_COLLECTION_PROFILE,
  DUMMY_MONTHLY_QUEST,
} from '../data/collectionDummy'

type Filter = 'all' | 'progress' | 'almost' | 'none'

const BADGE_TONES = [
  'bg-secondary-fixed text-secondary',
  'bg-primary-fixed text-primary',
  'bg-tertiary-fixed text-tertiary',
]

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
  const P = DUMMY_COLLECTION_PROFILE
  const Q = DUMMY_MONTHLY_QUEST

  const overall = getMasterItemCounts(items, categories)
  const overallPercent = overall.total === 0 ? 0 : Math.round((overall.owned / overall.total) * 100)
  const expPercent = Math.round((P.exp.current / P.exp.total) * 100)
  const questPercent = Math.round((Q.progress.current / Q.progress.total) * 100)

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

  return (
    <div className="space-y-space-lg p-margin">
      <section className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-space-md shadow-[0_4px_0px_#e1bfb8]">
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-primary-fixed-dim/20 blur-2xl" />
        <div className="relative mb-space-md flex items-center gap-space-sm">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container shadow-[0_2px_0px_#aecdc4]">
              <Icon name="auto_stories" className="text-[26px]" />
            </div>
            <span className="absolute -bottom-1 -right-1 rounded-full bg-tertiary-container px-1 text-[9px] font-bold text-on-tertiary-container shadow-sm">
              {P.levelLabel}
            </span>
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-heading text-headline-md text-on-surface">{P.title}</span>
            <span className="text-body-sm text-on-surface-variant">
              다음 등급 <span className="font-bold text-primary">{P.nextLevel}</span>까지{' '}
              {P.exp.total - P.exp.current} EXP
            </span>
          </div>
        </div>
        <div className="relative mb-space-md">
          <div className="mb-1 flex items-center justify-between text-label-sm">
            <span className="text-on-surface-variant">도감 경험치 게이지</span>
            <span className="text-primary">
              {P.exp.current} / {P.exp.total} EXP{' '}
              <span className="font-normal text-on-surface-variant">({expPercent}%)</span>
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-container-high p-0.5">
            <div className="h-full rounded-full bg-primary-container" style={{ width: `${expPercent}%` }} />
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-space-xs">
          <div className="flex flex-col items-center rounded-lg bg-surface-container-low p-2.5 text-center shadow-[0_2px_0px_#f0e6e4]">
            <span className="mb-0.5 text-label-sm text-on-surface-variant">전체 수집률</span>
            <span className="font-heading text-stat-counter text-primary">
              {overallPercent}
              <span className="text-label-sm">%</span>
            </span>
            <span className="text-[11px] text-on-surface-variant">
              {overall.owned} / {overall.total}개
            </span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-surface-container-low p-2.5 text-center shadow-[0_2px_0px_#f0e6e4]">
            <span className="mb-0.5 text-label-sm text-on-surface-variant">보유 배지</span>
            <span className="font-heading text-stat-counter text-tertiary">
              {P.badges.owned}
              <span className="text-label-sm text-on-surface-variant"> / {P.badges.total}</span>
            </span>
            <span className="text-[11px] font-bold text-tertiary">+{P.badges.unlockable} 해금 가능</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-surface-container-low p-2.5 text-center shadow-[0_2px_0px_#f0e6e4]">
            <span className="mb-0.5 text-label-sm text-on-surface-variant">누적 절약액</span>
            <span className="font-heading text-headline-md text-secondary">
              {P.savedLabel}
              <span className="text-label-sm">원</span>
            </span>
            <span className="text-[11px] text-secondary">알뜰 소비중</span>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-space-sm flex items-center gap-1.5">
          <Icon name="military_tech" className="text-[20px] text-tertiary" />
          <h2 className="font-heading text-headline-md text-on-surface">수집 업적 배지함</h2>
        </div>
        <div className="flex snap-x gap-space-sm overflow-x-auto pb-space-xs">
          {DUMMY_BADGES.map((badge, index) =>
            badge.state === 'done' ? (
              <div
                key={badge.id}
                className="flex w-28 shrink-0 snap-start flex-col items-center rounded-xl bg-surface-container-lowest p-2.5 text-center shadow-[0_3px_0px_#e1bfb8]"
              >
                <div
                  className={`mb-1.5 flex h-12 w-12 items-center justify-center rounded-full ${BADGE_TONES[index % BADGE_TONES.length]}`}
                >
                  <Icon name={badge.icon} className="text-[24px]" />
                </div>
                <span className="w-full truncate text-label-sm text-on-surface">{badge.name}</span>
                <span className="mt-1 flex items-center gap-0.5 rounded bg-secondary-container px-1.5 py-0.5 text-[10px] font-bold text-on-secondary-container">
                  <Icon name="check" className="text-[11px]" />
                  {badge.tag}
                </span>
              </div>
            ) : (
              <div
                key={badge.id}
                className="flex w-28 shrink-0 snap-start flex-col items-center rounded-xl bg-surface-container-low p-2.5 text-center shadow-[0_3px_0px_#eae0de]"
              >
                <div className="relative mb-1.5 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
                  <Icon name={badge.icon} className="text-[24px] opacity-40" />
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-inverse-surface/40">
                    <Icon name="lock" className="text-[16px] text-white" />
                  </div>
                </div>
                <span className="w-full truncate text-label-sm text-on-surface-variant">{badge.name}</span>
                {badge.progress !== undefined ? (
                  <div className="mt-1 flex w-full flex-col items-center">
                    <span className="text-[10px] font-bold text-on-surface-variant">{badge.progress}% 진행</span>
                    <div className="mt-0.5 h-1 w-14 overflow-hidden rounded-full bg-surface-variant">
                      <div className="h-full rounded-full bg-tertiary" style={{ width: `${badge.progress}%` }} />
                    </div>
                  </div>
                ) : (
                  <span className="mt-1 text-[10px] text-on-surface-variant">{badge.hint}</span>
                )}
              </div>
            )
          )}
        </div>
      </section>

      <section className="rounded-xl bg-surface-container-high p-space-md shadow-[0_4px_0px_#e1bfb8]">
        <div className="flex items-start justify-between gap-space-sm">
          <div className="flex flex-col">
            <span className="flex items-center gap-1 text-label-sm uppercase tracking-wider text-primary">
              <Icon name="event_upcoming" className="text-[16px]" />
              이달의 챌린지 퀘스트
            </span>
            <h3 className="mt-0.5 font-heading text-headline-md text-on-surface">{Q.title}</h3>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">{Q.reward}</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-tertiary-fixed text-tertiary shadow-[0_2px_0px_#ffb95f]">
            <Icon name={Q.icon} className="text-[28px]" />
          </div>
        </div>
        <div className="mt-space-sm">
          <div className="mb-1 flex justify-between text-label-sm">
            <span className="text-on-surface-variant">진행 상태</span>
            <span className="text-primary">
              {Q.progress.current} / {Q.progress.total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-container">
            <div className="h-full rounded-full bg-primary" style={{ width: `${questPercent}%` }} />
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
                    ? 'bg-primary text-on-primary shadow-[0_2px_0px_#8b1901]'
                    : 'bg-surface-container text-on-surface-variant shadow-[0_2px_0px_#e1bfb8]'
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
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary p-3 text-label-lg text-on-primary shadow-[0_4px_0px_#8b1901] disabled:opacity-60"
      >
        <Icon name="barcode_scanner" className="text-[20px]" />
        바코드 찍고 새 아이템 도감 등록하기
      </button>
    </div>
  )
}
