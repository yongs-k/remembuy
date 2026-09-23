import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DexPage from './DexPage'
import * as GameContextModule from '../state/GameContext'
import type { DexEntry } from '../lib/gameApi'

vi.mock('../state/GameContext')

const ENTRIES: DexEntry[] = [
  { id: 'legendary-1', name: '전설템', grade: 'LEGENDARY', fragmentsRequired: 30, status: 'LOCKED', fragmentCount: 0 },
  { id: 'common-1', name: '기본템', grade: 'COMMON', fragmentsRequired: 10, status: 'COLLECTING', fragmentCount: 3 },
  { id: 'rare-1', name: '레어템', grade: 'RARE', fragmentsRequired: 20, status: 'COMPLETE', fragmentCount: 20 },
]

function mockGame(dex: DexEntry[]) {
  vi.mocked(GameContextModule.useGame).mockReturnValue({
    state: null,
    boxes: [],
    dex,
    refresh: vi.fn(),
    claim: vi.fn(),
    openBox: vi.fn(),
  })
}

describe('DexPage', () => {
  it('shows a loading line when the dex has not loaded yet', () => {
    mockGame([])
    render(<DexPage />)
    expect(screen.getByText('도감 정보를 불러오는 중...')).toBeInTheDocument()
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
