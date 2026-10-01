import { useLocalStorage } from './useLocalStorage'

/** How long after tapping 구매하기 the item offers 구매 완료. */
const PENDING_DAYS = 3

/**
 * Items whose purchase link was opened recently. Only these offer 구매 완료, so
 * the purchase history (and the learned cycle) only counts link-confirmed buys.
 */
export function usePendingPurchases() {
  const [pending, setPending] = useLocalStorage<Record<string, string>>('remembuy:pendingPurchases', {})

  function isPending(itemId: string, now = Date.now()) {
    const openedAt = pending[itemId]
    return openedAt !== undefined && now - new Date(openedAt).getTime() < PENDING_DAYS * 86_400_000
  }

  function markOpened(itemId: string) {
    setPending((prev) => ({ ...prev, [itemId]: new Date().toISOString() }))
  }

  function clear(itemId: string) {
    setPending((prev) => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }

  return { isPending, markOpened, clear }
}
