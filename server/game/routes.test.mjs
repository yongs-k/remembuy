import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { openDb } from './db.js'
import { handleGameRequest } from './routes.js'

const slot = (id) => ({ id, name: id })
const CATALOG = {
  spaces: [
    {
      id: 'sp1',
      name: '공간1',
      groups: [{ id: 'g1', name: '그룹1', slots: ['a1', 'a2', 'a3', 'a4'].map(slot) }],
    },
  ],
}
const DEVICE = 'device-aaaa1111'

async function start() {
  const db = openDb(':memory:', { catalog: CATALOG })
  const server = createServer((req, res) => {
    handleGameRequest(req, res, db)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  return {
    base,
    close: () => {
      server.closeAllConnections()
      return new Promise((resolve) => server.close(resolve))
    },
  }
}

function call(base, path, { device = DEVICE, method = 'GET', body } = {}) {
  return fetch(base + path, {
    method,
    headers: { ...(device ? { 'X-Device-Id': device } : {}), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
}

test('requests without a valid X-Device-Id are rejected', async () => {
  const { base, close } = await start()
  try {
    assert.equal((await call(base, '/api/game/state', { device: null })).status, 400)
    assert.equal((await call(base, '/api/game/state', { device: 'short' })).status, 400)
    assert.equal((await call(base, '/api/game/state', { device: 'bad id with spaces!' })).status, 400)
  } finally {
    await close()
  }
})

test('catalog and state endpoints respond', async () => {
  const { base, close } = await start()
  try {
    const catalog = await (await call(base, '/api/game/catalog')).json()
    assert.equal(catalog.spaces[0].groups[0].slots.length, 4)
    assert.equal(catalog.titleTiers.length, 4)
    const res = await call(base, '/api/game/state')
    assert.equal(res.status, 200)
    const state = await res.json()
    assert.equal(state.points, 0)
    assert.equal(state.spaces[0].total, 4)
  } finally {
    await close()
  }
})

test('claims validate the payload', async () => {
  const { base, close } = await start()
  try {
    const bad = [
      'not json',
      {},
      { slotIds: 'a1' },
      { slotIds: [] },
      { slotIds: [1] },
      { slotIds: [''] },
      { slotIds: Array.from({ length: 201 }, (_, i) => `s${i}`) },
    ]
    for (const body of bad) {
      const res = await call(base, '/api/game/claims', { method: 'POST', body })
      assert.equal(res.status, 400, JSON.stringify(body).slice(0, 40))
    }
  } finally {
    await close()
  }
})

test('claim, state and history work end to end and are per device', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, '/api/game/claims', { method: 'POST', body: { slotIds: ['a1', 'a2'] } })
    assert.equal(res.status, 200)
    const result = await res.json()
    assert.deepEqual(result.newSlots, ['a1', 'a2'])
    // 2 of 4 slots = 50%: SPROUT (200) and MANAGER (500) are both reached
    assert.equal(result.pointsAwarded, 700)
    assert.equal(result.state.titles.length, 2)

    const state = await (await call(base, '/api/game/state')).json()
    assert.equal(state.spaces[0].claimed, 2)

    const history = await (await call(base, '/api/game/points-history?limit=1')).json()
    assert.equal(history.items.length, 1)
    assert.notEqual(history.nextBefore, null)

    const other = await (await call(base, '/api/game/state', { device: 'device-bbbb2222' })).json()
    assert.equal(other.points, 0)
    assert.equal(other.spaces[0].claimed, 0)
  } finally {
    await close()
  }
})

test('points-history validates its query and unknown routes return 404', async () => {
  const { base, close } = await start()
  try {
    for (const q of ['limit=0', 'limit=101', 'limit=abc', 'before=abc', 'before=0']) {
      const res = await call(base, `/api/game/points-history?${q}`)
      assert.equal(res.status, 400, q)
    }
    assert.equal((await call(base, '/api/game/points-history')).status, 200)
    assert.equal((await call(base, '/api/game/nope')).status, 404)
  } finally {
    await close()
  }
})
