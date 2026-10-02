import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PieceCombine } from './PieceCombine'
import * as GameContextModule from '../state/GameContext'

vi.mock('../state/GameContext')

describe('PieceCombine', () => {
  it('combines only with ten spares and shows the new piece', async () => {
    const combine = vi.fn().mockResolvedValue({
      spaceId: 'kitchen',
      grade: 'ADVANCED',
      slot: 2,
      copies: 1,
      pieces: [0, 0, 1, 0],
      count: 1,
      completed: false,
    })
    vi.mocked(GameContextModule.useGame).mockReturnValue({
      duplicates: { COMMON: 12, ADVANCED: 3 },
      combine,
    } as unknown as ReturnType<typeof GameContextModule.useGame>)
    render(<PieceCombine />)
    const [common, advanced, rare] = screen.getAllByRole('button', { name: '조합' })
    expect(advanced).toBeDisabled()
    expect(rare).toBeDisabled()
    fireEvent.click(common)
    expect(combine).toHaveBeenCalledWith('COMMON')
    await waitFor(() => expect(screen.getByText('고급 조각을 만들었어요!')).toBeInTheDocument())
    expect(screen.getByText(/주방에 들어갔어요/)).toBeInTheDocument()
  })
})
