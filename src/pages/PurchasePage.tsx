import { useEffect, useState } from 'react'
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications } from '../state/selectors'
import { ButlerHero } from '../components/ButlerHero'
import { DealCard } from '../components/DealCard'
import { GroupBuyCard } from '../components/GroupBuyCard'
import { Icon } from '../data/materialIcons'
import { DUMMY_PROFILE } from '../data/homeDummy'
import { DUMMY_BUTLER, DUMMY_DEALS, DUMMY_PARTIES, percentOff, type DealKind } from '../data/purchaseDummy'

type Filter = 'all' | DealKind

export default function PurchasePage() {
  const { items, locations } = useLocker()
  const [filter, setFilter] = useState<Filter>('all')
  const [notice, setNotice] = useState<{ id: number } | null>(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 2500)
    return () => clearTimeout(timer)
  }, [notice])

  const showNotice = () => setNotice({ id: Date.now() })

  const urgent = getUpcomingNotifications(items, 30)[0]
  const fallback = DUMMY_BUTLER.fallback
  const heroName = urgent?.name ?? fallback.name
  const heroLocation =
    (urgent && locations.find((l) => l.id === urgent.locationId)?.name) || fallback.locationName
  const heroDays = Math.max(0, urgent?.daysUntilEmpty ?? fallback.daysUntilEmpty)

  const chips: Array<{ key: Filter; label: string; count: number }> = [
    { key: 'all', label: '전체 특가', count: DUMMY_DEALS.length },
    { key: 'owned', label: '내 도감 등록템', count: DUMMY_DEALS.filter((d) => d.kind === 'owned').length },
    { key: 'unowned', label: '미등록 아이템', count: DUMMY_DEALS.filter((d) => d.kind === 'unowned').length },
  ]
  const visibleDeals = DUMMY_DEALS.filter((d) => filter === 'all' || d.kind === filter)
  const maxOff = Math.max(...DUMMY_DEALS.map((d) => percentOff(d.originalPrice, d.price)))

  return (
    <div className="space-y-space-lg p-margin">
      <ButlerHero
        greetingName={DUMMY_PROFILE.name}
        itemName={heroName}
        locationName={heroLocation}
        daysUntilEmpty={heroDays}
        onAction={showNotice}
      />

      <section className="space-y-space-sm">
        <div className="flex items-center justify-between gap-space-sm">
          <h2 className="flex items-center gap-1.5 font-heading text-headline-md text-on-surface">
            <Icon name="local_fire_department" className="text-[22px] text-primary" />
            도감 위시 &amp; 특가 레이더
          </h2>
          <span className="shrink-0 rounded-full bg-error-container px-2 py-0.5 text-label-sm text-on-error-container">
            최대 {maxOff}% OFF
          </span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-space-xs">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-label-md ${
                filter === chip.key
                  ? 'bg-primary text-on-primary shadow-[0_2px_0px_#8b1901]'
                  : 'bg-surface-container text-on-surface-variant shadow-[0_2px_0px_#e1bfb8]'
              }`}
            >
              {chip.label} ({chip.count})
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-space-sm">
          {visibleDeals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onAction={showNotice} />
          ))}
          {visibleDeals.length === 0 && (
            <p className="text-body-sm text-on-surface-variant">해당하는 특가가 없어요.</p>
          )}
        </div>
      </section>

      <section className="space-y-space-sm">
        <div className="flex items-center justify-between gap-space-sm">
          <h2 className="flex items-center gap-1.5 font-heading text-headline-md text-on-surface">
            <Icon name="groups_2" className="text-[22px] text-secondary" />
            이웃 수집가 실시간 공구 파티
          </h2>
          <span className="shrink-0 rounded-full bg-secondary-container px-2 py-0.5 text-label-sm text-on-secondary-container">
            동네 거점 매칭
          </span>
        </div>
        <p className="text-body-sm text-on-surface-variant">
          혼자 사면 비싼 대용량 생필품, 최대 30% 추가 절약 + 퀘스트 배지 획득!
        </p>
        <GroupBuyCard party={DUMMY_PARTIES.featured} variant="featured" onAction={showNotice} />
        {DUMMY_PARTIES.compact.map((party) => (
          <GroupBuyCard key={party.id} party={party} variant="compact" onAction={showNotice} />
        ))}
      </section>

      <section className="flex items-center justify-between gap-space-sm rounded-2xl bg-gradient-to-r from-tertiary to-primary p-space-md text-on-primary shadow-[0_4px_0px_#8b1901]">
        <div className="flex min-w-0 flex-col">
          <span className="text-label-sm">원하는 물품이 없나요?</span>
          <span className="font-heading text-headline-md">내가 직접 공구 파티 열기</span>
          <span className="text-body-sm opacity-90">방장 개설 시 즉시 +100P &amp; 무료 배송</span>
        </div>
        <button
          type="button"
          onClick={showNotice}
          className="flex shrink-0 items-center gap-1 rounded-xl bg-surface-container-lowest px-3 py-2 text-label-lg text-primary shadow-[0_2px_0px_rgba(0,0,0,0.15)] active:translate-y-0.5"
        >
          <Icon name="add_circle" className="text-[18px]" />
          파티 개설
        </button>
      </section>

      {notice && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit max-w-[90%] rounded-full bg-inverse-surface px-4 py-2 text-label-md text-inverse-on-surface shadow-[0_4px_12px_rgba(0,0,0,0.2)] md:bottom-8"
        >
          아직 준비 중인 기능이에요
        </div>
      )}
    </div>
  )
}
