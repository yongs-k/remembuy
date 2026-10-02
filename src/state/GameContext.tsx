import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocker } from './LockerContext'
import {
  claimSlots as claimSlotsApi,
  fetchGameState,
  fetchBoxes,
  fetchDex,
  fetchAttendance,
  claimAttendance as claimAttendanceApi,
  fetchQuests,
  claimQuest as claimQuestApi,
  openBox as openBoxApi,
  openBoxes as openBoxesApi,
  combinePieces as combinePiecesApi,
  type GameState,
  type Box,
  type DexEntry,
  type OpenBoxResult,
  type Attendance,
  type Quest,
  type RoomStage,
  type Duplicates,
  type PieceResult,
} from '../lib/gameApi'

type GameContextValue = {
  state: GameState | null
  boxes: Box[]
  dex: DexEntry[]
  /** Each 장소's grade stage; empty until loaded. */
  rooms: RoomStage[]
  /** Spare pieces per grade (조합 currency). */
  duplicates: Duplicates
  /** 조합: ten spares of a grade into one piece of the next; undefined if it failed. */
  combine: (grade: string) => Promise<PieceResult | undefined>
  catalogError: boolean
  refresh: () => Promise<void>
  claim: (slotIds: string[]) => Promise<number>
  openBox: (boxId: string) => Promise<OpenBoxResult | undefined>
  /** Opens several boxes at once; undefined if the call failed (then none were opened). */
  openBoxes: (boxId: string, count: number) => Promise<OpenBoxResult[] | undefined>
  /** Today's 출석 state; null until loaded or when the game server is unreachable. */
  attendance: Attendance | null
  /** Opens today's free box; undefined if already claimed or the call failed. */
  claimAttendance: () => Promise<OpenBoxResult | undefined>
  /** 퀘스트 from the server; empty until loaded or when the server is unreachable. */
  quests: Quest[]
  /** Claims a completed quest's points; returns the points awarded, or 0 if it failed. */
  claimQuest: (questId: string) => Promise<number>
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const { items, syncedAt } = useLocker()
  const [state, setState] = useState<GameState | null>(null)
  const [boxes, setBoxes] = useState<Box[]>([])
  const [dex, setDex] = useState<DexEntry[]>([])
  const [rooms, setRooms] = useState<RoomStage[]>([])
  const [duplicates, setDuplicates] = useState<Duplicates>({})
  const [attendance, setAttendance] = useState<Attendance | null>(null)
  const [quests, setQuests] = useState<Quest[]>([])
  const [catalogError, setCatalogError] = useState(false)
  const reconciled = useRef(false)

  const loadCatalogState = useCallback(async () => {
    try {
      const [boxList, dexList] = await Promise.all([fetchBoxes(), fetchDex()])
      setBoxes(boxList.boxes)
      setDex(dexList.items)
      setRooms(dexList.rooms ?? [])
      setDuplicates(dexList.duplicates ?? {})
      // Attendance is a nice-to-have; its failure must not mark the whole catalog broken.
      fetchAttendance().then(setAttendance, (error) => console.warn('attendance unavailable', error))
      loadQuests()
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

  // A stage can roll over to the next grade: take the server's word rather than guess.
  const reloadRooms = useCallback(() => {
    fetchDex().then(
      (data) => {
        setRooms(data.rooms ?? [])
        setDuplicates(data.duplicates ?? {})
      },
      (error) => console.warn('rooms unavailable', error)
    )
  }, [])

  const openBox = useCallback(async (boxId: string) => {
    try {
      const result = await openBoxApi(boxId)
      setState((prev) => (prev ? { ...prev, points: result.pointsBalance } : prev))
      setDex((prev) => prev.map((entry) => (entry.id === result.dexEntry.id ? result.dexEntry : entry)))
      reloadRooms()
      return result
    } catch (error) {
      console.warn('open box failed', error)
      return undefined
    }
  }, [reloadRooms])

  const openBoxes = useCallback(
    async (boxId: string, count: number) => {
      try {
        const { results, pointsBalance } = await openBoxesApi(boxId, count)
        setState((prev) => (prev ? { ...prev, points: pointsBalance } : prev))
        // The last result for an item carries its latest count.
        const latest = new Map(results.map((r) => [r.dexEntry.id, r.dexEntry]))
        setDex((prev) => prev.map((entry) => latest.get(entry.id) ?? entry))
        reloadRooms()
        return results
      } catch (error) {
        console.warn('open boxes failed', error)
        return undefined
      }
    },
    [reloadRooms]
  )

  const combine = useCallback(
    async (grade: string) => {
      try {
        const { piece, duplicates: left } = await combinePiecesApi(grade)
        setDuplicates(left)
        reloadRooms()
        return piece
      } catch (error) {
        console.warn('combine failed', error)
        return undefined
      }
    },
    [reloadRooms]
  )

  const loadQuests = useCallback(() => {
    fetchQuests().then(
      (data) => setQuests(data.quests),
      (error) => console.warn('quests unavailable', error)
    )
  }, [])

  // Quest progress is computed from the server's copy of the records: refetch
  // once each record save lands there.
  useEffect(() => {
    if (syncedAt !== null) loadQuests()
  }, [syncedAt, loadQuests])

  const claimQuest = useCallback(async (questId: string) => {
    try {
      const result = await claimQuestApi(questId)
      setQuests(result.quests)
      setState(await fetchGameState())
      return result.pointsAwarded
    } catch (error) {
      console.warn('quest claim failed', error)
      loadQuests()
      return 0
    }
  }, [loadQuests])

  const claimAttendance = useCallback(async () => {
    try {
      const result = await claimAttendanceApi()
      setAttendance((prev) => (prev ? { ...prev, claimedToday: true } : prev))
      loadQuests()
      setDex((prev) => prev.map((entry) => (entry.id === result.dexEntry.id ? result.dexEntry : entry)))
      reloadRooms()
      return result
    } catch (error) {
      console.warn('attendance claim failed', error)
      // 409 = already claimed elsewhere (another tab or device): resync the flag.
      fetchAttendance().then(setAttendance, () => {})
      return undefined
    }
  }, [loadQuests, reloadRooms])

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
    <GameContext.Provider value={{ state, boxes, dex, rooms, duplicates, combine, catalogError, refresh, claim, openBox, openBoxes, attendance, claimAttendance, quests, claimQuest }}>{children}</GameContext.Provider>
  )
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within a GameProvider')
  return ctx
}
