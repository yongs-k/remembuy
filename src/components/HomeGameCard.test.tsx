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

const refreshMock = vi.fn()

function mockGame(state: GameState | null, dex: DexEntry[], catalogError = false) {
  vi.mocked(GameContextModule.useGame).mockReturnValue({
    state,
    boxes: [],
    dex,
    catalogError,
    refresh: refreshMock,
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
    expect(screen.getByText('상자를 열어 아이템을 모아보세요')).toBeInTheDocument()
  })

  it('explains how to earn points while the balance is zero', () => {
    mockGame({ ...STATE, points: 0 }, DEX)
    render(<HomeGameCard />)
    expect(screen.getByText('도감 수집률을 올리면 포인트가 쌓여요')).toBeInTheDocument()
  })

  it('says the game is unavailable instead of showing 0P when the catalog fails', () => {
    mockGame(null, [], true)
    render(<HomeGameCard />)
    expect(screen.queryByText('0P')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('게임 정보를 불러오지 못했어요')
    fireEvent.click(screen.getByText('다시 시도'))
    expect(refreshMock).toHaveBeenCalled()
  })

  it('navigates to /store and /dex from its two buttons', () => {
    mockGame(STATE, DEX)
    render(<HomeGameCard />)
    fireEvent.click(screen.getByText('상자 열기'))
    expect(navigateMock).toHaveBeenCalledWith('/store')
    fireEvent.click(screen.getByText('수집함 보기'))
    expect(navigateMock).toHaveBeenCalledWith('/dex')
  })
})
