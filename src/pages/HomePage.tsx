import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getLocationCompletion } from '../state/selectors'
import { LocationIcon } from '../components/LocationIcon'
import { ItemCard } from '../components/ItemCard'

export default function HomePage() {
  const { items, locations, categories } = useLocker()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [showUrgentOnly, setShowUrgentOnly] = useState(false)

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedLocationId && item.locationId !== selectedLocationId) return false
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false
      if (showUrgentOnly && !(item.daysUntilEmpty !== undefined && item.daysUntilEmpty <= 7))
        return false
      return true
    })
  }, [items, selectedLocationId, search, showUrgentOnly])

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, typeof filteredItems>()
    for (const item of filteredItems) {
      const list = map.get(item.categoryId) ?? []
      list.push(item)
      map.set(item.categoryId, list)
    }
    return map
  }, [filteredItems])

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">REMEMBUY</h1>

      <input
        type="search"
        placeholder="상품 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-ink/20 bg-card p-2"
      />

      <div className="flex gap-3 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedLocationId(null)}
          className={`flex flex-col items-center gap-1 text-xs ${
            selectedLocationId === null ? 'text-stamp' : 'text-ink/60'
          }`}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-card text-lg">
            🗂️
          </span>
          전체
        </button>
        {locations.map((location) => (
          <LocationIcon
            key={location.id}
            location={location}
            percent={getLocationCompletion(items, location.id, categories)}
            selected={selectedLocationId === location.id}
            onClick={() => setSelectedLocationId(location.id)}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowUrgentOnly(false)}
          className={`rounded-full px-3 py-1 text-sm ${
            !showUrgentOnly ? 'bg-stamp text-white' : 'bg-card text-ink'
          }`}
        >
          전체
        </button>
        <button
          type="button"
          onClick={() => setShowUrgentOnly(true)}
          className={`rounded-full px-3 py-1 text-sm ${
            showUrgentOnly ? 'bg-stamp text-white' : 'bg-card text-ink'
          }`}
        >
          임박만
        </button>
      </div>

      {Array.from(itemsByCategory.entries()).map(([categoryId, categoryItems]) => {
        const category = categories.find((c) => c.id === categoryId)
        return (
          <section key={categoryId} className="space-y-2">
            <h2 className="text-sm font-semibold text-ink/70">{category?.name}</h2>
            <div className="space-y-2">
              {categoryItems.map((item) => (
                <ItemCard key={item.id} item={item} onClick={() => navigate(`/item/${item.id}`)} />
              ))}
            </div>
          </section>
        )
      })}

      <button
        type="button"
        onClick={() => navigate('/new')}
        className="fixed bottom-24 right-1/2 -mr-[calc(50%-2.5rem)] flex h-14 w-14 items-center justify-center rounded-full bg-stamp text-2xl text-white shadow-lg"
        aria-label="새로 기록하기"
      >
        +
      </button>
    </div>
  )
}
