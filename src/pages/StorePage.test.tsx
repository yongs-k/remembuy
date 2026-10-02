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
  openBoxes?: ReturnType<typeof vi.fn>
} = {}) {
  vi.mocked(GameContextModule.useGame).mockReturnValue({
    state: overrides.state ?? STATE,
    boxes: overrides.boxes ?? [BOX],
    dex: [],
    rooms: [],
    stacks: [],
    achieve: vi.fn(),
    combine: vi.fn(),
    catalogError: false,
    attendance: null,
    claimAttendance: vi.fn(),
    quests: [],
    claimQuest: vi.fn(),
    refresh: vi.fn(),
    claim: vi.fn(),
    openBox: overrides.openBox ?? vi.fn(),
    openBoxes: overrides.openBoxes ?? vi.fn(),
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

  it('says how many points are missing and points to the collection instead of a dead button', () => {
    mockGame({ state: { ...STATE, points: 100 } })
    render(<StorePage />)
    expect(screen.queryByRole('button', { name: /상자 열기/ })).not.toBeInTheDocument()
    expect(screen.getByText('400P 더 모으면 열 수 있어요')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '퀘스트 보기' }))
    expect(navigateMock).toHaveBeenCalledWith('/quests')
  })

  it('opens the box and shows the result modal on success', async () => {
    const opened: OpenBoxResult = {
      result: { type: 'FRAGMENT', itemId: 'item-x', itemName: 'X', grade: 'COMMON' },
      pointsSpent: 500,
      pointsBalance: 200,
      dexEntry: { id: 'item-x', name: 'X', grade: 'COMMON', fragmentsRequired: 10, roomType: null, status: 'COLLECTING', fragmentCount: 1 },
    }
    mockGame({ openBox: vi.fn().mockResolvedValue(opened) })
    render(<StorePage />)
    fireEvent.click(screen.getByRole('button', { name: /상자 열기/ }))
    await waitFor(() => expect(screen.getByText('조각을 획득했어요!')).toBeInTheDocument())
  })

  it('opens ten at once when the points cover it, and shows every result', async () => {
    const one: OpenBoxResult = {
      result: { type: 'FRAGMENT', itemId: 'item-x', itemName: 'X', grade: 'COMMON' },
      room: { spaceId: 'bathroom', grade: 'COMMON', slot: 0, source: 'stage', count: 1, ready: false },
      pointsSpent: 500,
      pointsBalance: 0,
      dexEntry: { id: 'item-x', name: 'X', grade: 'COMMON', fragmentsRequired: 10, roomType: 'bathroom', status: 'COLLECTING', fragmentCount: 1 },
    }
    const openBoxes = vi.fn().mockResolvedValue(Array.from({ length: 10 }, () => one))
    mockGame({ state: { ...STATE, points: 5000 }, openBoxes })
    render(<StorePage />)
    fireEvent.click(screen.getByRole('button', { name: /10개 한번에 열기/ }))
    await waitFor(() => expect(screen.getByText('상자 10개를 열었어요!')).toBeInTheDocument())
    expect(openBoxes).toHaveBeenCalledWith('box-starter', 10)
    expect(screen.getByRole('button', { name: '포인트 부족' })).toBeDisabled()
  })

  it('keeps 10개 한번에 열기 off until the points cover ten', () => {
    mockGame({ state: { ...STATE, points: 4999 } })
    render(<StorePage />)
    expect(screen.getByRole('button', { name: /10개 한번에 열기/ })).toBeDisabled()
  })

  it('shows an inline failure message when the open call resolves undefined', async () => {
    mockGame({ openBox: vi.fn().mockResolvedValue(undefined) })
    render(<StorePage />)
    fireEvent.click(screen.getByRole('button', { name: /상자 열기/ }))
    await waitFor(() =>
      expect(screen.getByText('상자를 열지 못했어요. 다시 시도해 주세요.')).toBeInTheDocument()
    )
  })
})
