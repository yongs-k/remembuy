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
    vi.mocked(api.fetchBoxes).mockResolvedValue({ boxes: [] })
    vi.mocked(api.fetchDex).mockResolvedValue({ items: [] })
  })

  it('excludes seed- prefixed items but claims real ones', async () => {
    // LockerContext's default state is 100% seed- items, so seed localStorage directly
    // with a mix (one seed item, one real item) to exercise the filter meaningfully.
    window.localStorage.setItem(
      'remembuy:state',
      JSON.stringify({
        items: [
          { id: 'seed-1', name: 'S', locationId: 'bathroom', categoryId: 'bathroom-haircare', masterItemId: 'bathroom-haircare-shampoo', createdAt: '2026-01-01' },
          { id: 'item-1', name: 'R', locationId: 'bathroom', categoryId: 'bathroom-haircare', masterItemId: 'bathroom-haircare-rinse', createdAt: '2026-01-01' },
        ],
        locations: [],
        categories: [],
      })
    )
    vi.mocked(api.claimSlots).mockResolvedValue(claimResult(7))
    const { result } = renderHook(() => useGame(), { wrapper })
    await waitFor(() => expect(result.current.state?.points).toBe(7))
    expect(api.claimSlots).toHaveBeenCalledWith(['bathroom-haircare-rinse'])
  })

  it('a fresh app (only seed- items) reconciles to an empty claim and falls back to refresh', async () => {
    // LockerProvider's default state is SEED_ITEMS (src/data/seedItems.ts), whose ids all
    // start with 'seed-'. After the fix, the reconciliation effect filters them all out,
    // calls claim([]), and claim([]) must call refresh() instead of doing nothing.
    vi.mocked(api.fetchGameState).mockResolvedValue({ ...emptyState, points: 9 })
    const { result } = renderHook(() => useGame(), { wrapper })
    await waitFor(() => expect(result.current.state?.points).toBe(9))
    expect(api.claimSlots).not.toHaveBeenCalled()
    expect(api.fetchGameState).toHaveBeenCalledTimes(1)
  })

  it('openBox updates points and the touched dex entry', async () => {
    vi.mocked(api.claimSlots).mockResolvedValue(claimResult(0))
    vi.mocked(api.fetchGameState).mockResolvedValue({ ...emptyState, points: 1000 })
    vi.mocked(api.fetchDex).mockResolvedValue({
      items: [{ id: 'item-x', name: 'X', grade: 'COMMON', fragmentsRequired: 10, status: 'LOCKED', fragmentCount: 0 }],
    })
    const { result } = renderHook(() => useGame(), { wrapper })
    await waitFor(() => expect(result.current.dex.length).toBe(1))
    vi.mocked(api.openBox).mockResolvedValue({
      result: { type: 'FRAGMENT', itemId: 'item-x', itemName: 'X', grade: 'COMMON' },
      pointsSpent: 500,
      pointsBalance: 1500,
      dexEntry: { id: 'item-x', name: 'X', grade: 'COMMON', fragmentsRequired: 10, status: 'COLLECTING', fragmentCount: 1 },
    })
    await act(async () => {
      await result.current.openBox('box-starter')
    })
    expect(result.current.state?.points).toBe(1500)
    expect(result.current.dex[0].status).toBe('COLLECTING')
    expect(result.current.dex[0].fragmentCount).toBe(1)
  })

  it('swallows API failures', async () => {
    vi.mocked(api.claimSlots).mockRejectedValue(new Error('offline'))
    vi.mocked(api.fetchGameState).mockRejectedValue(new Error('offline'))
    vi.mocked(api.openBox).mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useGame(), { wrapper })
    // default locker state is all seed- items, so mount's reconciliation calls claim([]),
    // which falls back to refresh() (fetchGameState) rather than claimSlots
    await waitFor(() => expect(api.fetchGameState).toHaveBeenCalled())
    await act(async () => {
      await result.current.claim(['x-slot'])
      await result.current.refresh()
      await result.current.openBox('box-starter')
    })
    expect(result.current.state).toBeNull()
  })
})
