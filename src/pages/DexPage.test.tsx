import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DexPage from './DexPage'
import * as GameContextModule from '../state/GameContext'
import type { DexEntry } from '../lib/gameApi'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})
vi.mock('../state/GameContext')

const ENTRIES: DexEntry[] = [
  { id: 'legendary-1', name: '전설템', grade: 'LEGENDARY', fragmentsRequired: 30, roomType: null, status: 'LOCKED', fragmentCount: 0 },
  { id: 'common-1', name: '기본템', grade: 'COMMON', fragmentsRequired: 10, roomType: null, status: 'COLLECTING', fragmentCount: 3 },
  { id: 'rare-1', name: '레어템', grade: 'RARE', fragmentsRequired: 20, roomType: null, status: 'COMPLETE', fragmentCount: 20 },
]

const refreshMock = vi.fn()

function mockGame(dex: DexEntry[], catalogError = false) {
  vi.mocked(GameContextModule.useGame).mockReturnValue({
    state: null,
    boxes: [],
    dex,
    catalogError,
    attendance: null,
    claimAttendance: vi.fn(),
    quests: [],
    claimQuest: vi.fn(),
    refresh: refreshMock,
    claim: vi.fn(),
    openBox: vi.fn(),
  })
}

describe('DexPage', () => {
  it('shows a loading line when the dex has not loaded yet', () => {
    mockGame([])
    render(<DexPage />)
    expect(screen.getByText('수집함 정보를 불러오는 중...')).toBeInTheDocument()
  })

  it('shows an error with a retry instead of loading forever when the catalog fails', () => {
    mockGame([], true)
    render(<DexPage />)
    expect(screen.queryByText('수집함 정보를 불러오는 중...')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(refreshMock).toHaveBeenCalled()
  })

  it('groups entries under fixed COMMON/ADVANCED/RARE/LEGENDARY headers regardless of input order, skipping empty grades', () => {
    mockGame(ENTRIES)
    render(<DexPage />)
    const headers = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headers).toEqual(['일반', '레어', '전설'])
  })

  it('opens a detail sheet for a non-locked entry and closes it on 닫기', () => {
    mockGame(ENTRIES)
    render(<DexPage />)
    fireEvent.click(screen.getByText('레어템'))
    expect(screen.getByText('20 / 20 조각')).toBeInTheDocument()
    fireEvent.click(screen.getByText('닫기'))
    expect(screen.queryByText('20 / 20 조각')).not.toBeInTheDocument()
  })

  it('a locked entry has no detail sheet to open', () => {
    mockGame(ENTRIES)
    render(<DexPage />)
    fireEvent.click(screen.getByText('???'))
    expect(screen.queryByText('0 / 30 조각')).not.toBeInTheDocument()
  })
})
