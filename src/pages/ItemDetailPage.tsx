import { DdayLabel } from '../components/Badge'
import { useNavigate, useParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { RecommendationToggle } from '../components/RecommendationToggle'
import { ItemCard } from '../components/ItemCard'
import { ItemThumb } from '../components/ItemThumb'
import { Icon } from '../data/materialIcons'
import { getRemainingDays, parseRestockCycleDays } from '../state/selectors'

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { items, locations, categories, updateItem } = useLocker()
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
  const hasCycle = parseRestockCycleDays(item.restockCycle) !== undefined
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

      {(item.place || item.restockCycle) && (
        <dl className="space-y-1.5 rounded-xl bg-surface-container-low p-space-md text-body-sm">
          {item.place && (
            <div className="flex justify-between gap-2">
              <dt className="text-on-surface-variant">구매처</dt>
              <dd className="text-on-surface">{item.place}</dd>
            </div>
          )}
          {item.restockCycle && (
            <div className="flex justify-between gap-2">
              <dt className="text-on-surface-variant">재구매 주기</dt>
              <dd className="text-on-surface">{item.restockCycle}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="flex flex-col gap-2">
        {item.affiliateUrl && (
          <a
            href={item.affiliateUrl}
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-primary text-label-lg text-on-primary active:scale-[0.98]"
          >
            <Icon name="shopping_cart" className="text-[18px]" />
            구매하기
          </a>
        )}
        <div className="flex gap-2">
          {hasCycle && (
            <button
              type="button"
              onClick={() => updateItem(item.id, { restockedAt: new Date().toISOString().slice(0, 10) })}
              className={quietBtn}
            >
              <Icon name="restart_alt" className="text-[18px]" />
              재구매함
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
