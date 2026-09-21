import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getLocationCompletion } from '../state/selectors'
import { ItemCard } from '../components/ItemCard'
import { HomeProfileCard } from '../components/HomeProfileCard'
import { QuestCarousel } from '../components/QuestCarousel'
import { HomeLocationTile } from '../components/HomeLocationTile'
import { AnalyzingOverlay } from '../components/AnalyzingOverlay'
import { Icon } from '../data/materialIcons'
import { DUMMY_QUESTS } from '../data/homeDummy'

type HomeFilter = 'all' | 'urgent' | 'recommended'

export default function HomePage() {
  const { items, locations, categories } = useLocker()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [filter, setFilter] = useState<HomeFilter>('all')
  const [showRecordOptions, setShowRecordOptions] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const searchResults = useMemo(() => {
    if (!search) return null
    const term = search.toLowerCase()
    return items.filter((item) => item.name.toLowerCase().includes(term))
  }, [items, search])

  const categoriesForLocation = useMemo(
    () => categories.filter((c) => c.locationId === selectedLocationId),
    [categories, selectedLocationId]
  )

  const itemsForCategory = useMemo(() => {
    if (!selectedCategoryId) return []
    return items.filter((item) => {
      if (item.categoryId !== selectedCategoryId) return false
      if (filter === 'urgent' && !(item.daysUntilEmpty !== undefined && item.daysUntilEmpty <= 7))
        return false
      if (filter === 'recommended' && item.recommendation !== 'recommend') return false
      return true
    })
  }, [items, selectedCategoryId, filter])

  function handleBack() {
    if (selectedCategoryId) {
      setSelectedCategoryId(null)
      setFilter('all')
    } else if (selectedLocationId) {
      setSelectedLocationId(null)
    }
  }

  function closeRecordSheet() {
    setShowRecordOptions(false)
    setShowLinkInput(false)
    setLinkUrl('')
    setAnalyzeError(null)
  }

  async function handleAnalyzeLink() {
    const controller = new AbortController()
    abortRef.current = controller
    setIsAnalyzing(true)
    setAnalyzeError(null)
    try {
      const res = await fetch('/api/analyze-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl, locations, categories }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error('analyze failed')
      const result = await res.json()
      navigate('/new', { state: { prefill: { ...result, sourceUrl: linkUrl } } })
    } catch {
      if (!controller.signal.aborted) setAnalyzeError('페이지를 분석하지 못했어요.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  function handleCancelAnalyze() {
    abortRef.current?.abort()
  }

  if (searchResults !== null) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2 rounded-xl bg-surface-container-lowest p-1.5 shadow-[0_3px_0px_#eae0de] focus-within:ring-2 focus-within:ring-primary">
          <div className="pointer-events-none flex items-center pl-2.5 text-on-surface-variant">
            <Icon name="search" className="text-[20px]" />
          </div>
          <input
            type="search"
            placeholder="상품 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 w-full bg-transparent py-1.5 text-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none"
          />
          <button
            type="button"
            aria-label="바코드 스캔"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface transition-colors hover:bg-surface-variant active:scale-95"
          >
            <Icon name="qr_code_scanner" className="text-[20px]" />
          </button>
        </div>
        <div className="space-y-2">
          {searchResults.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">검색 결과가 없습니다.</p>
          ) : (
            searchResults.map((item) => (
              <ItemCard key={item.id} item={item} onClick={() => navigate(`/item/${item.id}`)} />
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {!selectedLocationId && (
        <>
          <HomeProfileCard itemCount={items.length} />
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg">추천 퀘스트</h2>
            <span className="text-label-md text-on-surface-variant">전체보기 →</span>
          </div>
          <QuestCarousel quests={DUMMY_QUESTS} />
        </>
      )}

      <div className="flex items-center gap-2 rounded-xl bg-surface-container-lowest p-1.5 shadow-[0_3px_0px_#eae0de] focus-within:ring-2 focus-within:ring-primary">
        <div className="pointer-events-none flex items-center pl-2.5 text-on-surface-variant">
          <Icon name="search" className="text-[20px]" />
        </div>
        <input
          type="search"
          placeholder="상품 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-0 w-full bg-transparent py-1.5 text-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none"
        />
        <button
          type="button"
          aria-label="바코드 스캔"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface transition-colors hover:bg-surface-variant active:scale-95"
        >
          <Icon name="qr_code_scanner" className="text-[20px]" />
        </button>
      </div>

      {(selectedLocationId || selectedCategoryId) && (
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant"
        >
          <Icon name="arrow_back" className="text-[16px]" />
          뒤로
        </button>
      )}

      {!selectedLocationId && (
        <div className="grid grid-cols-2 gap-space-sm">
          {locations.map((location) => (
            <HomeLocationTile
              key={location.id}
              location={location}
              percent={getLocationCompletion(items, location.id, categories)}
              count={categories.filter((c) => c.locationId === location.id).length}
              onClick={() => setSelectedLocationId(location.id)}
            />
          ))}
        </div>
      )}

      {selectedLocationId && !selectedCategoryId && (
        <div className="grid grid-cols-2 gap-3">
          {categoriesForLocation.map((category) => {
            const count = items.filter((i) => i.categoryId === category.id).length
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategoryId(category.id)}
                className="rounded-xl bg-surface-container-lowest p-space-md text-left shadow-[0_3px_0px_#eae0de]"
              >
                <p className="text-label-lg text-on-surface">{category.name}</p>
                <p className="text-body-sm text-on-surface-variant">{count}개 보유</p>
              </button>
            )
          })}
        </div>
      )}

      {selectedCategoryId && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['all', '전체'],
                ['urgent', '임박만'],
                ['recommended', '추천한 상품만'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1.5 text-label-md ${
                  filter === key
                    ? 'bg-primary text-on-primary shadow-[0_2px_0px_#8b1901]'
                    : 'bg-surface-container text-on-surface-variant shadow-[0_2px_0px_#e1bfb8]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {itemsForCategory.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">조건에 맞는 상품이 없습니다.</p>
            ) : (
              itemsForCategory.map((item) => (
                <ItemCard key={item.id} item={item} onClick={() => navigate(`/item/${item.id}`)} />
              ))
            )}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setShowRecordOptions(true)}
        className="fixed bottom-24 right-4 z-30 flex items-center gap-2 rounded-full bg-primary py-3 pl-3 pr-4 text-on-primary shadow-[0_6px_16px_rgba(170,48,21,0.35),0_3px_0px_#8b1901] transition-all hover:bg-primary-container active:translate-y-1 active:shadow-[0_2px_0px_#8b1901] md:bottom-8"
        aria-label="새로 기록하기"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
          <Icon name="add" className="text-[18px]" />
        </span>
        <span className="text-label-lg font-bold">물품 등록</span>
      </button>

      {showRecordOptions && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={closeRecordSheet}
        >
          <div
            className="w-full max-w-md space-y-2 rounded-t-2xl bg-surface-container-lowest p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            {!showLinkInput ? (
              <>
                <p className="pb-1 text-center text-body-sm text-on-surface-variant">
                  어떻게 기록할까요?
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-ink p-3 text-left text-on-surface"
                >
                  <Icon name="photo_camera" className="text-[20px] text-primary" />
                  <span>카메라로 촬영</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-ink p-3 text-left text-on-surface"
                >
                  <Icon name="image" className="text-[20px] text-primary" />
                  <span>사진 선택</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLinkInput(true)}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-ink p-3 text-left text-on-surface"
                >
                  <Icon name="link" className="text-[20px] text-primary" />
                  <span>링크로 가져오기</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-ink p-3 text-left text-on-surface"
                >
                  <Icon name="edit_note" className="text-[20px] text-primary" />
                  <span>직접 입력</span>
                </button>
                <button
                  type="button"
                  onClick={closeRecordSheet}
                  className="w-full pt-2 text-center text-body-sm text-on-surface-variant"
                >
                  취소
                </button>
              </>
            ) : (
              <>
                <p className="pb-1 text-center text-body-sm text-on-surface-variant">
                  상품 링크를 붙여넣어주세요
                </p>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border-2 border-transparent bg-surface-container-low p-2.5 text-body-md text-on-surface focus:border-primary focus:outline-none"
                  disabled={isAnalyzing}
                />
                {analyzeError && (
                  <p role="alert" className="text-body-sm text-primary">
                    {analyzeError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleAnalyzeLink}
                  disabled={isAnalyzing || !linkUrl.trim()}
                  className="w-full rounded-xl bg-primary py-2.5 text-label-lg text-on-primary shadow-[0_3px_0px_#8b1901] active:translate-y-0.5 active:shadow-[0_1px_0px_#8b1901] disabled:opacity-40 disabled:active:translate-y-0 disabled:active:shadow-[0_3px_0px_#8b1901]"
                >
                  {isAnalyzing ? '분석 중...' : '분석하기'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="w-full pt-1 text-center text-label-md text-primary underline"
                >
                  직접 입력하기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkInput(false)
                    setAnalyzeError(null)
                  }}
                  className="w-full pt-1 text-center text-label-md text-on-surface-variant"
                >
                  뒤로
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {isAnalyzing && (
        <AnalyzingOverlay
          url={linkUrl}
          entryNumber={items.length + 1}
          onCancel={handleCancelAnalyze}
        />
      )}
    </div>
  )
}
