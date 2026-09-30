import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import StorePage from './StorePage'
import * as GameContextModule from '../state/GameContext'
import type { Box, GameState, OpenBoxResult } from '../lib/gameApi'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})
vi.mock('../state/GameContext')

const BOX: Box = { id: 'box-starter', name: '시작 상자', costPoints: 500 }
const STATE: GameState = { points: 700, spaces: [], titles: [], benefits: [] }

function mockGame(overrides: {
  boxes?: Box[]
  state?: GameState | null
  openBox?: ReturnType<typeof vi.fn>
} = {}) {
  vi.mocked(GameContextModule.useGame).mockReturnValue({
    state: overrides.state ?? STATE,
    boxes: overrides.boxes ?? [BOX],
    dex: [],
    catalogError: false,
    refresh: vi.fn(),
    claim: vi.fn(),
    openBox: overrides.openBox ?? vi.fn(),
  })
}

describe('StorePage', () => {
  beforeEach(() => {
    navigateMock.mockClear()
  })

  it('shows a loading line while boxes have not loaded', () => {
    mockGame({ boxes: [] })
    render(<StorePage />)
    expect(screen.getByText('상자 정보를 불러오는 중...')).toBeInTheDocument()
  })

  it('disables the open button and shows a hint when points are below cost', () => {
    mockGame({ state: { ...STATE, points: 100 } })
    render(<StorePage />)
    expect(screen.getByRole('button', { name: '1개 열기' })).toBeDisabled()
    expect(screen.getByText('포인트가 부족해요')).toBeInTheDocument()
  })

  it('opens the box and shows the result modal on success', async () => {
    const opened: OpenBoxResult = {
      result: { type: 'FRAGMENT', itemId: 'item-x', itemName: 'X', grade: 'COMMON' },
      pointsSpent: 500,
      pointsBalance: 200,
      dexEntry: { id: 'item-x', name: 'X', grade: 'COMMON', fragmentsRequired: 10, status: 'COLLECTING', fragmentCount: 1 },
    }
    mockGame({ openBox: vi.fn().mockResolvedValue(opened) })
    render(<StorePage />)
    fireEvent.click(screen.getByRole('button', { name: '1개 열기' }))
    await waitFor(() => expect(screen.getByText('조각을 획득했어요!')).toBeInTheDocument())
  })

  it('shows an inline failure message when the open call resolves undefined', async () => {
    mockGame({ openBox: vi.fn().mockResolvedValue(undefined) })
    render(<StorePage />)
    fireEvent.click(screen.getByRole('button', { name: '1개 열기' }))
    await waitFor(() =>
      expect(screen.getByText('상자를 열지 못했어요, 다시 시도해주세요')).toBeInTheDocument()
    )
  })
})
