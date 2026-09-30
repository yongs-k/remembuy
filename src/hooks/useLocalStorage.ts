import { useEffect, useId, useRef, useState } from 'react'

// Every hook instance keeps its own copy of the value, so a write must tell
// the other instances on the same key to re-read (e.g. the header's unread dot
// and the notifications page both use the seen-ids key).
const SYNC_EVENT = 'remembuy:local-storage'
type SyncDetail = { key: string; source: string }

function read<T>(key: string, fallback: T): T {
  try {
    const item = window.localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : fallback
  } catch {
    return fallback
  }
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => read(key, initialValue))
  const source = useId()
  const initialRef = useRef(initialValue)
  const pendingBroadcast = useRef(false)

  useEffect(() => {
    if (!pendingBroadcast.current) return
    pendingBroadcast.current = false
    window.dispatchEvent(new CustomEvent<SyncDetail>(SYNC_EVENT, { detail: { key, source } }))
  }, [storedValue, key, source])

  useEffect(() => {
    function sync(event: Event) {
      if (event instanceof StorageEvent) {
        if (event.key !== key) return
      } else {
        const detail = (event as CustomEvent<SyncDetail>).detail
        if (detail.key !== key || detail.source === source) return
      }
      setStoredValue(read(key, initialRef.current))
    }
    window.addEventListener(SYNC_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(SYNC_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [key, source])

  function setValue(value: T | ((prev: T) => T)) {
    pendingBroadcast.current = true
    setStoredValue((prev) => {
      const next = value instanceof Function ? value(prev) : value
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // ignore write errors (e.g. storage full or disabled)
      }
      return next
    })
  }

  return [storedValue, setValue]
}
