import { useNavigate, useParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { RecommendationToggle } from '../components/RecommendationToggle'
import { ItemCard } from '../components/ItemCard'
import { Icon } from '../data/materialIcons'

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { items, locations, categories, updateItem } = useLocker()
  const item = items.find((i) => i.id === id)

  if (!item) {
    return (
      <div className="space-y-space-sm p-margin">
        <p className="text-body-md text-on-surface">상품을 찾을 수 없습니다.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-label-md text-primary underline"
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
  const urgent = item.daysUntilEmpty !== undefined && item.daysUntilEmpty <= 7

  return (
    <div className="space-y-space-md p-margin">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 self-start rounded-full bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant"
      >
        <Icon name="arrow_back" className="text-[16px]" />
        뒤로
      </button>

      <div className="rounded-2xl bg-surface-container-lowest p-space-md shadow-[0_4px_0px_#e1bfb8]">
        <div className="flex gap-space-md">
          <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
            <Icon name="inventory_2" className="text-[36px]" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5 text-label-sm">
              {location && (
                <span className="rounded bg-secondary-container px-1.5 py-0.5 text-on-secondary-container">
                  {location.name}
                </span>
              )}
              {category && (
                <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-on-surface-variant">
                  {category.name}
                </span>
              )}
            </div>
            <h1 className="font-heading text-headline-lg text-on-surface">{item.name}</h1>
            {item.price !== undefined && (
              <span className="font-heading text-headline-md text-primary">
                {item.price.toLocaleString()}원
              </span>
            )}
            {item.daysUntilEmpty !== undefined && (
              <span
                className={`self-start rounded px-1.5 py-0.5 text-label-sm ${
                  urgent
                    ? 'bg-error-container text-on-error-container'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                D-{item.daysUntilEmpty}
              </span>
            )}
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
        <p className="rounded-xl bg-surface-container-lowest p-space-md text-body-sm text-on-surface shadow-[0_3px_0px_#eae0de]">
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

      <div className="flex items-stretch gap-2">
        {item.affiliateUrl ? (
          <a
            href={item.affiliateUrl}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary p-3 text-label-lg text-on-primary shadow-[0_4px_0px_#8b1901] active:translate-y-0.5"
          >
            <Icon name="shopping_cart" className="text-[18px]" />
            구매하기
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="flex flex-1 items-center justify-center rounded-xl bg-surface-container p-3 text-label-lg text-on-surface-variant opacity-60"
          >
            구매 링크 없음
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate(`/new?editId=${item.id}`)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface-container-lowest p-3 text-label-lg text-on-surface shadow-[0_3px_0px_#e1bfb8] active:translate-y-0.5"
        >
          <Icon name="edit_note" className="text-[18px]" />
          메모 수정하기
        </button>
      </div>

      {relatedItems.length > 0 && (
        <section className="space-y-space-sm">
          <h2 className="text-label-lg text-on-surface-variant">이런 상품은 어때요?</h2>
          <div className="space-y-space-sm">
            {relatedItems.map((related) => (
              <ItemCard
                key={related.id}
                item={related}
                onClick={() => navigate(`/item/${related.id}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
