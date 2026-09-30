import { useState } from 'react'
import type { Item } from '../types'
import { useLocker } from '../state/LockerContext'
import { LOCATION_COLOR_HEX } from '../data/locationColors'
import { Icon, LOCATION_MATERIAL_ICON } from '../data/materialIcons'

/** Product photo when there is one; otherwise the icon of the place it lives, in that place's color. */
export function ItemThumb({ item, className = 'h-12 w-12' }: { item: Item; className?: string }) {
  const { categories, locations } = useLocker()
  const [imageFailed, setImageFailed] = useState(false)
  const locationId = categories.find((c) => c.id === item.categoryId)?.locationId
  const colorToken = locations.find((l) => l.id === locationId)?.colorToken ?? ''
  const color = LOCATION_COLOR_HEX[colorToken]

  if (item.imageUrl && !imageFailed) {
    return (
      <img
        src={item.imageUrl}
        alt=""
        onError={() => setImageFailed(true)}
        className={`shrink-0 rounded-lg bg-surface-container-low object-cover ${className}`}
      />
    )
  }
  return (
    <div
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant ${className}`}
      style={color ? { backgroundColor: `${color}26`, color } : undefined}
    >
      <Icon name={LOCATION_MATERIAL_ICON[colorToken] ?? 'inventory_2'} className="text-[22px]" />
    </div>
  )
}
