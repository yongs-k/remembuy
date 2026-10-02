import { useId } from 'react'
import { gradeColor } from '../data/gradeColors'

/**
 * One puzzle piece in a 100×100 cell: a tab out of the right edge, a notch into the
 * bottom. Turned 0/90/180/270° it becomes the 장소's four pieces (top-left, top-right,
 * bottom-right, bottom-left), which interlock in a 2×2 square.
 */
const PIECE_PATH =
  'M0 0 H100 V36 C108 30 120 34 120 50 C120 66 108 70 100 64 V100 H64 C70 92 66 80 50 80 C34 80 30 92 36 100 H0 Z'

const SLOT_ROTATION = [0, 90, 180, 270]
// Where each slot's cell sits in the 2×2 board.
const SLOT_CELL = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
]

function shade(hex: string, amount: number) {
  // amount > 0 mixes toward white, < 0 toward black.
  const n = parseInt(hex.slice(1), 16)
  const target = amount > 0 ? 255 : 0
  const mix = (c: number) => Math.round(c + (target - c) * Math.abs(amount))
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map(mix)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

/** A raised, glossy piece: a darker extrusion under a lit face. Draws in its own cell's coordinates. */
function RaisedPiece({ hex, gradientId }: { hex: string; gradientId: string }) {
  return (
    <>
      <path d={PIECE_PATH} fill={shade(hex, -0.35)} transform="translate(5 7)" />
      <path d={PIECE_PATH} fill={`url(#${gradientId})`} />
      <path d={PIECE_PATH} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
    </>
  )
}

function Gradient({ id, hex }: { id: string; hex: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor={shade(hex, 0.45)} />
      <stop offset="55%" stopColor={hex} />
      <stop offset="100%" stopColor={shade(hex, -0.15)} />
    </linearGradient>
  )
}

/** A single piece of a grade, turned to its slot. */
export function PuzzlePiece({ grade, slot = 0, className = '' }: { grade: string; slot?: number; className?: string }) {
  const id = useId()
  const hex = gradeColor(grade).hex
  return (
    <svg aria-hidden viewBox="-12 -12 150 150" className={className}>
      <defs>
        <Gradient id={id} hex={hex} />
      </defs>
      <g transform={`rotate(${SLOT_ROTATION[slot % 4]} 50 50)`}>
        <RaisedPiece hex={hex} gradientId={id} />
      </g>
    </svg>
  )
}

/**
 * A 장소's four pieces of one grade as a 2×2 board: owned pieces raised in the grade's
 * colour, missing ones as faint outlines. `flat` drops the extrusion for small or
 * stretched use (the 장소 tile).
 */
export function PuzzleBoard({
  grade,
  pieces,
  flat = false,
  stretch = false,
  className = '',
}: {
  grade: string
  pieces: number[]
  flat?: boolean
  /** Fill a non-square box (the tile) instead of keeping the square. */
  stretch?: boolean
  className?: string
}) {
  const id = useId()
  const hex = gradeColor(grade).hex
  return (
    <svg
      aria-hidden
      viewBox={stretch ? '0 0 200 200' : '-6 -6 216 216'}
      preserveAspectRatio={stretch ? 'none' : undefined}
      className={className}
    >
      <defs>
        <Gradient id={id} hex={hex} />
      </defs>
      {SLOT_CELL.map(([x, y], slot) => (
        <g key={slot} transform={`translate(${x} ${y}) rotate(${SLOT_ROTATION[slot]} 50 50)`}>
          {pieces[slot] > 0 ? (
            flat ? (
              <path d={PIECE_PATH} fill={hex} fillOpacity="0.42" stroke={shade(hex, -0.2)} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            ) : (
              <RaisedPiece hex={hex} gradientId={id} />
            )
          ) : (
            <path
              d={PIECE_PATH}
              fill="currentColor"
              fillOpacity="0.06"
              stroke="currentColor"
              strokeOpacity="0.3"
              strokeDasharray="4 4"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </g>
      ))}
    </svg>
  )
}

/** "x2", "x3"… over a piece with spare copies. */
export function CopiesBadge({ copies, className = '' }: { copies: number; className?: string }) {
  if (copies < 2) return null
  return (
    <span
      className={`rounded-full bg-inverse-surface px-1.5 text-[11px] font-bold leading-[18px] tabular-nums text-tertiary-fixed-dim ring-1 ring-tertiary-fixed-dim/60 ${className}`}
    >
      x{copies}
    </span>
  )
}

/** Badge positions over a 2×2 board, top-centre of each slot's quarter. */
export const SLOT_BADGE_POSITION = ['left-1/4 top-[3%]', 'left-3/4 top-[3%]', 'left-3/4 top-[53%]', 'left-1/4 top-[53%]']
