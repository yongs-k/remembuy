import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocker } from './LockerContext'
import {
  claimSlots as claimSlotsApi,
  fetchGameState,
  fetchBoxes,
  fetchDex,
  fetchAttendance,
  claimAttendance as claimAttendanceApi,
  openBox as openBoxApi,
  type GameState,
  type Box,
  type DexEntry,
  type OpenBoxResult,
  type Attendance,
} from '../lib/gameApi'

type GameContextValue = {
  state: GameState | null
  boxes: Box[]
  dex: DexEntry[]
  catalogError: boolean
  refresh: () => Promise<void>
  claim: (slotIds: string[]) => Promise<number>
  openBox: (boxId: string) => Promise<OpenBoxResult | undefined>
  /** Today's 출석 state; null until loaded or when the game server is unreachable. */
  attendance: Attendance | null
  /** Opens today's free box; undefined if already claimed or the call failed. */
  claimAttendance: () => Promise<OpenBoxResult | undefined>
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const { items } = useLocker()
  const [state, setState] = useState<GameState | null>(null)
  const [boxes, setBoxes] = useState<Box[]>([])
  const [dex, setDex] = useState<DexEntry[]>([])
  const [attendance, setAttendance] = useState<Attendance | null>(null)
  const [catalogError, setCatalogError] = useState(false)
  const reconciled = useRef(false)

  const loadCatalogState = useCallback(async () => {
    try {
      const [boxList, dexList] = await Promise.all([fetchBoxes(), fetchDex()])
      setBoxes(boxList.boxes)
      setDex(dexList.items)
      // Attendance is a nice-to-have; its failure must not mark the whole catalog broken.
      fetchAttendance().then(setAttendance, (error) => console.warn('attendance unavailable', error))
      setCatalogError(false)
    } catch (error) {
      console.warn('game catalog unavailable', error)
      setCatalogError(true)
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
        return 0
      }
      let pointsAwarded = 0
      try {
        const result = await claimSlotsApi(slotIds)
        setState(result.state)
        pointsAwarded = result.pointsAwarded
      } catch (error) {
        console.warn('game claim failed', error)
      }
      await loadCatalogState()
      return pointsAwarded
    },
    [refresh, loadCatalogState]
  )

  const openBox = useCallback(async (boxId: string) => {
    try {
      const result = await openBoxApi(boxId)
      setState((prev) => (prev ? { ...prev, points: result.pointsBalance } : prev))
      setDex((prev) => prev.map((entry) => (entry.id === result.dexEntry.id ? result.dexEntry : entry)))
      return result
    } catch (error) {
      console.warn('open box failed', error)
      return undefined
    }
  }, [])

  const claimAttendance = useCallback(async () => {
    try {
      const result = await claimAttendanceApi()
      setAttendance((prev) => (prev ? { ...prev, claimedToday: true } : prev))
      setDex((prev) => prev.map((entry) => (entry.id === result.dexEntry.id ? result.dexEntry : entry)))
      return result
    } catch (error) {
      console.warn('attendance claim failed', error)
      // 409 = already claimed elsewhere (another tab or device): resync the flag.
      fetchAttendance().then(setAttendance, () => {})
      return undefined
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
    <GameContext.Provider value={{ state, boxes, dex, catalogError, refresh, claim, openBox, attendance, claimAttendance }}>{children}</GameContext.Provider>
  )
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within a GameProvider')
  return ctx
}
