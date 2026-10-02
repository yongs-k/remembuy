import { getDeviceId } from './deviceId'

export type LockerSnapshot<T> = { state: T; updatedAt: string }

/** The server copy of a device's locker (this one by default), or null if it never synced. */
export async function fetchRemoteLocker<T>(deviceId = getDeviceId()): Promise<LockerSnapshot<T> | null> {
  const res = await fetch('/api/locker', { headers: { 'X-Device-Id': deviceId } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`locker fetch failed: ${res.status}`)
  return res.json()
}

/**
 * Pass the device id captured when the change was made: a save that flushes
 * after the user adopted another recovery code must still go to the old id.
 */
export async function pushRemoteLocker<T>(snapshot: LockerSnapshot<T>, deviceId = getDeviceId()): Promise<void> {
  const res = await fetch('/api/locker', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Device-Id': deviceId },
    body: JSON.stringify(snapshot),
    // Lets a save started as the tab closes still reach the server.
    keepalive: true,
  })
  if (!res.ok) throw new Error(`locker save failed: ${res.status}`)
}

/** This device's short recovery code ("ABCD-2345"), created by the server on first request. */
export async function fetchShortCode(): Promise<string> {
  const res = await fetch('/api/recovery-code', { headers: { 'X-Device-Id': getDeviceId() } })
  if (!res.ok) throw new Error(`recovery code failed: ${res.status}`)
  return ((await res.json()) as { code: string }).code
}

/** "abcd2345" / "ABCD-2345" → "ABCD-2345"; null if it can't be a short code. */
export function normalizeShortCode(input: string): string | null {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (compact.length !== 8 || /[01IOL]/.test(compact)) return null
  return `${compact.slice(0, 4)}-${compact.slice(4)}`
}

/** The device id behind a short code, or null if no device has it. */
export async function resolveShortCode(code: string): Promise<string | null> {
  const res = await fetch(`/api/recovery-code/resolve?code=${encodeURIComponent(code)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`recovery code lookup failed: ${res.status}`)
  return ((await res.json()) as { deviceId: string }).deviceId
}
