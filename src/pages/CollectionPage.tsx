import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import {
  getLocationCompletion,
  getCategoryCompletion,
  getMissingMasterItems,
} from '../state/selectors'
import { ProgressRing } from '../components/ProgressRing'
import { LOCATION_COLOR_HEX } from '../data/locationColors'

export default function CollectionPage() {
  const { items, locations, categories, renameLocation, removeLocation, renameCategory, removeCategory } =
    useLocker()
  const navigate = useNavigate()
  const [activeLocationId, setActiveLocationId] = useState(locations[0].id)

  const activeCategories = categories.filter((c) => c.locationId === activeLocationId)

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
      if (activeLocationId === id) {
        const fallback = locations.find((l) => l.id !== id)
        if (fallback) setActiveLocationId(fallback.id)
      }
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

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">컬렉션</h1>

      <div className="grid grid-cols-3 gap-3">
        {locations.map((location) => {
          const percent = getLocationCompletion(items, location.id, categories)
          const color = LOCATION_COLOR_HEX[location.colorToken] ?? '#3F6459'
          return (
            <div key={location.id} className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveLocationId(location.id)}
                className={`chunky-btn flex flex-col items-center gap-1 rounded-2xl p-2 shadow-none active:shadow-none ${
                  activeLocationId === location.id ? 'bg-card shadow-chunky active:shadow-none' : 'bg-transparent'
                }`}
              >
                <ProgressRing percent={percent} color={color} size={56} strokeWidth={4}>
                  <span className="text-lg">📦</span>
                </ProgressRing>
                <span className="text-xs">{location.name}</span>
              </button>
              <div className="flex gap-1 text-xs text-ink/40">
                <button type="button" onClick={() => handleRenameLocation(location.id, location.name)}>
                  ✏️
                </button>
                <button type="button" onClick={() => handleRemoveLocation(location.id, location.name)}>
                  🗑️
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-3">
        {activeCategories.map((category) => {
          const percent = getCategoryCompletion(items, category)
          const missing = getMissingMasterItems(items, category)
          const owned = category.masterItems.filter(
            (m) => !missing.some((miss) => miss.id === m.id)
          )
          return (
            <div key={category.id} className="chunky-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{category.name}</p>
                  <button
                    type="button"
                    onClick={() => handleRenameCategory(category.id, category.name)}
                    className="text-xs text-ink/40"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(category.id, category.name)}
                    className="text-xs text-ink/40"
                  >
                    🗑️
                  </button>
                </div>
                <span className="text-sm text-ink/50">{percent}%</span>
              </div>
              <div className="mb-2 h-2 rounded-full bg-paper">
                <div
                  className="h-2 rounded-full bg-accent"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <ul className="space-y-1 text-sm">
                {owned.map((m) => (
                  <li key={m.id} className="text-ink">
                    ✅ {m.name}
                  </li>
                ))}
                {missing.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-ink/40">
                    <span>⬜ {m.name}</span>
                    <button
                      type="button"
                      onClick={() => navigate('/new')}
                      className="text-xs text-accent underline"
                    >
                      기록하기
                    </button>
                  </li>
                ))}
                {category.masterItems.length === 0 && (
                  <li className="text-ink/40">표준 품목이 아직 없는 카테고리입니다.</li>
                )}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
