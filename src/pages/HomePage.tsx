import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getLocationCompletion } from '../state/selectors'
import { LocationIcon } from '../components/LocationIcon'
import { ItemCard } from '../components/ItemCard'
import { HomeProfileCard } from '../components/HomeProfileCard'
import { QuestCarousel } from '../components/QuestCarousel'
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
    setIsAnalyzing(true)
    setAnalyzeError(null)
    try {
      const res = await fetch('/api/analyze-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl, locations, categories }),
      })
      if (!res.ok) throw new Error('analyze failed')
      const result = await res.json()
      navigate('/new', { state: { prefill: { ...result, sourceUrl: linkUrl } } })
    } catch {
      setAnalyzeError('페이지를 분석하지 못했어요.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (searchResults !== null) {
    return (
      <div className="space-y-4 p-4">
        <input
          type="search"
          placeholder="상품 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-ink/20 bg-card p-2"
        />
        <div className="space-y-2">
          {searchResults.length === 0 ? (
            <p className="text-sm text-ink/50">검색 결과가 없습니다.</p>
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
            <span className="text-sm text-ink/40">전체보기 →</span>
          </div>
          <QuestCarousel quests={DUMMY_QUESTS} />
        </>
      )}

      <input
        type="search"
        placeholder="상품 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-ink/20 bg-card p-2"
      />

      {(selectedLocationId || selectedCategoryId) && (
        <button type="button" onClick={handleBack} className="text-sm text-ink/60">
          ← 뒤로
        </button>
      )}

      {!selectedLocationId && (
        <div className="grid grid-cols-3 gap-3">
          {locations.map((location) => (
            <LocationIcon
              key={location.id}
              location={location}
              percent={getLocationCompletion(items, location.id, categories)}
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
                className="rounded-lg border border-ink/10 bg-card p-3 text-left"
              >
                <p className="font-medium">{category.name}</p>
                <p className="text-xs text-ink/50">{count}개 보유</p>
              </button>
            )
          })}
        </div>
      )}

      {selectedCategoryId && (
        <>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-full px-3 py-1 text-sm ${
                filter === 'all' ? 'bg-stamp text-white' : 'bg-card text-ink'
              }`}
            >
              전체
            </button>
            <button
              type="button"
              onClick={() => setFilter('urgent')}
              className={`rounded-full px-3 py-1 text-sm ${
                filter === 'urgent' ? 'bg-stamp text-white' : 'bg-card text-ink'
              }`}
            >
              임박만
            </button>
            <button
              type="button"
              onClick={() => setFilter('recommended')}
              className={`rounded-full px-3 py-1 text-sm ${
                filter === 'recommended' ? 'bg-stamp text-white' : 'bg-card text-ink'
              }`}
            >
              추천한 상품만
            </button>
          </div>
          <div className="space-y-2">
            {itemsForCategory.length === 0 ? (
              <p className="text-sm text-ink/50">조건에 맞는 상품이 없습니다.</p>
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
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-stamp text-2xl text-white shadow-lg md:bottom-8"
        aria-label="새로 기록하기"
      >
        +
      </button>

      {showRecordOptions && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={closeRecordSheet}
        >
          <div
            className="w-full max-w-md space-y-2 rounded-t-2xl bg-card p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            {!showLinkInput ? (
              <>
                <p className="pb-1 text-center text-sm text-ink/50">어떻게 기록할까요?</p>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="flex w-full items-center gap-3 rounded-lg border border-ink/10 p-3 text-left"
                >
                  <span className="text-xl">📷</span>
                  <span>카메라로 촬영</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="flex w-full items-center gap-3 rounded-lg border border-ink/10 p-3 text-left"
                >
                  <span className="text-xl">🖼️</span>
                  <span>사진 선택</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLinkInput(true)}
                  className="flex w-full items-center gap-3 rounded-lg border border-ink/10 p-3 text-left"
                >
                  <span className="text-xl">🔗</span>
                  <span>링크로 가져오기</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="flex w-full items-center gap-3 rounded-lg border border-ink/10 p-3 text-left"
                >
                  <span className="text-xl">✏️</span>
                  <span>직접 입력</span>
                </button>
                <button
                  type="button"
                  onClick={closeRecordSheet}
                  className="w-full pt-2 text-center text-sm text-ink/50"
                >
                  취소
                </button>
              </>
            ) : (
              <>
                <p className="pb-1 text-center text-sm text-ink/50">상품 링크를 붙여넣어주세요</p>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-ink/20 bg-paper p-2 text-sm"
                  disabled={isAnalyzing}
                />
                {analyzeError && <p className="text-sm text-stamp">{analyzeError}</p>}
                <button
                  type="button"
                  onClick={handleAnalyzeLink}
                  disabled={isAnalyzing || !linkUrl.trim()}
                  className="w-full rounded-lg bg-stamp py-2 text-sm text-white disabled:opacity-40"
                >
                  {isAnalyzing ? '분석 중...' : '분석하기'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="w-full pt-1 text-center text-sm text-accent underline"
                >
                  직접 입력하기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkInput(false)
                    setAnalyzeError(null)
                  }}
                  className="w-full pt-1 text-center text-sm text-ink/50"
                >
                  뒤로
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
