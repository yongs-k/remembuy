import type { ReactNode } from 'react'

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rotate-[-3deg] rounded-full border-2 border-stamp px-2 py-0.5 text-xs font-bold text-stamp">
      {children}
    </span>
  )
}
