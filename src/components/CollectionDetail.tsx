import type { Category, Item, Location } from '../types'
import { getLocationCompletion, getMasterItemCounts } from '../state/selectors'
import { CategoryChecklist } from './CategoryChecklist'
import { Icon, LOCATION_MATERIAL_ICON } from '../data/materialIcons'
import { DUMMY_DETAIL_GOAL } from '../data/collectionDummy'

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
  onRecord: () => void
  onOpenItem: (itemId: string) => void
}) {
  const locationCategories = categories.filter((c) => c.locationId === location.id)
  const percent = getLocationCompletion(items, location.id, categories)
  const counts = getMasterItemCounts(items, categories, location.id)
  const icon = LOCATION_MATERIAL_ICON[location.colorToken] ?? 'inventory_2'

  return (
    <div className="flex flex-col gap-space-md p-margin">
      <div className="flex items-center justify-between gap-space-sm">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex shrink-0 items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant"
          >
            <Icon name="arrow_back" className="text-[16px]" />
            도감 목록
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-on-surface-variant">
          <button type="button" aria-label="장소 이름 수정" onClick={onRenameLocation} className="p-1">
            <Icon name="edit" className="text-[20px]" />
          </button>
          <button type="button" aria-label="장소 삭제" onClick={onRemoveLocation} className="p-1">
            <Icon name="delete" className="text-[20px]" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Icon name={icon} className="text-[28px] text-primary" />
        <h1 className="truncate font-heading text-headline-lg text-on-surface">{location.name} 도감</h1>
        <span className="shrink-0 rounded-full bg-secondary-container px-2 py-0.5 text-label-sm text-on-secondary-container">
          {percent >= 100 ? '완성' : '진행중'}
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-space-xs">
        {locations.map((l) => {
          const c = getMasterItemCounts(items, categories, l.id)
          const active = l.id === location.id
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onSelectLocation(l.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-label-md ${
                active
                  ? 'bg-primary text-on-primary shadow-[0_2px_0px_#8b1901]'
                  : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {l.name} ({c.owned}/{c.total})
            </button>
          )
        })}
      </div>

      <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]">
        <div className="flex items-center justify-between gap-space-sm">
          <div className="flex min-w-0 flex-col">
            <span className="font-heading text-headline-md text-on-surface">도감 마스터리</span>
            <span className="text-body-sm text-on-surface-variant">
              표준 소모품 {counts.total}종 중 <span className="text-primary">{counts.owned}개</span> 채움
            </span>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-md text-primary">
            {percent}%
          </div>
        </div>
        <div className="mt-space-sm h-2 w-full overflow-hidden rounded-full bg-surface-container">
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-label-sm text-on-surface-variant">{DUMMY_DETAIL_GOAL}</p>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-surface-container-low p-space-sm text-body-sm text-on-surface-variant">
        <Icon name="map" className="text-[20px] text-tertiary" />
        표준 소모품 {locationCategories.length}개 카테고리 분류 기준
      </div>

      {locationCategories.map((category) => (
        <CategoryChecklist
          key={category.id}
          category={category}
          items={items}
          onRename={() => onRenameCategory(category.id, category.name)}
          onRemove={() => onRemoveCategory(category.id, category.name)}
          onRecord={onRecord}
          onOpenItem={onOpenItem}
        />
      ))}

      <div className="sticky bottom-20 z-40 flex items-stretch gap-space-sm md:bottom-4">
        <button
          type="button"
          onClick={onRecord}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface-container-lowest p-3 text-label-lg text-on-surface shadow-[0_4px_12px_rgba(0,0,0,0.08),0_3px_0px_rgba(43,38,37,0.12)] active:translate-y-0.5"
        >
          <Icon name="add_box" className="text-[20px] text-primary" />
          아이템 직접등록
        </button>
        <button
          type="button"
          disabled
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary p-3 text-label-lg text-on-primary shadow-[0_4px_12px_rgba(170,48,21,0.25),0_4px_0px_#8b1901] disabled:opacity-60"
        >
          <Icon name="barcode_scanner" className="text-[20px]" />
          바코드 찍고 채우기
        </button>
      </div>
    </div>
  )
}
