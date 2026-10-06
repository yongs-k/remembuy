import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CombinePage, { autoFill } from './CombinePage'
import * as GameContextModule from '../state/GameContext'
import type { PieceStack } from '../lib/gameApi'

vi.mock('../state/GameContext')

const stack = (spaceId: string, count: number, source: PieceStack['source'] = 'stock'): PieceStack => ({
  spaceId,
  grade: 'COMMON',
  source,
  count,
})

describe('autoFill', () => {
  it('takes ten from piles of four or more, tallest first, and refuses short of ten', () => {
    const picked = autoFill([stack('car', 5), stack('kitchen', 6), stack('laundry', 3)])
    expect(picked?.map((p) => p.spaceId)).toEqual([...Array(6).fill('kitchen'), ...Array(4).fill('car')])
    expect(autoFill([stack('car', 5), stack('laundry', 3), stack('entrance', 3)])).toBeNull()
  })

  it('uses kept pieces first and leaves a stage pile its four for 달성', () => {
    const picked = autoFill([stack('bathroom', 9, 'stage'), stack('car', 4), stack('kitchen', 4)])
    expect(picked?.map((p) => p.spaceId)).toEqual([...Array(4).fill('car'), ...Array(4).fill('kitchen'), 'bathroom', 'bathroom'])
    // A stage pile of exactly four gives nothing.
    expect(autoFill([stack('bathroom', 4, 'stage'), stack('car', 6)])).toBeNull()
  })
})

describe('CombinePage', () => {
  function mock(stacks: PieceStack[], combine = vi.fn()) {
    vi.mocked(GameContextModule.useGame).mockReturnValue({ stacks, combine } as unknown as ReturnType<
      typeof GameContextModule.useGame
    >)
    render(
      <MemoryRouter>
        <CombinePage />
      </MemoryRouter>
    )
    return combine
  }

  it('fills by hand from small piles and sends those picks', async () => {
    const combine = mock(
      [stack('car', 3), stack('laundry', 3), stack('entrance', 4, 'stage')],
      vi.fn().mockResolvedValue({
        piece: { spaceId: 'kitchen', grade: 'ADVANCED', slot: 0, source: 'stock', count: 1, ready: false },
        itemName: '무쇠 냄비',
      })
    )
    // Only one pile has four or more, short of ten: 자동 넣기 is off.
    expect(screen.getByRole('button', { name: '자동 넣기' })).toBeDisabled()
    for (const place of ['차량', '세탁실/다용도실']) {
      for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${place} 보관 조각 넣기`) }))
    }
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: /^현관\/신발장 단계 조각 넣기/ }))
    fireEvent.click(screen.getByRole('button', { name: '조합하기' }))
    await waitFor(() => expect(screen.getByText(/주방 조각을 얻었어요/)).toBeInTheDocument())
    expect(combine).toHaveBeenCalledWith('COMMON', [
      { spaceId: 'car', source: 'stock', count: 3 },
      { spaceId: 'laundry', source: 'stock', count: 3 },
      { spaceId: 'entrance', source: 'stage', count: 4 },
    ])
  })

  it('자동 넣기 fills all ten slots at once', () => {
    mock([stack('kitchen', 6), stack('car', 5)])
    fireEvent.click(screen.getByRole('button', { name: '자동 넣기' }))
    expect(screen.getByRole('button', { name: '조합하기' })).toBeEnabled()
  })
})
