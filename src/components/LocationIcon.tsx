import { ProgressRing } from './ProgressRing'
import type { Location } from '../types'
import { LOCATION_COLOR_HEX } from '../data/locationColors'
import { LOCATION_EMOJI } from '../data/locationEmoji'

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
  const emoji = LOCATION_EMOJI[location.colorToken] ?? '📦'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chunky-btn flex flex-col items-center gap-1 rounded-2xl bg-transparent p-2 shadow-none active:shadow-none ${selected ? 'opacity-100' : 'opacity-80'}`}
    >
      <ProgressRing percent={percent} color={color} size={56} strokeWidth={4}>
        <span className="text-lg">{emoji}</span>
      </ProgressRing>
      <span className="text-xs">{location.name}</span>
    </button>
  )
}
