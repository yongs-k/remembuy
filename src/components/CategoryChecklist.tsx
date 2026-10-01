import type { Category, Item } from '../types'
import { DdayLabel } from './Badge'
import { getCategoryCompletion, getMissingMasterItems, getRemainingDays } from '../state/selectors'
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
  /** Opens /new for this category, pre-linked to the missing standard item. */
  onRecord: (masterItemId: string, masterItemName: string) => void
  onOpenItem: (itemId: string) => void
}) {
  const percent = getCategoryCompletion(items, category)
  const missingIds = new Set(getMissingMasterItems(items, category).map((m) => m.id))
  const ownedCount = category.masterItems.length - missingIds.size

  return (
    <section className="rounded-2xl border border-hairline bg-surface-container-lowest shadow-card">
      <div className="flex items-center justify-between gap-space-sm py-1 pl-space-md pr-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="truncate font-heading text-headline-md text-on-surface">{category.name}</h2>
          <span className="shrink-0 text-label-md tabular-nums text-on-surface-variant">
            {ownedCount}/{category.masterItems.length}
          </span>
        </div>
        <div className="flex shrink-0 items-center text-on-surface-variant">
          <button
            type="button"
            aria-label={`${category.name} 이름 수정`}
            onClick={onRename}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-container"
          >
            <Icon name="edit" className="text-[18px]" />
          </button>
          <button
            type="button"
            aria-label={`${category.name} 삭제`}
            onClick={onRemove}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-container"
          >
            <Icon name="delete" className="text-[18px]" />
          </button>
        </div>
      </div>
      <div className="mx-space-md h-1 overflow-hidden rounded-full bg-surface-container-high">
        <div className="h-full rounded-full bg-secondary" style={{ width: `${percent}%` }} />
      </div>
      <ul className="mt-1 divide-y divide-hairline">
        {category.masterItems.map((m) => {
          const owned = !missingIds.has(m.id)
          const item = owned
            ? items.find((i) => i.categoryId === category.id && i.masterItemId === m.id)
            : undefined
          const remaining = item ? getRemainingDays(item) : undefined
          const rowCls = 'flex min-h-14 w-full items-center gap-2.5 px-space-md py-2 text-left'
          const content = (
            <>
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  owned ? 'bg-secondary text-on-secondary' : 'border-2 border-outline-variant'
                }`}
              >
                {owned && <Icon name="check" className="text-[14px]" />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={`truncate text-label-lg ${owned ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                  {m.name}
                </span>
                {owned && item && <span className="truncate text-body-sm text-on-surface-variant">{item.name}</span>}
              </span>
              {remaining !== undefined && <DdayLabel days={remaining} />}
            </>
          )
          return (
            <li key={m.id}>
              {owned && item ? (
                <button
                  type="button"
                  onClick={() => onOpenItem(item.id)}
                  className={`${rowCls} transition-colors hover:bg-surface-container-low`}
                >
                  {content}
                  <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
                </button>
              ) : (
                // The whole empty row records it; a quiet + replaces a column of identical buttons.
                <button
                  type="button"
                  onClick={() => onRecord(m.id, m.name)}
                  aria-label={`${m.name} 기록하기`}
                  className={`${rowCls} transition-colors hover:bg-surface-container-low`}
                >
                  {content}
                  <span
                    aria-hidden
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline text-on-surface-variant"
                  >
                    <Icon name="add" className="text-[18px]" />
                  </span>
                </button>
              )}
            </li>
          )
        })}
        {category.masterItems.length === 0 && (
          <li className="px-space-md py-3 text-body-sm text-on-surface-variant">표준 품목이 아직 없는 카테고리예요.</li>
        )}
      </ul>
    </section>
  )
}
