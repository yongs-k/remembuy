import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getCompletionGain, getRemainingDays } from '../state/selectors'
import { searchProductImage } from '../lib/imageSearchApi'
import { RecommendationToggle } from '../components/RecommendationToggle'
import { EntryTabs } from '../components/EntryTabs'
import { EntryPreviewCard } from '../components/EntryPreviewCard'
import { CompletionCelebration } from '../components/CompletionCelebration'
import { Icon, LOCATION_MATERIAL_ICON } from '../data/materialIcons'
import { useGame } from '../state/GameContext'
import type { Item } from '../types'

type ProgressMode = 'recommendation' | 'daysUntilEmpty'

type RecordPrefill = {
  name: string | null
  locationId: string | null
  suggestedLocationName: string | null
  categoryId: string | null
  suggestedCategoryName: string | null
  masterItemId: string | null
  place: string | null
  price: number | null
  restockCycle: string | null
  sourceUrl?: string
}

const CYCLE_PRESETS = [45, 60, 90]

const cardCls = 'space-y-space-sm rounded-2xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]'
const inputCls =
  'mt-1 w-full rounded-lg border-2 border-transparent bg-surface-container-low p-2.5 text-body-md text-on-surface focus:border-primary focus:outline-none'
const labelCls = 'block text-label-md text-on-surface-variant'
const smallBtnCls =
  'shrink-0 rounded-lg bg-surface-container-high px-3 text-label-md text-on-surface active:translate-y-0.5'

function chipCls(active: boolean) {
  return `rounded-full px-3 py-1.5 text-label-md ${
    active
      ? 'bg-primary text-on-primary shadow-[0_2px_0px_#8b1901]'
      : 'bg-surface-container text-on-surface-variant shadow-[0_2px_0px_#e1bfb8]'
  }`
}

export default function NewItemPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('editId')
  const { items, locations, categories, addItem, updateItem, addLocation, addCategory } =
    useLocker()
  const game = useGame()
  const existing = editId ? items.find((i) => i.id === editId) : undefined
  const prefill = !existing
    ? (location.state as { prefill?: RecordPrefill } | null)?.prefill
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

  const isManualEntry = !existing && !prefill

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
  const [daysUntilEmpty, setDaysUntilEmpty] = useState(
    existing ? Math.max(0, getRemainingDays(existing) ?? 30) : 30
  )
  const [price, setPrice] = useState<number | ''>(existing?.price ?? prefill?.price ?? '')
  const [affiliateUrl, setAffiliateUrl] = useState(
    existing?.affiliateUrl ?? prefill?.sourceUrl ?? ''
  )
  const [note, setNote] = useState(existing?.note ?? '')
  const [imageUrl, setImageUrl] = useState<string | null>(existing?.imageUrl ?? null)
  const [imageCandidate, setImageCandidate] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageSearchStatus, setImageSearchStatus] = useState<'idle' | 'loading' | 'not-found' | 'broken'>(
    'idle'
  )
  const [newLocationName, setNewLocationName] = useState(prefill?.suggestedLocationName ?? '')
  const [newCategoryName, setNewCategoryName] = useState(prefill?.suggestedCategoryName ?? '')
  const [notice, setNotice] = useState<{ id: number } | null>(null) // added
  const [celebration, setCelebration] = useState<{
    itemName: string
    icon: string
    pointsAwarded: number
    dexBefore: number
    dexAfter: number
    locationName: string
  } | null>(null)
  const cycleInputRef = useRef<HTMLInputElement>(null) // added

  useEffect(() => {
    // added
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 2500)
    return () => clearTimeout(timer)
  }, [notice])

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

  async function handleSearchImage() {
    if (!name.trim()) return
    setImageSearchStatus('loading')
    setImageCandidate(null)
    setImageLoaded(false)
    try {
      const result = await searchProductImage(name, selectedCategory?.name)
      if (result.imageUrl) {
        setImageCandidate(result.imageUrl)
        setImageSearchStatus('idle')
      } else {
        setImageSearchStatus('not-found')
      }
    } catch {
      setImageSearchStatus('not-found')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const item: Item = {
      id: existing?.id ?? `item-${Date.now()}`,
      name,
      locationId,
      categoryId,
      masterItemId: masterItemId || undefined,
      place: place || undefined,
      restockCycle: restockCycle || null,
      imageUrl,
      note: note || undefined,
      recommendation: progressMode === 'recommendation' ? recommendation : undefined,
      daysUntilEmpty:
        progressMode === 'daysUntilEmpty'
          ? existing
            ? daysUntilEmpty - (getRemainingDays({ ...existing, daysUntilEmpty: 0 }) ?? 0)
            : daysUntilEmpty
          : undefined,
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
    const pointsAwarded = masterItemId ? await game.claim([masterItemId]) : 0
    setCelebration({
      itemName: item.name,
      icon: LOCATION_MATERIAL_ICON[selectedLocation?.colorToken ?? ''] ?? 'inventory_2',
      pointsAwarded,
      dexBefore: gain.before,
      dexAfter: gain.after,
      locationName,
    })
  }

  const showNotice = () => setNotice({ id: Date.now() }) // added
  const selectedLocation = locations.find((l) => l.id === locationId) // added
  const locationName = selectedLocation?.name ?? '' // added
  const categoryName = selectedCategory?.name ?? '' // added
  const gain = getCompletionGain(items, categories, locationId, categoryId, masterItemId, existing?.id) // added
  const hasGain = gain.after > gain.before // added
  const isPresetCycle = CYCLE_PRESETS.some((d) => restockCycle === `약 ${d}일마다`) // added

  return (
    <form onSubmit={handleSubmit} className="space-y-space-md p-margin">
      <div className="flex items-center gap-space-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="뒤로가기"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface transition-colors hover:bg-surface-container-high"
        >
          <Icon name="arrow_back" className="text-[20px]" />
        </button>
        <h1 className="min-w-0 font-heading text-headline-lg text-on-surface">
          {existing ? '메모 수정하기' : '새로 기록하기'}
        </h1>
      </div>

      <EntryTabs onSoon={showNotice} />

      <EntryPreviewCard
        name={name}
        locationName={locationName}
        categoryName={categoryName}
        price={price}
        restockCycle={restockCycle}
      />

      <div className="rounded-2xl bg-secondary-container/40 p-space-md">
        <div className="flex items-center justify-between gap-space-sm">
          <div className="flex min-w-0 flex-col">
            <span className="font-heading text-label-lg text-on-surface">도감 등록 보상 예정</span>
            <span className="text-body-sm text-on-surface-variant">
              {hasGain
                ? `${locationName}도감 수집률 ${gain.before}% → ${gain.after}% UP!`
                : masterItemId
                  ? '이번 등록으로는 수집률이 그대로예요'
                  : '표준 품목을 연결하면 수집률이 올라가요'}
            </span>
          </div>
          <span className="shrink-0 font-heading text-headline-md text-tertiary">+20P</span>
        </div>
        <div className="mt-space-sm h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${hasGain ? gain.after : gain.before}%` }}
          />
        </div>
      </div>

      <section className={cardCls}>
        <h2 className="flex items-center gap-1.5 font-heading text-headline-md text-on-surface">
          <Icon name="shelves" className="text-[22px] text-primary" />
          도감 보관 구역
        </h2>

        <label className={labelCls}>
          이름
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </label>

        {isManualEntry && (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={handleSearchImage}
              disabled={!name.trim() || imageSearchStatus === 'loading'}
              className="flex items-center gap-1.5 rounded-lg bg-surface-container-high px-3 py-1.5 text-label-md text-on-surface disabled:opacity-40"
            >
              <Icon name="image_search" className="text-[16px]" />
              {imageSearchStatus === 'loading' ? '이미지 찾는 중...' : '이미지 찾기'}
            </button>
            {imageSearchStatus === 'not-found' && (
              <p className="text-body-sm text-on-surface-variant">이미지를 찾지 못했어요</p>
            )}
            {imageCandidate && (
              <div className="flex items-center gap-2 rounded-xl bg-surface-container-low p-space-sm">
                <img
                  src={imageCandidate}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    setImageCandidate(null)
                    setImageLoaded(false)
                    setImageSearchStatus('broken')
                  }}
                />
                {imageLoaded && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl(imageCandidate)
                      setImageCandidate(null)
                      setImageLoaded(false)
                    }}
                    className="rounded-lg bg-primary px-3 py-1.5 text-label-md text-on-primary"
                  >
                    이 이미지 쓰기
                  </button>
                )}
              </div>
            )}
            {imageSearchStatus === 'broken' && (
              <p className="text-body-sm text-on-surface-variant">이미지를 불러올 수 없어요</p>
            )}
            {imageUrl && (
              <p className="flex items-center gap-1 text-label-sm text-secondary">
                <Icon name="check_circle" className="text-[14px]" />
                이미지가 선택됐어요
              </p>
            )}
          </div>
        )}

        <div>
          <span className={labelCls}>장소</span>
          <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="보관 구역">
            {locations.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={l.id === locationId}
                onClick={() => handleLocationChange(l.id)}
                className={chipCls(l.id === locationId)}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={newLocationName}
            onChange={(e) => setNewLocationName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault()
                handleAddLocation()
              }
            }}
            placeholder="새 장소 이름 (예: 베란다)"
            className="w-full min-w-0 flex-1 rounded-lg border-2 border-transparent bg-surface-container-low p-2.5 text-body-sm text-on-surface focus:border-primary focus:outline-none"
          />
          <button type="button" onClick={handleAddLocation} className={smallBtnCls}>
            장소 추가
          </button>
        </div>

        <label className={labelCls}>
          카테고리
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value)
              setMasterItemId('')
            }}
            className={inputCls}
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault()
                handleAddCategory()
              }
            }}
            placeholder="새 카테고리 이름"
            className="w-full min-w-0 flex-1 rounded-lg border-2 border-transparent bg-surface-container-low p-2.5 text-body-sm text-on-surface focus:border-primary focus:outline-none"
          />
          <button type="button" onClick={handleAddCategory} className={smallBtnCls}>
            카테고리 추가
          </button>
        </div>

        {selectedCategory && (
          <label className={labelCls}>
            표준 품목과 연결 (선택)
            <select
              value={masterItemId}
              onChange={(e) => setMasterItemId(e.target.value)}
              className={inputCls}
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
      </section>

      <section className={cardCls}>
        <h2 className="flex items-center gap-1.5 font-heading text-headline-md text-on-surface">
          <Icon name="shopping_bag" className="text-[22px] text-primary" />
          구매 정보
        </h2>
        <label className={labelCls}>
          구매처
          <input value={place} onChange={(e) => setPlace(e.target.value)} className={inputCls} />
        </label>
        <label className={labelCls}>
          가격 (원)
          <input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
            className={inputCls}
          />
        </label>
        <label className={labelCls}>
          구매 링크
          <input
            value={affiliateUrl ?? ''}
            onChange={(e) => setAffiliateUrl(e.target.value)}
            placeholder="https://..."
            className={inputCls}
          />
        </label>
      </section>

      <section className={cardCls}>
        <h2 className="flex items-center gap-1.5 font-heading text-headline-md text-on-surface">
          <Icon name="update" className="text-[22px] text-primary" />
          예상 소모 &amp; 재구매 주기
        </h2>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="재구매 주기">
          {CYCLE_PRESETS.map((d) => {
            const text = `약 ${d}일마다`
            return (
              <button
                key={d}
                type="button"
                aria-pressed={restockCycle === text}
                onClick={() => setRestockCycle(text)}
                className={chipCls(restockCycle === text)}
              >
                {d}일
              </button>
            )
          })}
          <button
            type="button"
            aria-pressed={restockCycle !== '' && !isPresetCycle}
            onClick={() => cycleInputRef.current?.focus()}
            className={chipCls(restockCycle !== '' && !isPresetCycle)}
          >
            직접설정
          </button>
        </div>
        <label className={labelCls}>
          재구매 주기
          <input
            ref={cycleInputRef}
            value={restockCycle}
            onChange={(e) => setRestockCycle(e.target.value)}
            placeholder="예: 약 2개월마다"
            className={inputCls}
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setProgressMode('recommendation')}
            className={`flex-1 rounded-lg py-2 text-label-md ${
              progressMode === 'recommendation'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface'
            }`}
          >
            추천/비추천
          </button>
          <button
            type="button"
            onClick={() => setProgressMode('daysUntilEmpty')}
            className={`flex-1 rounded-lg py-2 text-label-md ${
              progressMode === 'daysUntilEmpty'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface'
            }`}
          >
            소진까지 D-day
          </button>
        </div>

        {progressMode === 'recommendation' ? (
          <RecommendationToggle value={recommendation} onChange={setRecommendation} />
        ) : (
          <label className={labelCls}>
            소진까지 남은 일수
            <input
              type="number"
              min={0}
              value={daysUntilEmpty}
              onChange={(e) => setDaysUntilEmpty(Number(e.target.value))}
              className={inputCls}
            />
          </label>
        )}
      </section>

      <section className={cardCls}>
        <label className={labelCls}>
          메모
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputCls}
            rows={3}
          />
        </label>
      </section>

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary p-3.5 text-label-lg text-on-primary shadow-[0_4px_0px_#8b1901] active:translate-y-0.5 active:shadow-[0_1px_0px_#8b1901]"
      >
        <Icon name="check_circle" className="text-[20px]" />
        {existing ? '저장하기' : `${locationName}도감에 등록하기`}
      </button>

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center md:bottom-8"
      >
        {notice && (
          <span className="max-w-[90%] rounded-full bg-inverse-surface px-4 py-2 text-label-md text-inverse-on-surface shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
            아직 준비 중인 기능이에요
          </span>
        )}
      </div>
      {celebration && (
        <CompletionCelebration
          {...celebration}
          onDismiss={() => {
            setCelebration(null)
            navigate('/')
          }}
        />
      )}
    </form>
  )
}
