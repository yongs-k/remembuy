import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { claimSlots, fetchGameState, openBox, fetchBoxes, fetchDex } from './gameApi'

describe('gameApi', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends the device id header and parses the JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ points: 5 }) })
    vi.stubGlobal('fetch', fetchMock)
    const state = await fetchGameState()
    expect(state).toEqual({ points: 5 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/game/state')
    expect((init.headers as Record<string, string>)['X-Device-Id']).toBe(
      window.localStorage.getItem('remembuy:deviceId')
    )
  })

  it('posts the slot ids as JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ newSlots: ['a'] }) })
    vi.stubGlobal('fetch', fetchMock)
    await claimSlots(['a', 'b'])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/game/claims')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ slotIds: ['a', 'b'] })
  })

  it('throws on a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(fetchGameState()).rejects.toThrow('game api 500')
  })

  it('opens a box via POST to the encoded box id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { type: 'FRAGMENT', itemId: 'x', itemName: 'X', grade: 'COMMON' }, pointsSpent: 500, pointsBalance: 0, dexEntry: {} }),
    })
    vi.stubGlobal('fetch', fetchMock)
    await openBox('box starter')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/game/boxes/box%20starter/open')
    expect(init.method).toBe('POST')
  })

  it('fetches boxes and dex', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ boxes: [] }) })
    vi.stubGlobal('fetch', fetchMock)
    await fetchBoxes()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/game/boxes')
    await fetchDex()
    expect(fetchMock.mock.calls[1][0]).toBe('/api/game/dex')
  })
})
