import { ProgressRing } from './ProgressRing'
import type { Location } from '../types'

const LOCATION_COLOR_HEX: Record<string, string> = {
  bathroom: '#6E8F87',
  kitchen: '#C98F2B',
  laundry: '#7D93A6',
  closet: '#B0472E',
  vanity: '#A9789A',
  bedroom: '#8A8F6E',
  livingroom: '#9C8B5E',
  entrance: '#6F7D5C',
  medicine: '#B0763F',
  car: '#5C7A8B',
}

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
