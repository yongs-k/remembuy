import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocker } from './LockerContext'
import {
  claimSlots as claimSlotsApi,
  fetchGameState,
  fetchBoxes,
  fetchDex,
  openBox as openBoxApi,
  type GameState,
  type Box,
  type DexEntry,
} from '../lib/gameApi'

type GameContextValue = {
  state: GameState | null
  boxes: Box[]
  dex: DexEntry[]
  refresh: () => Promise<void>
  claim: (slotIds: string[]) => Promise<void>
  openBox: (boxId: string) => Promise<void>
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const { items } = useLocker()
  const [state, setState] = useState<GameState | null>(null)
  const [boxes, setBoxes] = useState<Box[]>([])
  const [dex, setDex] = useState<DexEntry[]>([])
  const reconciled = useRef(false)

  const loadCatalogState = useCallback(async () => {
    try {
      const [boxList, dexList] = await Promise.all([fetchBoxes(), fetchDex()])
      setBoxes(boxList.boxes)
      setDex(dexList.items)
    } catch (error) {
      console.warn('game catalog unavailable', error)
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      setState(await fetchGameState())
    } catch (error) {
      console.warn('game state unavailable', error)
    }
    await loadCatalogState()
  }, [loadCatalogState])

  const claim = useCallback(
    async (slotIds: string[]) => {
      if (slotIds.length === 0) {
        await refresh()
        return
      }
      try {
        const result = await claimSlotsApi(slotIds)
        setState(result.state)
      } catch (error) {
        console.warn('game claim failed', error)
      }
      await loadCatalogState()
    },
    [refresh, loadCatalogState]
  )

  const openBox = useCallback(async (boxId: string) => {
    try {
      const result = await openBoxApi(boxId)
      setState((prev) => (prev ? { ...prev, points: result.pointsBalance } : prev))
      setDex((prev) => prev.map((entry) => (entry.id === result.dexEntry.id ? result.dexEntry : entry)))
    } catch (error) {
      console.warn('open box failed', error)
    }
  }, [])

  useEffect(() => {
    if (reconciled.current) return
    reconciled.current = true
    const ids = [
      ...new Set(
        items
          .filter((item) => !item.id.startsWith('seed-'))
          .map((item) => item.masterItemId)
          .filter((id): id is string => Boolean(id))
      ),
    ]
    void claim(ids)
    // reconcile once per app session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <GameContext.Provider value={{ state, boxes, dex, refresh, claim, openBox }}>{children}</GameContext.Provider>
  )
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within a GameProvider')
  return ctx
}
