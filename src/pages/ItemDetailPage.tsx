import { useNavigate, useParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { RatingStars } from '../components/RatingStars'

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { items, locations, categories } = useLocker()
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

  return (
    <div className="space-y-4 p-4">
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-ink/60">
        ← 뒤로
      </button>

      <div className="flex h-40 items-center justify-center rounded-lg bg-card text-5xl">
        🧴
      </div>

      <div>
        <p className="text-xs text-ink/50">
          {location?.name} &gt; {category?.name}
        </p>
        <h1 className="text-xl font-bold">{item.name}</h1>
      </div>

      {item.rating !== undefined ? (
        <RatingStars rating={item.rating} />
      ) : item.daysUntilEmpty !== undefined ? (
        <p className="text-warn">D-{item.daysUntilEmpty}</p>
      ) : null}

      {item.note && <p className="rounded-lg bg-card p-3 text-sm">{item.note}</p>}

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
        <a
          href={item.affiliateUrl ?? '#'}
          className="flex-1 rounded-lg bg-stamp py-2 text-center text-white"
        >
          다시 담기
        </a>
        <button
          type="button"
          onClick={() => navigate(`/new?editId=${item.id}`)}
          className="flex-1 rounded-lg border border-ink/20 py-2 text-center"
        >
          메모 수정하기
        </button>
      </div>
    </div>
  )
}
