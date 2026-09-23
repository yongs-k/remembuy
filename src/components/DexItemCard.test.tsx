import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DexItemCard } from './DexItemCard'
import type { DexEntry } from '../lib/gameApi'

const LOCKED: DexEntry = {
  id: 'item-a',
  name: '기본 세면대',
  grade: 'COMMON',
  fragmentsRequired: 10,
  status: 'LOCKED',
  fragmentCount: 0,
}

const COLLECTING: DexEntry = { ...LOCKED, status: 'COLLECTING', fragmentCount: 4 }
const COMPLETE: DexEntry = { ...LOCKED, status: 'COMPLETE', fragmentCount: 10 }

describe('DexItemCard', () => {
  it('a LOCKED entry hides the name, shows "???", and has no click handler', () => {
    const onOpen = vi.fn()
    render(<DexItemCard entry={LOCKED} onOpen={onOpen} />)
    expect(screen.getByText('???')).toBeInTheDocument()
    expect(screen.queryByText('기본 세면대')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('a COLLECTING entry shows the name and a fragment progress bar', () => {
    render(<DexItemCard entry={COLLECTING} onOpen={() => {}} />)
    expect(screen.getByText('기본 세면대')).toBeInTheDocument()
    const track = screen.getByTestId('dex-progress-fill')
    expect(track).toHaveStyle({ width: '40%' })
  })

  it('a COMPLETE entry shows the name and no progress bar, and calls onOpen when tapped', () => {
    const onOpen = vi.fn()
    render(<DexItemCard entry={COMPLETE} onOpen={onOpen} />)
    expect(screen.getByText('기본 세면대')).toBeInTheDocument()
    expect(screen.queryByTestId('dex-progress-fill')).not.toBeInTheDocument()
    screen.getByRole('button').click()
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
