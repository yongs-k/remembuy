import { getDeviceId } from './deviceId'

export type LockerSnapshot<T> = { state: T; updatedAt: string }

/** The server copy of this device's locker, or null if it has never synced. */
export async function fetchRemoteLocker<T>(): Promise<LockerSnapshot<T> | null> {
  const res = await fetch('/api/locker', { headers: { 'X-Device-Id': getDeviceId() } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`locker fetch failed: ${res.status}`)
  return res.json()
}

export async function pushRemoteLocker<T>(snapshot: LockerSnapshot<T>): Promise<void> {
  const res = await fetch('/api/locker', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Device-Id': getDeviceId() },
    body: JSON.stringify(snapshot),
    // Lets a save started as the tab closes still reach the server.
    keepalive: true,
  })
  if (!res.ok) throw new Error(`locker save failed: ${res.status}`)
}
