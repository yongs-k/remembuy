import type { ReactNode } from 'react'
import { formatDday } from '../state/selectors'

/** Days until empty. Plain text; only urgent ones get the accent color and a dot. */
export function DdayLabel({ days, urgentAt = 7 }: { days: number; urgentAt?: number }) {
  const urgent = days <= urgentAt
  // Overdue and today weigh more than "soon".
  const pressing = days <= 0
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 text-label-md tabular-nums ${
        urgent ? 'text-primary' : 'font-medium text-on-surface-variant'
      } ${pressing ? 'font-bold' : ''}`}
    >
      {urgent && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />}
      {formatDday(days)}
    </span>
  )
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-tertiary-fixed px-2 py-0.5 text-label-sm text-on-tertiary-fixed">
      {children}
    </span>
  )
}

/** Marks placeholder content that is not backed by real data. */
export function SampleTag({ children = '예시' }: { children?: ReactNode }) {
  return (
    <span className="shrink-0 rounded bg-surface-container-high px-1.5 py-0.5 text-label-sm font-normal text-on-surface-variant">
      {children}
    </span>
  )
}
