import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocker } from './LockerContext'
import { claimSlots as claimSlotsApi, fetchGameState, type GameState } from '../lib/gameApi'

type GameContextValue = {
  state: GameState | null
  refresh: () => Promise<void>
  claim: (slotIds: string[]) => Promise<void>
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const { items } = useLocker()
  const [state, setState] = useState<GameState | null>(null)
  const reconciled = useRef(false)

  const refresh = useCallback(async () => {
    try {
      setState(await fetchGameState())
    } catch (error) {
      console.warn('game state unavailable', error)
    }
  }, [])

  const claim = useCallback(async (slotIds: string[]) => {
    if (slotIds.length === 0) return
    try {
      const result = await claimSlotsApi(slotIds)
      setState(result.state)
    } catch (error) {
      console.warn('game claim failed', error)
    }
  }, [])

  useEffect(() => {
    if (reconciled.current) return
    reconciled.current = true
    const ids = [
      ...new Set(items.map((item) => item.masterItemId).filter((id): id is string => Boolean(id))),
    ]
    void (ids.length > 0 ? claim(ids) : refresh())
    // reconcile once per app session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <GameContext.Provider value={{ state, refresh, claim }}>{children}</GameContext.Provider>
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within a GameProvider')
  return ctx
}
