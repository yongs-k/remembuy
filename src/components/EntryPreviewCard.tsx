import { Icon } from '../data/materialIcons'

export function EntryPreviewCard({
  name,
  locationName,
  categoryName,
  price,
  restockCycle,
}: {
  name: string
  locationName: string
  categoryName: string
  price: number | ''
  restockCycle: string
}) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]">
      <div className="flex flex-wrap items-center gap-1.5 text-label-sm">
        {locationName && (
          <span className="rounded bg-secondary-container px-1.5 py-0.5 text-on-secondary-container">
            {locationName}
          </span>
        )}
        {categoryName && (
          <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-on-surface-variant">
            {categoryName}
          </span>
        )}
      </div>
      <div className="mt-space-sm flex gap-space-md">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
          <Icon name="inventory_2" className="text-[28px]" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2
            className={`line-clamp-2 font-heading text-headline-md ${
              name ? 'text-on-surface' : 'text-on-surface-variant'
            }`}
          >
            {name || '상품 이름을 입력하세요'}
          </h2>
          {price !== '' && (
            <span className="text-label-md text-primary">정가 {Number(price).toLocaleString()}원</span>
          )}
          {restockCycle && (
            <span className="flex items-center gap-1 text-body-sm text-on-surface-variant">
              <Icon name="update" className="text-[14px]" />
              {restockCycle}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
