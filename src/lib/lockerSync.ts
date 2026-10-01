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
