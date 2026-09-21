import type { Category, Item } from '../types'
import { getCategoryCompletion, getMissingMasterItems } from '../state/selectors'
import { Icon } from '../data/materialIcons'

export function CategoryChecklist({
  category,
  items,
  onRename,
  onRemove,
  onRecord,
  onOpenItem,
}: {
  category: Category
  items: Item[]
  onRename: () => void
  onRemove: () => void
  onRecord: () => void
  onOpenItem: (itemId: string) => void
}) {
  const percent = getCategoryCompletion(items, category)
  const missingIds = new Set(getMissingMasterItems(items, category).map((m) => m.id))
  const ownedCount = category.masterItems.length - missingIds.size

  return (
    <section className="rounded-2xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]">
      <div className="flex items-center justify-between gap-space-sm">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-secondary">
            <Icon name="category" className="text-[18px]" />
          </div>
          <h3 className="truncate font-heading text-headline-md text-on-surface">{category.name}</h3>
          <span className="shrink-0 rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
            {ownedCount}/{category.masterItems.length} 완료 ({percent}%)
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-on-surface-variant">
          <button type="button" aria-label="카테고리 이름 수정" onClick={onRename} className="p-1">
            <Icon name="edit" className="text-[18px]" />
          </button>
          <button type="button" aria-label="카테고리 삭제" onClick={onRemove} className="p-1">
            <Icon name="delete" className="text-[18px]" />
          </button>
        </div>
      </div>
      <div className="mt-space-sm h-2 w-full overflow-hidden rounded-full bg-surface-container">
        <div className="h-full rounded-full bg-secondary" style={{ width: `${percent}%` }} />
      </div>
      <ul className="mt-space-sm space-y-1.5">
        {category.masterItems.map((m) => {
          const owned = !missingIds.has(m.id)
          const item = owned
            ? items.find((i) => i.categoryId === category.id && i.masterItemId === m.id)
            : undefined
          const urgent = item?.daysUntilEmpty !== undefined && item.daysUntilEmpty <= 7
          return (
            <li
              key={m.id}
              className="flex items-center gap-2.5 rounded-lg bg-surface-container-low px-2 py-2"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${
                  owned ? 'bg-secondary text-on-secondary' : 'border-2 border-outline-variant'
                }`}
              >
                {owned && <Icon name="check" className="text-[14px]" />}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5 text-label-lg text-on-surface">
                  <span className="truncate">{m.name}</span>
                  {item?.daysUntilEmpty !== undefined && (
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-label-sm ${
                        urgent
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      D-{item.daysUntilEmpty}
                    </span>
                  )}
                </span>
                <span className="truncate text-body-sm text-on-surface-variant">
                  {owned ? (item?.name ?? '') : '미등록 슬롯'}
                </span>
              </div>
              {owned && item ? (
                <button
                  type="button"
                  onClick={() => onOpenItem(item.id)}
                  className="shrink-0 rounded-lg bg-surface-container-high px-2.5 py-1 text-label-sm text-on-surface"
                >
                  관리
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onRecord}
                  className="shrink-0 rounded-lg bg-surface-container-high px-2.5 py-1 text-label-sm text-primary"
                >
                  기록하기
                </button>
              )}
            </li>
          )
        })}
        {category.masterItems.length === 0 && (
          <li className="text-body-sm text-on-surface-variant">
            표준 품목이 아직 없는 카테고리입니다.
          </li>
        )}
      </ul>
    </section>
  )
}
