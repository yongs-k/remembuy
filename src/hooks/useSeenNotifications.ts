import { useLocalStorage } from './useLocalStorage'

export function useSeenNotifications() {
  const [seenIds, setSeenIds] = useLocalStorage<string[]>('remembuy:seenNotificationIds', [])

  function markSeen(ids: string[]) {
    setSeenIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      return Array.from(next)
    })
  }

  return { seenIds, markSeen }
}
