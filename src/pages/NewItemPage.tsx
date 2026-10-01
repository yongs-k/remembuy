import { useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getCompletionGain, getRemainingDays } from '../state/selectors'
import { searchProductImage } from '../lib/imageSearchApi'
import { RecommendationToggle } from '../components/RecommendationToggle'
import { CompletionCelebration } from '../components/CompletionCelebration'
import { Icon, LOCATION_MATERIAL_ICON } from '../data/materialIcons'
import { useGame } from '../state/GameContext'
import type { Item } from '../types'

/** Route state for /new: from link/photo analysis, or from a 기록하기 button (manual). */
export type RecordPrefill = {
  name?: string | null
  locationId?: string | null
  suggestedLocationName?: string | null
  categoryId?: string | null
  suggestedCategoryName?: string | null
  masterItemId?: string | null
  place?: string | null
  price?: number | null
  restockCycle?: string | null
  sourceUrl?: string
  /** Opened from a 기록하기 button: the user still types it in, so keep image search. */
  manual?: boolean
}

const CYCLE_PRESETS = [45, 60, 90]

const cardCls = 'space-y-space-sm rounded-2xl bg-surface-container-lowest p-space-md border border-hairline shadow-card'
const inputCls =
  'mt-1 w-full rounded-lg border-2 border-transparent bg-surface-container-low p-2.5 text-body-md text-on-surface focus:border-primary focus:outline-none'
const subInputCls =
  'w-full min-w-0 flex-1 rounded-lg border-2 border-transparent bg-surface-container-low p-2.5 text-body-md text-on-surface focus:border-primary focus:outline-none'
const labelCls = 'block text-label-md text-on-surface-variant'
const smallBtnCls =
  'min-h-11 shrink-0 rounded-lg bg-surface-container-high px-3 text-label-md text-on-surface active:scale-[0.98]'

function chipCls(active: boolean) {
  return `min-h-9 rounded-full px-3 text-label-md ${
    active
      ? 'bg-on-surface text-surface'
      : 'bg-surface-container text-on-surface-variant'
  }`
}

function daysSince(date: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 86_400_000))
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

  const isManualEntry = !existing && (!prefill || prefill.manual === true)
  // Opened from a 기록하기 button: say where this record goes, so the pre-set chips make sense.
  const prefillContext =
    prefill?.manual && prefillLocation
      ? [
          prefillLocation.name,
          prefillCategory?.name,
          prefillCategory?.masterItems.find((m) => m.id === prefillMasterItemId)?.name,
        ]
          .filter(Boolean)
          .join(" · ")
      : null

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
  // Unset until the user taps one: a default would record opinions nobody gave.
  const [recommendation, setRecommendation] = useState<'recommend' | 'notRecommend' | undefined>(
    existing?.recommendation
  )
  // Independent of the rating: '' means "not tracked".
  const [daysUntilEmpty, setDaysUntilEmpty] = useState(
    existing?.daysUntilEmpty !== undefined ? String(Math.max(0, getRemainingDays(existing) ?? 0)) : ''
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
  const [celebration, setCelebration] = useState<{
    itemName: string
    icon: string
    pointsAwarded: number
    dexBefore: number
    dexAfter: number
    locationName: string
  } | null>(null)
  const cycleInputRef = useRef<HTMLInputElement>(null)

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
      recommendation,
      // Stored as a supply length from the countdown anchor, so add the days
      // already elapsed when editing an existing item.
      daysUntilEmpty:
        daysUntilEmpty.trim() === ''
          ? undefined
          : Number(daysUntilEmpty) + (existing ? daysSince(existing.restockedAt ?? existing.createdAt) : 0),
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

  const selectedLocation = locations.find((l) => l.id === locationId)
  const locationName = selectedLocation?.name ?? ''
  const gain = getCompletionGain(items, categories, locationId, categoryId, masterItemId, existing?.id)
  const hasGain = gain.after > gain.before
  const isPresetCycle = CYCLE_PRESETS.some((d) => restockCycle === `약 ${d}일마다`)
  const hasOptionalDetails = Boolean(place || price !== '' || affiliateUrl || note)

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
          {existing ? '기록 수정하기' : '새로 기록하기'}
        </h1>
      </div>

      {prefillContext && (
        <p className="rounded-xl bg-surface-container-low px-space-md py-space-sm text-body-sm text-on-surface">
          <span className="text-on-surface-variant">기록할 곳 </span>
          {prefillContext}
        </p>
      )}

      <section className={cardCls}>
        <h2 className="font-heading text-headline-md text-on-surface">무엇을 기록할까요?</h2>

        <label className={labelCls}>
          이름
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 피죤 섬유유연제"
            className={inputCls}
          />
        </label>

        {isManualEntry && (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={handleSearchImage}
              disabled={!name.trim() || imageSearchStatus === 'loading'}
              className="flex min-h-11 items-center gap-1.5 rounded-lg border border-hairline px-3 text-label-md text-on-surface disabled:text-on-surface-variant"
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
                    className="min-h-11 rounded-lg border border-hairline bg-surface-container-lowest px-3 text-label-md text-on-surface"
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
          <details className="mt-1.5" open={Boolean(prefill?.suggestedLocationName)}>
            <summary className="inline-flex min-h-11 cursor-pointer items-center text-label-md text-on-surface-variant underline underline-offset-4">
              + 새 장소 추가
            </summary>
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
                aria-label="새 장소 이름"
                placeholder="예: 베란다"
                className={subInputCls}
              />
              <button type="button" onClick={handleAddLocation} className={smallBtnCls}>
                추가
              </button>
            </div>
          </details>
        </div>

        <div>
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
          <details className="mt-1.5" open={Boolean(prefill?.suggestedCategoryName)}>
            <summary className="inline-flex min-h-11 cursor-pointer items-center text-label-md text-on-surface-variant underline underline-offset-4">
              + 새 카테고리 추가
            </summary>
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
                aria-label="새 카테고리 이름"
                placeholder="예: 바디케어"
                className={subInputCls}
              />
              <button type="button" onClick={handleAddCategory} className={smallBtnCls}>
                추가
              </button>
            </div>
          </details>
        </div>

        {selectedCategory && (
          <div>
            <label className={labelCls}>
              어떤 종류의 상품인가요? (선택)
              <select
                value={masterItemId}
                onChange={(e) => setMasterItemId(e.target.value)}
                aria-describedby="master-item-hint"
                className={inputCls}
              >
                <option value="">목록에 없어요</option>
                {selectedCategory.masterItems.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <p id="master-item-hint" className="mt-1 text-body-sm text-on-surface-variant">
              고르면 {locationName} 도감에 체크돼요. 도감 수집률이 한 단계 오를 때마다 포인트를 받아요.
            </p>
          </div>
        )}
      </section>

      <section className={cardCls}>
        <h2 className="font-heading text-headline-md text-on-surface">언제 다시 살까요?</h2>
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

        <div className="space-y-1">
          <span className={labelCls}>추천하나요? (선택)</span>
          <RecommendationToggle value={recommendation} onChange={setRecommendation} />
        </div>
        <label className={labelCls}>
          다 쓰기까지 남은 날 (선택)
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={daysUntilEmpty}
            onChange={(e) => setDaysUntilEmpty(e.target.value)}
            placeholder="예: 30"
            className={inputCls}
          />
        </label>
      </section>

      <details className={`group ${cardCls}`} open={hasOptionalDetails}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between">
          <span className="font-heading text-headline-md text-on-surface">
            구매 정보 · 메모 <span className="text-body-sm font-normal text-on-surface-variant">(선택)</span>
          </span>
          <Icon
            name="expand_more"
            className="text-[22px] text-on-surface-variant transition-transform group-open:rotate-180"
          />
        </summary>
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
        <label className={labelCls}>
          메모
          <textarea value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} rows={3} />
        </label>
      </details>

      <div className="space-y-space-sm">
        <div className="rounded-xl bg-secondary-container/40 px-space-md py-space-sm">
          <p className="text-body-sm text-on-surface">
            {hasGain
              ? `${locationName} 도감 수집률 ${gain.before}% → ${gain.after}%`
              : masterItemId
                ? '이번 등록으로는 수집률이 그대로예요'
                : '표준 품목을 연결하면 도감 수집률이 올라가요'}
          </p>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-secondary"
              style={{ width: `${hasGain ? gain.after : gain.before}%` }}
            />
          </div>
        </div>
        <button
          type="submit"
          className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-label-lg text-on-primary active:scale-[0.98]"
        >
          <Icon name="check_circle" className="text-[20px]" />
          {existing ? '저장하기' : `${locationName} 도감에 등록하기`}
        </button>
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
