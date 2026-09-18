import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { RecommendationToggle } from '../components/RecommendationToggle'
import type { Item } from '../types'

type ProgressMode = 'recommendation' | 'daysUntilEmpty'

type LinkAnalysisPrefill = {
  name: string | null
  locationId: string | null
  suggestedLocationName: string | null
  categoryId: string | null
  suggestedCategoryName: string | null
  masterItemId: string | null
  place: string | null
  price: number | null
  restockCycle: string | null
  sourceUrl: string
}

export default function NewItemPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('editId')
  const { items, locations, categories, addItem, updateItem, addLocation, addCategory } =
    useLocker()
  const existing = editId ? items.find((i) => i.id === editId) : undefined
  const prefill = !existing
    ? (location.state as { prefill?: LinkAnalysisPrefill } | null)?.prefill
    : undefined

  const prefillLocation = prefill?.locationId
    ? locations.find((l) => l.id === prefill.locationId)
    : undefined
  const prefillCategory =
    prefillLocation && prefill?.categoryId
      ? categories.find((c) => c.id === prefill.categoryId && c.locationId === prefillLocation.id)
      : undefined
  const prefillMasterItemId =
    prefillCategory && prefill?.masterItemId
      ? prefillCategory.masterItems.find((m) => m.id === prefill.masterItemId)?.id
      : undefined

  const [name, setName] = useState(existing?.name ?? prefill?.name ?? '')
  const [locationId, setLocationId] = useState(
    existing?.locationId ?? prefillLocation?.id ?? locations[0].id
  )
  const categoriesForLocation = useMemo(
    () => categories.filter((c) => c.locationId === locationId),
    [categories, locationId]
  )
  const [categoryId, setCategoryId] = useState(
    existing?.categoryId ?? prefillCategory?.id ?? categoriesForLocation[0]?.id ?? ''
  )
  const [masterItemId, setMasterItemId] = useState(
    existing?.masterItemId ?? prefillMasterItemId ?? ''
  )
  const [place, setPlace] = useState(existing?.place ?? prefill?.place ?? '')
  const [restockCycle, setRestockCycle] = useState(
    existing?.restockCycle ?? prefill?.restockCycle ?? ''
  )
  const [progressMode, setProgressMode] = useState<ProgressMode>(
    existing?.daysUntilEmpty !== undefined ? 'daysUntilEmpty' : 'recommendation'
  )
  const [recommendation, setRecommendation] = useState<'recommend' | 'notRecommend'>(
    existing?.recommendation ?? 'recommend'
  )
  const [daysUntilEmpty, setDaysUntilEmpty] = useState(existing?.daysUntilEmpty ?? 30)
  const [price, setPrice] = useState<number | ''>(existing?.price ?? prefill?.price ?? '')
  const [affiliateUrl, setAffiliateUrl] = useState(
    existing?.affiliateUrl ?? prefill?.sourceUrl ?? ''
  )
  const [note, setNote] = useState(existing?.note ?? '')
  const [newLocationName, setNewLocationName] = useState(prefill?.suggestedLocationName ?? '')
  const [newCategoryName, setNewCategoryName] = useState(prefill?.suggestedCategoryName ?? '')

  const selectedCategory = categoriesForLocation.find((c) => c.id === categoryId)

  function handleLocationChange(nextLocationId: string) {
    setLocationId(nextLocationId)
    const nextCategories = categories.filter((c) => c.locationId === nextLocationId)
    setCategoryId(nextCategories[0]?.id ?? '')
    setMasterItemId('')
  }

  function handleAddLocation() {
    if (!newLocationName.trim()) return
    const created = addLocation(newLocationName.trim())
    setNewLocationName('')
    setLocationId(created.id)
    setCategoryId('')
  }

  function handleAddCategory() {
    if (!newCategoryName.trim() || !locationId) return
    const created = addCategory(locationId, newCategoryName.trim())
    setNewCategoryName('')
    setCategoryId(created.id)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const item: Item = {
      id: existing?.id ?? `item-${Date.now()}`,
      name,
      locationId,
      categoryId,
      masterItemId: masterItemId || undefined,
      place: place || undefined,
      restockCycle: restockCycle || null,
      note: note || undefined,
      recommendation: progressMode === 'recommendation' ? recommendation : undefined,
      daysUntilEmpty: progressMode === 'daysUntilEmpty' ? daysUntilEmpty : undefined,
      price: price === '' ? undefined : Number(price),
      affiliateUrl: affiliateUrl || null,
      createdAt: existing?.createdAt ?? new Date().toISOString().slice(0, 10),
      podiumRank: categoryId === existing?.categoryId ? existing?.podiumRank : undefined,
    }
    if (existing) {
      updateItem(existing.id, item)
    } else {
      addItem(item)
    }
    navigate('/')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <h1 className="text-xl font-bold">{existing ? '메모 수정하기' : '새로 기록하기'}</h1>

      <label className="block text-sm">
        이름
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="chunky-input mt-1 w-full bg-card p-2"
        />
      </label>

      <label className="block text-sm">
        장소
        <select
          value={locationId}
          onChange={(e) => handleLocationChange(e.target.value)}
          className="chunky-input mt-1 w-full bg-card p-2"
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <input
          value={newLocationName}
          onChange={(e) => setNewLocationName(e.target.value)}
          placeholder="새 장소 이름 (예: 베란다)"
          className="chunky-input flex-1 bg-card p-2 text-sm"
        />
        <button
          type="button"
          onClick={handleAddLocation}
          className="chunky-btn rounded-xl bg-card px-3 text-sm"
        >
          장소 추가
        </button>
      </div>

      <label className="block text-sm">
        카테고리
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value)
            setMasterItemId('')
          }}
          className="chunky-input mt-1 w-full bg-card p-2"
        >
          {categoriesForLocation.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="새 카테고리 이름"
          className="chunky-input flex-1 bg-card p-2 text-sm"
        />
        <button
          type="button"
          onClick={handleAddCategory}
          className="chunky-btn rounded-xl bg-card px-3 text-sm"
        >
          카테고리 추가
        </button>
      </div>

      {selectedCategory && (
        <label className="block text-sm">
          표준 품목과 연결 (선택)
          <select
            value={masterItemId}
            onChange={(e) => setMasterItemId(e.target.value)}
            className="chunky-input mt-1 w-full bg-card p-2"
          >
            <option value="">직접 입력 (커스텀 상품)</option>
            {selectedCategory.masterItems.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm">
        구매처
        <input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          className="chunky-input mt-1 w-full bg-card p-2"
        />
      </label>

      <label className="block text-sm">
        가격 (원)
        <input
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
          className="chunky-input mt-1 w-full bg-card p-2"
        />
      </label>

      <label className="block text-sm">
        구매 링크
        <input
          value={affiliateUrl ?? ''}
          onChange={(e) => setAffiliateUrl(e.target.value)}
          placeholder="https://..."
          className="chunky-input mt-1 w-full bg-card p-2"
        />
      </label>

      <label className="block text-sm">
        재구매 주기
        <input
          value={restockCycle}
          onChange={(e) => setRestockCycle(e.target.value)}
          placeholder="예: 약 2개월마다"
          className="chunky-input mt-1 w-full bg-card p-2"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setProgressMode('recommendation')}
          className={`flex-1 rounded-lg border-2 border-ink py-2 text-sm ${
            progressMode === 'recommendation' ? 'bg-stamp text-white' : 'bg-card text-ink'
          }`}
        >
          추천/비추천
        </button>
        <button
          type="button"
          onClick={() => setProgressMode('daysUntilEmpty')}
          className={`flex-1 rounded-lg border-2 border-ink py-2 text-sm ${
            progressMode === 'daysUntilEmpty' ? 'bg-stamp text-white' : 'bg-card text-ink'
          }`}
        >
          소진까지 D-day
        </button>
      </div>

      {progressMode === 'recommendation' ? (
        <RecommendationToggle value={recommendation} onChange={setRecommendation} />
      ) : (
        <label className="block text-sm">
          소진까지 남은 일수
          <input
            type="number"
            min={0}
            value={daysUntilEmpty}
            onChange={(e) => setDaysUntilEmpty(Number(e.target.value))}
            className="chunky-input mt-1 w-full bg-card p-2"
          />
        </label>
      )}

      <label className="block text-sm">
        메모
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="chunky-input mt-1 w-full bg-card p-2"
          rows={3}
        />
      </label>

      <button type="submit" className="chunky-btn w-full rounded-xl bg-stamp py-2 text-white">
        저장하기
      </button>
    </form>
  )
}
