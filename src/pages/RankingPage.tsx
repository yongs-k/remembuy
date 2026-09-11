import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getRankingForCategory } from '../state/selectors'
import { RatingStars } from '../components/RatingStars'
import { Badge } from '../components/Badge'

export default function RankingPage() {
  const { items, categories } = useLocker()
  const navigate = useNavigate()
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0].id)

  const ranking = useMemo(
    () => getRankingForCategory(items, selectedCategoryId),
    [items, selectedCategoryId]
  )

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">랭킹</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setSelectedCategoryId(category.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-sm ${
              selectedCategoryId === category.id ? 'bg-stamp text-white' : 'bg-card text-ink'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

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
                {item.rating !== undefined && <RatingStars rating={item.rating} />}
              </div>
              {index === 0 && <Badge>다시 살래요</Badge>}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
