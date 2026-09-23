export type AdminItem = { id: string; name: string; grade: string; fragmentsRequired: number; active: boolean }
export type AdminBox = { id: string; name: string; costPoints: number; active: boolean }
export type AdminDropEntry = {
  id: number
  boxId: string
  itemId: string
  itemName: string
  resultType: 'FRAGMENT' | 'FULL_ITEM'
  weight: number
  active: boolean
}

const KEY_STORAGE = 'remembuy:adminKey'

export function getAdminKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

export function setAdminKey(key: string) {
  try {
    localStorage.setItem(KEY_STORAGE, key)
  } catch {
    // storage unavailable (private browsing etc.) — request headers still
    // use the in-memory value read back via getAdminKey() for this call
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': getAdminKey(),
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) throw new Error(`admin api ${res.status}`)
  return (await res.json()) as T
}

export const fetchAdminItems = () => request<{ items: AdminItem[] }>('/api/admin/items')
export const updateAdminItem = (
  id: string,
  patch: Partial<Pick<AdminItem, 'name' | 'fragmentsRequired' | 'active'>>
) => request<AdminItem>(`/api/admin/items/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) })

export const fetchAdminBoxes = () => request<{ boxes: AdminBox[] }>('/api/admin/boxes')
export const updateAdminBox = (
  id: string,
  patch: Partial<Pick<AdminBox, 'name' | 'costPoints' | 'active'>>
) => request<AdminBox>(`/api/admin/boxes/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) })

export const fetchAdminDropEntries = () => request<{ entries: AdminDropEntry[] }>('/api/admin/drop-entries')
export const updateAdminDropEntry = (
  id: number,
  patch: Partial<Pick<AdminDropEntry, 'weight' | 'active'>>
) => request<AdminDropEntry>(`/api/admin/drop-entries/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
