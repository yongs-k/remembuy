import { DdayLabel } from '../components/Badge'
import { useNavigate, useParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { RecommendationToggle } from '../components/RecommendationToggle'
import { ItemCard } from '../components/ItemCard'
import { ItemThumb } from '../components/ItemThumb'
import { Icon } from '../data/materialIcons'
import {
  getObservedCycleDays,
  getPurchaseDates,
  getRemainingDays,
  MIN_OBSERVED_GAPS,
  parseRestockCycleDays,
} from '../state/selectors'
import { usePendingPurchases } from '../hooks/usePendingPurchases'

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { items, locations, categories, updateItem, recordPurchase } = useLocker()
  const pendingPurchases = usePendingPurchases()
  const item = items.find((i) => i.id === id)

  if (!item) {
    return (
      <div className="space-y-space-sm p-margin">
        <p className="text-body-md text-on-surface">상품을 찾을 수 없어요.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="min-h-11 text-label-md text-primary underline underline-offset-4"
        >
          홈으로 돌아가기
        </button>
      </div>
    )
  }

  const location = locations.find((l) => l.id === item.locationId)
  const category = categories.find((c) => c.id === item.categoryId)
  const relatedItems = items
    .filter((i) => i.categoryId === item.categoryId && i.id !== item.id)
    .slice(0, 4)
  const remaining = getRemainingDays(item)
  const tracksSupply = parseRestockCycleDays(item.restockCycle) !== undefined || item.daysUntilEmpty !== undefined
  // Link items are recorded via 구매 완료 after the link was opened; others via 재구매함.
  const canRestock = tracksSupply && !item.affiliateUrl
  const awaitingConfirm = Boolean(item.affiliateUrl) && pendingPurchases.isPending(item.id)
  const repurchases = getPurchaseDates(item).length - 1
  const observedDays = getObservedCycleDays(item)
  const meta = [location?.name, category?.name].filter(Boolean).join(' · ')
  const quietBtn =
    'flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-hairline bg-surface-container-lowest text-label-lg text-on-surface transition-colors hover:bg-surface-container-low active:scale-[0.98]'

  return (
    <div className="space-y-space-md p-margin">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="relative inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant transition-colors before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] hover:bg-surface-container-high"
      >
        <Icon name="arrow_back" className="text-[16px]" />
        뒤로
      </button>

      <div className="flex gap-space-md rounded-2xl border border-hairline bg-surface-container-lowest p-space-md shadow-card">
        <ItemThumb item={item} className="h-24 w-20" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {meta && <span className="text-body-sm text-on-surface-variant">{meta}</span>}
          <h1 className="font-heading text-headline-lg text-on-surface">{item.name}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {item.price !== undefined && (
              <span className="font-heading text-headline-md tabular-nums text-on-surface">
                {item.price.toLocaleString()}원
              </span>
            )}
            {remaining !== undefined && <DdayLabel days={remaining} />}
          </div>
        </div>
      </div>

      {item.daysUntilEmpty === undefined && (
        <RecommendationToggle
          value={item.recommendation}
          onChange={(value) => updateItem(item.id, { recommendation: value })}
        />
      )}

      {item.note && (
        <p className="rounded-xl border border-hairline bg-surface-container-lowest p-space-md text-body-sm text-on-surface shadow-card">
          {item.note}
        </p>
      )}

      {(item.place || item.restockCycle || repurchases > 0) && (
        <dl className="space-y-1.5 rounded-xl bg-surface-container-low p-space-md text-body-sm">
          {item.place && (
            <div className="flex justify-between gap-2">
              <dt className="text-on-surface-variant">구매처</dt>
              <dd className="text-on-surface">{item.place}</dd>
            </div>
          )}
          {item.restockCycle && (
            <div className="flex justify-between gap-2">
              <dt className="text-on-surface-variant">{observedDays ? '입력한 주기' : '재구매 주기'}</dt>
              <dd className="text-on-surface">{item.restockCycle}</dd>
            </div>
          )}
          {repurchases > 0 && (
            <div className="flex justify-between gap-2">
              <dt className="text-on-surface-variant">실제 구매 간격</dt>
              <dd className="text-right tabular-nums text-on-surface">
                {observedDays
                  ? `약 ${observedDays}일 · 재구매 ${repurchases}회`
                  : `재구매 ${repurchases}회 · ${MIN_OBSERVED_GAPS - repurchases}번 더 기록하면 계산해요`}
              </dd>
            </div>
          )}
        </dl>
      )}

      <div className="flex flex-col gap-2">
        {item.affiliateUrl && (
          <a
            href={item.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => pendingPurchases.markOpened(item.id)}
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-primary text-label-lg text-on-primary active:scale-[0.98]"
          >
            <Icon name="shopping_cart" className="text-[18px]" />
            구매하기
          </a>
        )}
        <div className="flex gap-2">
          {canRestock && (
            <button type="button" onClick={() => recordPurchase(item.id)} className={quietBtn}>
              <Icon name="restart_alt" className="text-[18px]" />
              재구매함
            </button>
          )}
          {awaitingConfirm && (
            <button
              type="button"
              onClick={() => {
                recordPurchase(item.id)
                pendingPurchases.clear(item.id)
              }}
              className={quietBtn}
            >
              <Icon name="check" className="text-[18px]" />
              구매 완료
            </button>
          )}
          <button type="button" onClick={() => navigate(`/new?editId=${item.id}`)} className={quietBtn}>
            <Icon name="edit" className="text-[18px]" />
            수정하기
          </button>
        </div>
      </div>

      {relatedItems.length > 0 && (
        <section className="space-y-space-sm">
          <h2 className="font-heading text-headline-md text-on-surface">같은 카테고리의 다른 상품</h2>
          <div className="space-y-space-sm">
            {relatedItems.map((related) => (
              <ItemCard key={related.id} item={related} onClick={() => navigate(`/item/${related.id}`)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
