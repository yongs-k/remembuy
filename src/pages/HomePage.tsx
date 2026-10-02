import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getLocationCompletion, getSoonestRemaining, getUpcomingNotifications } from '../state/selectors'
import { ItemCard } from '../components/ItemCard'
import { RestockCard } from '../components/RestockCard'
import { HomeLocationTile } from '../components/HomeLocationTile'
import { AnalyzingOverlay } from '../components/AnalyzingOverlay'
import { resizeImageToBase64 } from '../lib/imageResize'
import { HomeGameCard } from '../components/HomeGameCard'
import { Icon } from '../data/materialIcons'
import { Sheet } from '../components/Sheet'
import { useBack } from '../hooks/useBack'
import { useGame } from '../state/GameContext'
import { pickEasiestQuests } from '../state/quests'
import { QuestCard } from '../components/QuestCard'

type HomeFilter = 'all' | 'urgent' | 'recommended'

const RESTOCK_PREVIEW = 3

export default function HomePage() {
  const { items, locations, categories, lastPurchase } = useLocker()
  const { quests, rooms } = useGame()
  const easiestQuests = pickEasiestQuests(quests)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedLocationId = searchParams.get('loc')
  const selectedCategoryId = searchParams.get('cat')
  const goBack = useBack()
  const [filter, setFilter] = useState<HomeFilter>('all')
  const [showRecordOptions, setShowRecordOptions] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const upcoming = useMemo(() => getUpcomingNotifications(items, 7), [items])

  const categoriesForLocation = useMemo(
    () => categories.filter((c) => c.locationId === selectedLocationId),
    [categories, selectedLocationId]
  )

  const itemsForCategory = useMemo(() => {
    if (!selectedCategoryId) return []
    return items.filter((item) => {
      if (item.categoryId !== selectedCategoryId) return false
      if (filter === 'urgent') {
        const remaining = getSoonestRemaining(item)
        if (!(remaining !== undefined && remaining <= 7)) return false
      }
      if (filter === 'recommended' && item.recommendation !== 'recommend') return false
      return true
    })
  }, [items, selectedCategoryId, filter])

  useEffect(() => setFilter('all'), [selectedCategoryId])

  const gameCardRef = useRef<HTMLDivElement>(null)
  const [gameCardVisible, setGameCardVisible] = useState(false)
  useEffect(() => {
    const card = gameCardRef.current
    if (!card || typeof IntersectionObserver === 'undefined') return
    // Watch only the bottom band where the floating button sits, so the button
    // hides just while the card passes under it (on desktop the whole home fits
    // on screen and the card sits above the button, which must stay visible).
    // The button occupies roughly the bottom 160px (bottom-24 + its 48px height).
    const band = 160
    const observer = new IntersectionObserver(([entry]) => setGameCardVisible(entry.isIntersecting), {
      rootMargin: `-${Math.max(0, window.innerHeight - band)}px 0px 0px 0px`,
    })
    observer.observe(card)
    return () => {
      observer.disconnect()
      // The card unmounts when drilling into a room; don't leave the button hidden.
      setGameCardVisible(false)
    }
  }, [selectedLocationId])

  function handleBack() {
    goBack(() => setSearchParams(selectedCategoryId && selectedLocationId ? { loc: selectedLocationId } : {}))
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

  async function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const controller = new AbortController()
    abortRef.current = controller
    setIsAnalyzingPhoto(true)
    setAnalyzeError(null)
    try {
      const { base64, mimeType } = await resizeImageToBase64(file)
      const res = await fetch('/api/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType, locations, categories }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error('analyze failed')
      const result = await res.json()
      navigate('/new', { state: { prefill: result } })
    } catch {
      if (!controller.signal.aborted) setAnalyzeError('사진을 분석하지 못했어요.')
    } finally {
      setIsAnalyzingPhoto(false)
    }
  }

  return (
    <div className="space-y-space-lg p-4 pb-28">
      {!selectedLocationId && (
        <section aria-labelledby="restock-title" className="space-y-space-sm pt-space-xs">
          <div className="flex items-center justify-between gap-space-sm">
            <h1 id="restock-title" className="font-heading text-display-sm text-on-surface">
              곧 떨어질 상품
            </h1>
            {/* Wide screens have room for an inline CTA; phones get the floating button. */}
            <button
              type="button"
              onClick={() => setShowRecordOptions(true)}
              className="hidden min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-label-lg text-on-primary active:scale-[0.98] md:inline-flex"
            >
              <Icon name="add" className="text-[18px]" />
              기록하기
            </button>
          </div>
          {upcoming.length === 0 ? (
            <p className="rounded-2xl border border-hairline bg-surface-container-lowest px-space-md py-space-lg text-body-md text-on-surface-variant">
              7일 안에 떨어질 상품이 없어요.
            </p>
          ) : (
            <>
              {/* upcoming is sorted most-overdue first, so the preview is the most urgent three. */}
              <ul className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest shadow-card">
                {upcoming.slice(0, RESTOCK_PREVIEW).map((item) => (
                  <RestockCard key={item.id} item={item} />
                ))}
              </ul>
              {upcoming.length > RESTOCK_PREVIEW && (
                <button
                  type="button"
                  onClick={() => navigate('/notifications')}
                  className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-hairline bg-surface-container-lowest text-label-lg text-on-surface transition-colors hover:bg-surface-container-low"
                >
                  전체 보기
                  <span className="tabular-nums text-on-surface-variant">{upcoming.length}개</span>
                  <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
                </button>
              )}
            </>
          )}
        </section>
      )}

      {!selectedLocationId && easiestQuests.length > 0 && (
        <section aria-labelledby="quest-title" className="space-y-space-sm">
          <div className="flex items-baseline justify-between gap-space-sm">
            <h2 id="quest-title" className="font-heading text-headline-md text-on-surface">
              퀘스트
            </h2>
            <button
              type="button"
              onClick={() => navigate('/quests')}
              className="-my-2 flex min-h-11 shrink-0 items-center gap-0.5 text-label-md text-on-surface-variant"
            >
              전체 보기
              <Icon name="chevron_right" className="text-[18px]" />
            </button>
          </div>
          {/* The three closest to done, in one swipeable row. */}
          <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-space-sm overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {easiestQuests.map((quest) => (
              <QuestCard key={quest.id} quest={quest} className="w-[72%] shrink-0 snap-start sm:w-[46%]" />
            ))}
          </div>
        </section>
      )}

      {(selectedLocationId || selectedCategoryId) && (
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1 relative rounded-full bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']"
        >
          <Icon name="arrow_back" className="text-[16px]" />
          뒤로
        </button>
      )}

      {!selectedLocationId && (
        <>
          <section aria-labelledby="locations-title" className="space-y-space-sm">
            <div className="flex items-baseline justify-between gap-space-sm">
              <h2 id="locations-title" className="font-heading text-headline-md text-on-surface">
                장소별 도감
              </h2>
              <span className="text-body-sm text-on-surface-variant">기록 상품 {items.length}개</span>
            </div>
            <div className="grid grid-cols-3 gap-space-sm sm:grid-cols-5">
              {locations.map((location) => (
                <HomeLocationTile
                  key={location.id}
                  location={location}
                  percent={getLocationCompletion(items, location.id, categories)}
                  count={
                    items.filter((i) =>
                      categories.some((c) => c.id === i.categoryId && c.locationId === location.id)
                    ).length
                  }
                  room={rooms.find((room) => room.spaceId === location.id)}
                  onClick={() => setSearchParams({ loc: location.id })}
                />
              ))}
            </div>
          </section>
          <div ref={gameCardRef}>
            <HomeGameCard />
          </div>
        </>
      )}

      {selectedLocationId && !selectedCategoryId && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categoriesForLocation.map((category) => {
            const count = items.filter((i) => i.categoryId === category.id).length
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setSearchParams({ loc: selectedLocationId ?? category.locationId, cat: category.id })}
                className="rounded-xl bg-surface-container-lowest p-space-md text-left border border-hairline shadow-card"
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
                className={`min-h-9 rounded-full px-3 text-label-md ${
                  filter === key
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {itemsForCategory.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">조건에 맞는 상품이 없어요.</p>
            ) : (
              itemsForCategory.map((item) => (
                <ItemCard key={item.id} item={item} onClick={() => navigate(`/item/${item.id}`)} />
              ))
            )}
          </div>
        </>
      )}

      {/* Steps aside while the purchase toast holds the same spot, and while the
          game card is on screen so it never sits on the card's buttons. */}
      {!lastPurchase && !gameCardVisible && (
        <button
          type="button"
          onClick={() => setShowRecordOptions(true)}
          className="fixed bottom-24 right-4 z-30 flex items-center gap-2 rounded-full bg-primary py-3 pl-3 pr-4 text-on-primary shadow-float transition-all hover:bg-primary-container active:scale-[0.98] md:hidden"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
            <Icon name="add" className="text-[18px]" />
          </span>
          <span className="text-label-lg font-bold">기록하기</span>
        </button>
      )}

      {showRecordOptions && (
        <Sheet
          labelledBy="record-sheet-title"
          // While analyzing, Escape belongs to the overlay's cancel.
          onClose={() => !isAnalyzing && !isAnalyzingPhoto && closeRecordSheet()}
        >
            {!showLinkInput ? (
              <>
                <h2
                  id="record-sheet-title"
                  className="pb-1 text-center text-label-lg text-on-surface"
                >
                  어떻게 기록할까요?
                </h2>
                <button
                  type="button"
                  data-autofocus
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex w-full items-center gap-3 rounded-xl border border-hairline p-3 text-left text-on-surface transition-colors hover:bg-surface-container-low"
                >
                  <Icon name="photo_camera" className="text-[20px] text-on-surface-variant" />
                  <span>카메라로 촬영</span>
                </button>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  hidden
                  onChange={handlePhotoFile}
                />
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex w-full items-center gap-3 rounded-xl border border-hairline p-3 text-left text-on-surface transition-colors hover:bg-surface-container-low"
                >
                  <Icon name="image" className="text-[20px] text-on-surface-variant" />
                  <span>사진 선택</span>
                </button>
                <input
                  type="file"
                  accept="image/*"
                  ref={galleryInputRef}
                  hidden
                  onChange={handlePhotoFile}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkInput(true)
                    setAnalyzeError(null)
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-hairline p-3 text-left text-on-surface transition-colors hover:bg-surface-container-low"
                >
                  <Icon name="link" className="text-[20px] text-on-surface-variant" />
                  <span>링크로 가져오기</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/new')}
                  className="flex w-full items-center gap-3 rounded-xl border border-hairline p-3 text-left text-on-surface transition-colors hover:bg-surface-container-low"
                >
                  <Icon name="edit_note" className="text-[20px] text-on-surface-variant" />
                  <span>직접 입력</span>
                </button>
                {analyzeError && (
                  <>
                    <p role="alert" className="text-body-sm text-error">
                      {analyzeError}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/new')}
                      className="w-full pt-1 text-center text-label-md text-primary underline"
                    >
                      직접 입력하기
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={closeRecordSheet}
                  className="min-h-11 w-full text-center text-body-md text-on-surface-variant"
                >
                  취소
                </button>
              </>
            ) : (
              <>
                <h2
                  id="record-sheet-title"
                  className="pb-1 text-center text-label-lg text-on-surface"
                >
                  상품 링크를 붙여넣어주세요
                </h2>
                <input
                  type="url"
                  autoFocus
                  aria-label="상품 링크"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border-2 border-transparent bg-surface-container-low p-2.5 text-body-lg font-normal text-on-surface focus:border-primary focus:outline-none"
                  disabled={isAnalyzing}
                />
                {analyzeError && (
                  <p role="alert" className="text-body-sm text-error">
                    {analyzeError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleAnalyzeLink}
                  disabled={isAnalyzing || !linkUrl.trim()}
                  className="w-full rounded-xl bg-primary py-2.5 text-label-lg text-on-primary active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
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
          {isAnalyzing && (
            <AnalyzingOverlay dialogLabel="링크 분석 중" onCancel={handleCancelAnalyze} />
          )}
          {isAnalyzingPhoto && (
            <AnalyzingOverlay dialogLabel="사진 분석 중" onCancel={handleCancelAnalyze} />
          )}
        </Sheet>
      )}
    </div>
  )
}
