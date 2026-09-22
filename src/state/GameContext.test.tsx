import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { LockerProvider } from './LockerContext'
import { GameProvider, useGame } from './GameContext'
import * as api from '../lib/gameApi'

vi.mock('../lib/gameApi')

const emptyState: api.GameState = { points: 0, spaces: [], titles: [], benefits: [] }
const claimResult = (points: number): api.ClaimResult => ({
  newSlots: [],
  ignored: [],
  pointsAwarded: 0,
  history: [],
  state: { ...emptyState, points },
})

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <LockerProvider>
      <GameProvider>{children}</GameProvider>
    </LockerProvider>
  )
}

describe('GameContext', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.resetAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('claims the existing items master ids once on mount', async () => {
    vi.mocked(api.claimSlots).mockResolvedValue(claimResult(7))
    const { result } = renderHook(() => useGame(), { wrapper })
    await waitFor(() => expect(result.current.state?.points).toBe(7))
    expect(api.claimSlots).toHaveBeenCalledTimes(1)
    const ids = vi.mocked(api.claimSlots).mock.calls[0][0]
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('claim() forwards the ids and stores the returned state', async () => {
    vi.mocked(api.claimSlots).mockResolvedValue(claimResult(1))
    const { result } = renderHook(() => useGame(), { wrapper })
    await waitFor(() => expect(result.current.state?.points).toBe(1))
    vi.mocked(api.claimSlots).mockResolvedValue(claimResult(9))
    await act(async () => {
      await result.current.claim(['x-slot'])
    })
    expect(api.claimSlots).toHaveBeenLastCalledWith(['x-slot'])
    expect(result.current.state?.points).toBe(9)
  })

  it('swallows API failures', async () => {
    vi.mocked(api.claimSlots).mockRejectedValue(new Error('offline'))
    vi.mocked(api.fetchGameState).mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useGame(), { wrapper })
    await waitFor(() => expect(api.claimSlots).toHaveBeenCalled())
    await act(async () => {
      await result.current.claim(['x-slot'])
      await result.current.refresh()
    })
    expect(result.current.state).toBeNull()
  })
})
