import { createContext, useContext, useReducer, useEffect, useRef, useState, type ReactNode } from 'react'
import { fetchRemoteLocker, pushRemoteLocker, type LockerSnapshot } from '../lib/lockerSync'
import { getDeviceId } from '../lib/deviceId'
import type { Item, Location, Category } from '../types'
import { SEED_ITEMS, withFreshSeedDates } from '../data/seedItems'
import { LOCATIONS as SEED_LOCATIONS, CATEGORIES as SEED_CATEGORIES } from '../data/locations'
import { useLocalStorage } from '../hooks/useLocalStorage'

type State = { items: Item[]; locations: Location[]; categories: Category[] }

type Action =
  | { type: 'ADD_ITEM'; item: Item }
  | { type: 'UPDATE_ITEM'; id: string; patch: Partial<Item> }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'ADD_LOCATION'; location: Location }
  | { type: 'RENAME_LOCATION'; id: string; name: string }
  | { type: 'REMOVE_LOCATION'; id: string }
  | { type: 'ADD_CATEGORY'; category: Category }
  | { type: 'RENAME_CATEGORY'; id: string; name: string }
  | { type: 'REMOVE_CATEGORY'; id: string }
  | { type: 'SET_PODIUM_RANK'; itemId: string; categoryId: string; rank: 1 | 2 | 3 | null }
  | { type: 'REPLACE_STATE'; state: State }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'REPLACE_STATE':
      return action.state
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.item] }
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)),
      }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) }
    case 'ADD_LOCATION':
      return { ...state, locations: [...state.locations, action.location] }
    case 'RENAME_LOCATION':
      return {
        ...state,
        locations: state.locations.map((l) =>
          l.id === action.id ? { ...l, name: action.name } : l
        ),
      }
    case 'REMOVE_LOCATION':
      return {
        ...state,
        locations: state.locations.filter((l) => l.id !== action.id),
        categories: state.categories.filter((c) => c.locationId !== action.id),
        items: state.items.filter((i) => i.locationId !== action.id),
      }
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.category] }
    case 'RENAME_CATEGORY':
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.id ? { ...c, name: action.name } : c
        ),
      }
    case 'REMOVE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.id),
        items: state.items.filter((i) => i.categoryId !== action.id),
      }
    case 'SET_PODIUM_RANK':
      return {
        ...state,
        items: state.items.map((i) => {
          if (i.categoryId !== action.categoryId) return i
          if (i.id === action.itemId) {
            return { ...i, podiumRank: action.rank ?? undefined }
          }
          if (action.rank !== null && i.podiumRank === action.rank) {
            return { ...i, podiumRank: undefined }
          }
          return i
        }),
      }
    default:
      return state
  }
}

type LastPurchase = {
  id: string
  name: string
  date: string
  prev: Pick<Item, 'purchaseHistory' | 'restockedAt'>
}

type LockerContextValue = {
  items: Item[]
  locations: Location[]
  categories: Category[]
  addItem: (item: Item) => void
  updateItem: (id: string, patch: Partial<Item>) => void
  /** A confirmed repurchase today: restarts the countdown and feeds the observed cycle. */
  recordPurchase: (id: string) => void
  /** The most recent recordPurchase, kept so a mistaken tap can be undone. */
  lastPurchase: LastPurchase | null
  /** Time of the last successful server save of the records; null until one happens. */
  syncedAt: number | null
  undoLastPurchase: () => void
  dismissLastPurchase: () => void
  /** Price/store for one recorded purchase; also becomes the item's latest price/place. */
  recordPurchaseDetails: (id: string, date: string, details: { price?: number; place?: string }) => void
  removeItem: (id: string) => void
  addLocation: (name: string) => Location
  renameLocation: (id: string, name: string) => void
  removeLocation: (id: string) => void
  addCategory: (locationId: string, name: string) => Category
  renameCategory: (id: string, name: string) => void
  removeCategory: (id: string) => void
  setPodiumRank: (itemId: string, categoryId: string, rank: 1 | 2 | 3 | null) => void
}

const LockerContext = createContext<LockerContextValue | null>(null)

// Bump the version to re-anchor seed item dates once more in existing browsers.
const SEED_DATES_KEY = 'remembuy:seedDatesVersion'
const SEED_DATES_VERSION = '2026-10-01'
const STATE_UPDATED_KEY = 'remembuy:stateUpdatedAt'

const INITIAL_STATE: State = {
  items: SEED_ITEMS,
  locations: SEED_LOCATIONS,
  categories: SEED_CATEGORIES,
}

export function LockerProvider({ children }: { children: ReactNode }) {
  const [persisted, setPersisted] = useLocalStorage<State>('remembuy:state', INITIAL_STATE)
  const [seedDatesVersion, setSeedDatesVersion] = useLocalStorage<string | null>(SEED_DATES_KEY, null)
  const [state, dispatch] = useReducer(reducer, persisted, (saved) =>
    seedDatesVersion === SEED_DATES_VERSION ? saved : { ...saved, items: withFreshSeedDates(saved.items) }
  )

  // Server copy keyed by device id: pulled once on start (newer copy wins),
  // then every change is pushed a second later. Offline, the app runs on the
  // local copy alone and pushes again on the next change.
  const [localUpdatedAt, setLocalUpdatedAt] = useLocalStorage<string | null>(STATE_UPDATED_KEY, null)
  const [lastPurchase, setLastPurchase] = useState<LastPurchase | null>(null)
  // Bumped after each successful server save, so server-computed views (quests) can refetch.
  const [syncedAt, setSyncedAt] = useState<number | null>(null)
  const syncReady = useRef(false)
  const skipNextPush = useRef(false)
  const pendingPush = useRef<{ snapshot: LockerSnapshot<State>; deviceId: string } | null>(null)
  const pushTimer = useRef<ReturnType<typeof setTimeout>>()

  function flushPush() {
    clearTimeout(pushTimer.current)
    const pending = pendingPush.current
    if (!pending) return
    pendingPush.current = null
    pushRemoteLocker(pending.snapshot, pending.deviceId)
      .then(() => setSyncedAt(Date.now()))
      .catch((error) => console.warn('locker sync failed', error))
  }

  useEffect(() => {
    let cancelled = false
    fetchRemoteLocker<State>()
      .then((remote) => {
        if (cancelled) return
        if (remote && (!localUpdatedAt || remote.updatedAt > localUpdatedAt)) {
          skipNextPush.current = true
          setLocalUpdatedAt(remote.updatedAt)
          dispatch({ type: 'REPLACE_STATE', state: remote.state })
        } else if (!remote || (localUpdatedAt && localUpdatedAt > remote.updatedAt)) {
          pendingPush.current = {
            snapshot: { state, updatedAt: localUpdatedAt ?? new Date().toISOString() },
            deviceId: getDeviceId(),
          }
          flushPush()
        }
      })
      .catch((error) => console.warn('locker fetch failed', error))
      .finally(() => {
        if (!cancelled) syncReady.current = true
      })
    window.addEventListener('pagehide', flushPush)
    return () => {
      cancelled = true
      window.removeEventListener('pagehide', flushPush)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setPersisted(state)
    if (skipNextPush.current) {
      skipNextPush.current = false
      return
    }
    if (!syncReady.current) return
    const updatedAt = new Date().toISOString()
    setLocalUpdatedAt(updatedAt)
    pendingPush.current = { snapshot: { state, updatedAt }, deviceId: getDeviceId() }
    clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(flushPush, 1000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  useEffect(() => {
    if (seedDatesVersion !== SEED_DATES_VERSION) setSeedDatesVersion(SEED_DATES_VERSION)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value: LockerContextValue = {
    items: state.items,
    locations: state.locations,
    categories: state.categories,
    addItem: (item) => dispatch({ type: 'ADD_ITEM', item }),
    updateItem: (id, patch) => dispatch({ type: 'UPDATE_ITEM', id, patch }),
    recordPurchase: (id) => {
      const item = state.items.find((i) => i.id === id)
      if (!item) return
      const today = new Date().toISOString().slice(0, 10)
      const earlier = item.purchaseHistory ?? (item.restockedAt ? [item.restockedAt] : [])
      setLastPurchase({
        id,
        name: item.name,
        date: today,
        prev: { purchaseHistory: item.purchaseHistory, restockedAt: item.restockedAt },
      })
      dispatch({
        type: 'UPDATE_ITEM',
        id,
        patch: { purchaseHistory: [...earlier.filter((d) => d !== today), today], restockedAt: today },
      })
    },
    lastPurchase,
    syncedAt,
    undoLastPurchase: () => {
      if (!lastPurchase) return
      dispatch({ type: 'UPDATE_ITEM', id: lastPurchase.id, patch: lastPurchase.prev })
      setLastPurchase(null)
    },
    dismissLastPurchase: () => setLastPurchase(null),
    recordPurchaseDetails: (id, date, details) => {
      const item = state.items.find((i) => i.id === id)
      if (!item) return
      dispatch({
        type: 'UPDATE_ITEM',
        id,
        patch: {
          ...(details.price !== undefined && { price: details.price }),
          ...(details.place && { place: details.place }),
          purchaseDetails: { ...item.purchaseDetails, [date]: details },
        },
      })
    },
    removeItem: (id) => dispatch({ type: 'REMOVE_ITEM', id }),
    addLocation: (name) => {
      const location: Location = { id: `loc-${Date.now()}`, name, colorToken: 'bathroom' }
      dispatch({ type: 'ADD_LOCATION', location })
      return location
    },
    renameLocation: (id, name) => dispatch({ type: 'RENAME_LOCATION', id, name }),
    removeLocation: (id) => dispatch({ type: 'REMOVE_LOCATION', id }),
    addCategory: (locationId, name) => {
      const category: Category = { id: `cat-${Date.now()}`, locationId, name, masterItems: [] }
      dispatch({ type: 'ADD_CATEGORY', category })
      return category
    },
    renameCategory: (id, name) => dispatch({ type: 'RENAME_CATEGORY', id, name }),
    removeCategory: (id) => dispatch({ type: 'REMOVE_CATEGORY', id }),
    setPodiumRank: (itemId, categoryId, rank) =>
      dispatch({ type: 'SET_PODIUM_RANK', itemId, categoryId, rank }),
  }

  return <LockerContext.Provider value={value}>{children}</LockerContext.Provider>
}

export function useLocker(): LockerContextValue {
  const ctx = useContext(LockerContext)
  if (!ctx) throw new Error('useLocker must be used within a LockerProvider')
  return ctx
}
