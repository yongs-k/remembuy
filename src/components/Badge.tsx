import type { ReactNode } from 'react'

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
