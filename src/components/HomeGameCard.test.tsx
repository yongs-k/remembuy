import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HomeGameCard } from './HomeGameCard'
import * as GameContextModule from '../state/GameContext'
import type { DexEntry, GameState } from '../lib/gameApi'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})
vi.mock('../state/GameContext')

const STATE: GameState = { points: 1250, spaces: [], titles: [], benefits: [] }
const DEX: DexEntry[] = [
  { id: 'a', name: 'A', grade: 'COMMON', fragmentsRequired: 10, status: 'COMPLETE', fragmentCount: 10 },
  { id: 'b', name: 'B', grade: 'COMMON', fragmentsRequired: 10, status: 'LOCKED', fragmentCount: 0 },
]

function mockGame(state: GameState | null, dex: DexEntry[]) {
  vi.mocked(GameContextModule.useGame).mockReturnValue({
    state,
    boxes: [],
    dex,
    refresh: vi.fn(),
    claim: vi.fn(),
    openBox: vi.fn(),
  })
}

describe('HomeGameCard', () => {
  beforeEach(() => {
    navigateMock.mockClear()
  })

  it('shows the points balance and the completed/total dex count', () => {
    mockGame(STATE, DEX)
    render(<HomeGameCard />)
    expect(screen.getByText('1250P')).toBeInTheDocument()
    expect(screen.getByText('1/2 완성')).toBeInTheDocument()
  })

  it('shows a placeholder line while the dex has not loaded', () => {
    mockGame(STATE, [])
    render(<HomeGameCard />)
    expect(screen.getByText('도감을 채워보세요')).toBeInTheDocument()
  })

  it('navigates to /store and /dex from its two buttons', () => {
    mockGame(STATE, DEX)
    render(<HomeGameCard />)
    fireEvent.click(screen.getByText('상자 열기'))
    expect(navigateMock).toHaveBeenCalledWith('/store')
    fireEvent.click(screen.getByText('도감 보기'))
    expect(navigateMock).toHaveBeenCalledWith('/dex')
  })
})
