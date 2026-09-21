import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { CollectionOverview } from '../components/CollectionOverview'
import { CollectionDetail } from '../components/CollectionDetail'

export default function CollectionPage() {
  const { items, locations, categories, renameLocation, removeLocation, renameCategory, removeCategory } =
    useLocker()
  const navigate = useNavigate()
  const [openLocationId, setOpenLocationId] = useState<string | null>(null)
  const openLocation = locations.find((l) => l.id === openLocationId) ?? null

  function handleRenameLocation(id: string, currentName: string) {
    const next = window.prompt('장소 이름 수정', currentName)
    if (next && next.trim()) renameLocation(id, next.trim())
  }

  function handleRemoveLocation(id: string, name: string) {
    if (locations.length <= 1) {
      window.alert('마지막 남은 장소는 삭제할 수 없습니다.')
      return
    }
    if (window.confirm(`"${name}" 장소를 삭제하면 그 안의 카테고리와 상품도 함께 삭제됩니다. 계속할까요?`)) {
      removeLocation(id)
      if (openLocationId === id) setOpenLocationId(null)
    }
  }

  function handleRenameCategory(id: string, currentName: string) {
    const next = window.prompt('카테고리 이름 수정', currentName)
    if (next && next.trim()) renameCategory(id, next.trim())
  }

  function handleRemoveCategory(id: string, name: string) {
    if (categories.length <= 1) {
      window.alert('마지막 남은 카테고리는 삭제할 수 없습니다.')
      return
    }
    if (window.confirm(`"${name}" 카테고리를 삭제하면 그 안의 상품도 함께 삭제됩니다. 계속할까요?`)) {
      removeCategory(id)
    }
  }

  if (!openLocation) {
    return (
      <CollectionOverview
        items={items}
        locations={locations}
        categories={categories}
        onOpen={setOpenLocationId}
      />
    )
  }

  return (
    <CollectionDetail
      items={items}
      locations={locations}
      categories={categories}
      location={openLocation}
      onBack={() => setOpenLocationId(null)}
      onSelectLocation={setOpenLocationId}
      onRenameLocation={() => handleRenameLocation(openLocation.id, openLocation.name)}
      onRemoveLocation={() => handleRemoveLocation(openLocation.id, openLocation.name)}
      onRenameCategory={handleRenameCategory}
      onRemoveCategory={handleRemoveCategory}
      onRecord={() => navigate('/new')}
      onOpenItem={(itemId) => navigate(`/item/${itemId}`)}
    />
  )
}
