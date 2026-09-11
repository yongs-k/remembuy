import type { ReactNode } from 'react'

type ProgressRingProps = {
  percent: number
  color: string
  size?: number
  strokeWidth?: number
  showLabel?: boolean
  children?: ReactNode
}

export function ProgressRing({
  percent,
  color,
  size = 64,
  strokeWidth = 4,
  showLabel = true,
  children,
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, percent))
  const radius = size / 2 - strokeWidth / 2
  const circumference = 2 * Math.PI * radius
  const dashoffset = circumference * (1 - clamped / 100)

  return (
    <div className="relative inline-flex flex-col items-center gap-1" style={{ width: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          className="progress-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#D9CBA0"
          strokeWidth={strokeWidth}
        />
        <circle
          className="progress-ring__progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center rotate-0">
        {children}
      </div>
      {showLabel && <span className="text-xs text-ink">{clamped}%</span>}
    </div>
  )
}
