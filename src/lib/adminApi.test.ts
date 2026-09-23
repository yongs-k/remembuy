import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getAdminKey,
  setAdminKey,
  fetchAdminItems,
  updateAdminItem,
  fetchAdminBoxes,
  updateAdminBox,
  fetchAdminDropEntries,
  updateAdminDropEntry,
} from './adminApi'

describe('adminApi', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips the admin key through localStorage', () => {
    expect(getAdminKey()).toBe('')
    setAdminKey('secret123')
    expect(getAdminKey()).toBe('secret123')
  })

  it('sends the admin key header on fetchAdminItems', async () => {
    setAdminKey('secret123')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) })
    vi.stubGlobal('fetch', fetchMock)
    await fetchAdminItems()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/admin/items')
    expect((init.headers as Record<string, string>)['X-Admin-Key']).toBe('secret123')
  })

  it('PATCHes updateAdminItem with the encoded id and patch body', async () => {
    setAdminKey('secret123')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'x' }) })
    vi.stubGlobal('fetch', fetchMock)
    await updateAdminItem('item a', { name: 'New' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/admin/items/item%20a')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ name: 'New' })
  })

  it('fetches boxes and drop entries', async () => {
    setAdminKey('secret123')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ boxes: [] }) })
    vi.stubGlobal('fetch', fetchMock)
    await fetchAdminBoxes()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/boxes')
    await fetchAdminDropEntries()
    expect(fetchMock.mock.calls[1][0]).toBe('/api/admin/drop-entries')
  })

  it('PATCHes updateAdminBox and updateAdminDropEntry', async () => {
    setAdminKey('secret123')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await updateAdminBox('box-starter', { costPoints: 700 })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/boxes/box-starter')
    await updateAdminDropEntry(5, { weight: 10 })
    expect(fetchMock.mock.calls[1][0]).toBe('/api/admin/drop-entries/5')
  })

  it('throws on a non-2xx response', async () => {
    setAdminKey('secret123')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    await expect(fetchAdminItems()).rejects.toThrow('admin api 401')
  })
})
