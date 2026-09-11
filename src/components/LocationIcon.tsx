import { ProgressRing } from './ProgressRing'
import type { Location } from '../types'
import { LOCATION_COLOR_HEX } from '../data/locationColors'

export function LocationIcon({
  location,
  percent,
  selected = false,
  onClick,
}: {
  location: Location
  percent: number
  selected?: boolean
  onClick?: () => void
}) {
  const color = LOCATION_COLOR_HEX[location.colorToken] ?? '#3F6459'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 ${selected ? 'opacity-100' : 'opacity-80'}`}
    >
      <ProgressRing percent={percent} color={color} size={56} strokeWidth={4}>
        <span className="text-lg">📦</span>
      </ProgressRing>
      <span className="text-xs">{location.name}</span>
    </button>
  )
}
