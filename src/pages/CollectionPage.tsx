import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { CollectionOverview } from '../components/CollectionOverview'
import { CollectionDetail } from '../components/CollectionDetail'
import { Sheet } from '../components/Sheet'
import { useBack } from '../hooks/useBack'
import type { RecordPrefill } from './NewItemPage'

type Target = { kind: 'location' | 'category'; id: string; name: string }
type Pending = { action: 'rename' | 'remove'; target: Target }

const KIND_LABEL = { location: '장소', category: '카테고리' } as const

export default function CollectionPage() {
  const { items, locations, categories, renameLocation, removeLocation, renameCategory, removeCategory } =
    useLocker()
  const navigate = useNavigate()
  const goBack = useBack()
  const [searchParams, setSearchParams] = useSearchParams()
  const openLocation = locations.find((l) => l.id === searchParams.get('room')) ?? null
  const [pending, setPending] = useState<Pending | null>(null)
  const [draftName, setDraftName] = useState('')

  function ask(action: Pending['action'], target: Target) {
    setDraftName(target.name)
    setPending({ action, target })
  }

  function confirmRename() {
    if (!pending || !draftName.trim()) return
    const { kind, id } = pending.target
    if (kind === 'location') renameLocation(id, draftName.trim())
    else renameCategory(id, draftName.trim())
    setPending(null)
  }

  function confirmRemove() {
    if (!pending) return
    const { kind, id } = pending.target
    if (kind === 'location') {
      removeLocation(id)
      if (openLocation?.id === id) setSearchParams({}, { replace: true })
    } else {
      removeCategory(id)
    }
    setPending(null)
  }

  const isLast =
    pending?.action === 'remove' &&
    (pending.target.kind === 'location' ? locations.length <= 1 : categories.length <= 1)

  const sheet = pending && (
    <Sheet labelledBy="collection-sheet-title" onClose={() => setPending(null)}>
      {pending.action === 'rename' ? (
        <form
          className="space-y-space-sm"
          onSubmit={(e) => {
            e.preventDefault()
            confirmRename()
          }}
        >
          <h2 id="collection-sheet-title" className="text-center text-label-lg text-on-surface">
            {KIND_LABEL[pending.target.kind]} 이름 바꾸기
          </h2>
          <input
            data-autofocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            aria-label={`새 ${KIND_LABEL[pending.target.kind]} 이름`}
            className="w-full rounded-lg border-2 border-transparent bg-surface-container-low p-2.5 text-body-lg font-normal text-on-surface focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draftName.trim()}
            className="min-h-12 w-full rounded-xl bg-primary text-label-lg text-on-primary active:scale-[0.98] disabled:bg-surface-container-high disabled:text-on-surface-variant"
          >
            저장
          </button>
          <button
            type="button"
            onClick={() => setPending(null)}
            className="min-h-11 w-full text-center text-body-md text-on-surface-variant"
          >
            취소
          </button>
        </form>
      ) : (
        <>
          <h2 id="collection-sheet-title" className="text-center text-label-lg text-on-surface">
            "{pending.target.name}" {KIND_LABEL[pending.target.kind]}를 삭제할까요?
          </h2>
          <p className="text-center text-body-sm text-on-surface-variant">
            {isLast
              ? `마지막 남은 ${KIND_LABEL[pending.target.kind]}는 삭제할 수 없어요.`
              : pending.target.kind === 'location'
                ? '안에 있는 카테고리와 상품도 함께 삭제되고, 되돌릴 수 없어요.'
                : '안에 있는 상품도 함께 삭제되고, 되돌릴 수 없어요.'}
          </p>
          {!isLast && (
            <button
              type="button"
              onClick={confirmRemove}
              className="min-h-12 w-full rounded-xl bg-error text-label-lg text-on-error active:scale-[0.98]"
            >
              삭제
            </button>
          )}
          <button
            type="button"
            data-autofocus
            onClick={() => setPending(null)}
            className="min-h-11 w-full text-center text-body-md text-on-surface-variant"
          >
            {isLast ? '확인' : '취소'}
          </button>
        </>
      )}
    </Sheet>
  )

  if (!openLocation) {
    return (
      <>
        <CollectionOverview
          items={items}
          locations={locations}
          categories={categories}
          onOpen={(id) => setSearchParams({ room: id })}
        />
        {sheet}
      </>
    )
  }

  return (
    <>
      <CollectionDetail
        items={items}
        locations={locations}
        categories={categories}
        location={openLocation}
        onBack={() => goBack(() => setSearchParams({}))}
        // Switching rooms from the chip strip shouldn't pile up history entries.
        onSelectLocation={(id) => setSearchParams({ room: id }, { replace: true })}
        onRenameLocation={() => ask('rename', { kind: 'location', id: openLocation.id, name: openLocation.name })}
        onRemoveLocation={() => ask('remove', { kind: 'location', id: openLocation.id, name: openLocation.name })}
        onRenameCategory={(id, name) => ask('rename', { kind: 'category', id, name })}
        onRemoveCategory={(id, name) => ask('remove', { kind: 'category', id, name })}
        onRecord={(target) => {
          const prefill: RecordPrefill = {
            manual: true,
            locationId: openLocation.id,
            categoryId: target?.categoryId,
            masterItemId: target?.masterItemId,
            name: target?.masterItemName,
          }
          navigate('/new', { state: { prefill } })
        }}
        onOpenItem={(itemId) => navigate(`/item/${itemId}`)}
      />
      {sheet}
    </>
  )
}
