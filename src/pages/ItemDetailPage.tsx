import { useNavigate, useParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { RecommendationToggle } from '../components/RecommendationToggle'
import { ItemCard } from '../components/ItemCard'

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { items, locations, categories, updateItem } = useLocker()
  const item = items.find((i) => i.id === id)

  if (!item) {
    return (
      <div className="p-4">
        <p>상품을 찾을 수 없습니다.</p>
        <button type="button" onClick={() => navigate('/')} className="mt-2 text-accent underline">
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

  return (
    <div className="space-y-4 p-4">
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-ink/60">
        ← 뒤로
      </button>

      <div className="chunky-card flex h-40 items-center justify-center text-5xl">
        🧴
      </div>

      <div>
        <p className="text-xs text-ink/50">
          {location?.name} &gt; {category?.name}
        </p>
        <h1 className="text-xl font-bold">{item.name}</h1>
        {item.price !== undefined && (
          <p className="mt-1 text-lg font-semibold text-ink">{item.price.toLocaleString()}원</p>
        )}
      </div>

      {item.daysUntilEmpty !== undefined ? (
        <p className="text-warn">D-{item.daysUntilEmpty}</p>
      ) : (
        <RecommendationToggle
          value={item.recommendation}
          onChange={(value) => updateItem(item.id, { recommendation: value })}
        />
      )}

      {item.note && <p className="chunky-card p-3 text-sm">{item.note}</p>}

      <dl className="space-y-1 text-sm">
        {item.place && (
          <div className="flex justify-between">
            <dt className="text-ink/50">구매처</dt>
            <dd>{item.place}</dd>
          </div>
        )}
        {item.restockCycle && (
          <div className="flex justify-between">
            <dt className="text-ink/50">재구매 주기</dt>
            <dd>{item.restockCycle}</dd>
          </div>
        )}
      </dl>

      <div className="flex gap-2">
        {item.affiliateUrl ? (
          <a
            href={item.affiliateUrl}
            className="chunky-btn flex-1 rounded-xl bg-stamp py-2 text-center text-white"
          >
            구매하기
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="flex-1 rounded-xl border-2 border-ink/20 bg-ink/10 py-2 text-center text-ink/40"
          >
            구매 링크 없음
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate(`/new?editId=${item.id}`)}
          className="chunky-btn flex-1 rounded-xl bg-card py-2 text-center"
        >
          메모 수정하기
        </button>
      </div>

      {relatedItems.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-ink/70">이런 상품은 어때요?</h2>
          <div className="space-y-2">
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
