import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react'
import type { Item, Location, Category } from '../types'
import { SEED_ITEMS } from '../data/seedItems'
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

function reducer(state: State, action: Action): State {
  switch (action.type) {
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
    default:
      return state
  }
}

type LockerContextValue = {
  items: Item[]
  locations: Location[]
  categories: Category[]
  addItem: (item: Item) => void
  updateItem: (id: string, patch: Partial<Item>) => void
  removeItem: (id: string) => void
  addLocation: (name: string) => Location
  renameLocation: (id: string, name: string) => void
  removeLocation: (id: string) => void
  addCategory: (locationId: string, name: string) => Category
  renameCategory: (id: string, name: string) => void
  removeCategory: (id: string) => void
}

const LockerContext = createContext<LockerContextValue | null>(null)

const INITIAL_STATE: State = {
  items: SEED_ITEMS,
  locations: SEED_LOCATIONS,
  categories: SEED_CATEGORIES,
}

export function LockerProvider({ children }: { children: ReactNode }) {
  const [persisted, setPersisted] = useLocalStorage<State>('remembuy:state', INITIAL_STATE)
  const [state, dispatch] = useReducer(reducer, persisted)

  useEffect(() => {
    setPersisted(state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const value: LockerContextValue = {
    items: state.items,
    locations: state.locations,
    categories: state.categories,
    addItem: (item) => dispatch({ type: 'ADD_ITEM', item }),
    updateItem: (id, patch) => dispatch({ type: 'UPDATE_ITEM', id, patch }),
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
  }

  return <LockerContext.Provider value={value}>{children}</LockerContext.Provider>
}

export function useLocker(): LockerContextValue {
  const ctx = useContext(LockerContext)
  if (!ctx) throw new Error('useLocker must be used within a LockerProvider')
  return ctx
}
