import type { ReactNode } from 'react'

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-tertiary-fixed px-2 py-0.5 text-label-sm text-on-tertiary-fixed">
      {children}
    </span>
  )
}
