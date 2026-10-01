const DEVICE_ID_KEY = 'remembuy:deviceId'

/** Same shape the server accepts in X-Device-Id. */
export const DEVICE_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/

export function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem(DEVICE_ID_KEY, id)
  return id
}

/**
 * Adopts another device's ID (its recovery code). The caller reloads the app so
 * the locker and game state are pulled fresh for that ID.
 */
export function adoptDeviceId(id: string) {
  localStorage.setItem(DEVICE_ID_KEY, id)
  // Forget this device's sync timestamp so the server copy always wins on reload.
  localStorage.removeItem('remembuy:stateUpdatedAt')
}
