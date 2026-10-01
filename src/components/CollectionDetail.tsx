import type { Category, Item, Location } from '../types'
import { getLocationCompletion, getMasterItemCounts } from '../state/selectors'
import { CategoryChecklist } from './CategoryChecklist'
import { Icon } from '../data/materialIcons'

export function CollectionDetail({
  items,
  locations,
  categories,
  location,
  onBack,
  onSelectLocation,
  onRenameLocation,
  onRemoveLocation,
  onRenameCategory,
  onRemoveCategory,
  onRecord,
  onOpenItem,
}: {
  items: Item[]
  locations: Location[]
  categories: Category[]
  location: Location
  onBack: () => void
  onSelectLocation: (id: string) => void
  onRenameLocation: () => void
  onRemoveLocation: () => void
  onRenameCategory: (id: string, name: string) => void
  onRemoveCategory: (id: string, name: string) => void
  onRecord: (target?: { categoryId: string; masterItemId: string; masterItemName: string }) => void
  onOpenItem: (itemId: string) => void
}) {
  const locationCategories = categories.filter((c) => c.locationId === location.id)
  const percent = getLocationCompletion(items, location.id, categories)
  const counts = getMasterItemCounts(items, categories, location.id)

  return (
    <div className="flex flex-col gap-space-md p-margin">
      <div className="flex items-center justify-between gap-space-sm">
        <button
          type="button"
          onClick={onBack}
          className="relative flex shrink-0 items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant transition-colors before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] hover:bg-surface-container-high"
        >
          <Icon name="arrow_back" className="text-[16px]" />
          컬렉션
        </button>
        <div className="-mr-2 flex shrink-0 items-center text-on-surface-variant">
          <button
            type="button"
            aria-label="장소 이름 수정"
            onClick={onRenameLocation}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-container"
          >
            <Icon name="edit" className="text-[20px]" />
          </button>
          <button
            type="button"
            aria-label="장소 삭제"
            onClick={onRemoveLocation}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-container"
          >
            <Icon name="delete" className="text-[20px]" />
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-space-xs [scrollbar-width:none]">
        {locations.map((l) => {
          const c = getMasterItemCounts(items, categories, l.id)
          const active = l.id === location.id
          return (
            <button
              key={l.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectLocation(l.id)}
              className={`min-h-9 shrink-0 rounded-full px-3 text-label-md tabular-nums ${
                active ? 'bg-on-surface text-surface' : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {l.name} {c.owned}/{c.total}
            </button>
          )
        })}
      </div>

      <section className="space-y-space-sm">
        <div className="flex items-baseline justify-between gap-space-sm">
          <h1 className="truncate font-heading text-display-sm text-on-surface">{location.name}</h1>
          <span className="shrink-0 font-heading text-stat-counter tabular-nums text-on-surface">{percent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div className="h-full rounded-full bg-secondary" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-body-sm text-on-surface-variant">
          {counts.owned >= counts.total
            ? `표준 소모품 ${counts.total}종을 모두 모았어요`
            : `표준 소모품 ${counts.total}종 중 ${counts.owned}종 · ${counts.total - counts.owned}종 더 모으면 완성`}
        </p>
      </section>

      {locationCategories.map((category) => (
        <CategoryChecklist
          key={category.id}
          category={category}
          items={items}
          onRename={() => onRenameCategory(category.id, category.name)}
          onRemove={() => onRemoveCategory(category.id, category.name)}
          onRecord={(masterItemId, masterItemName) => onRecord({ categoryId: category.id, masterItemId, masterItemName })}
          onOpenItem={onOpenItem}
        />
      ))}

      <button
        type="button"
        onClick={() => onRecord()}
        className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-primary text-label-lg text-on-primary active:scale-[0.98]"
      >
        <Icon name="add" className="text-[20px]" />
        {location.name}에 새로 기록하기
      </button>
    </div>
  )
}
