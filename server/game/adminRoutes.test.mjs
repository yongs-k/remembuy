import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { openDb } from './db.js'
import { handleAdminRequest } from './adminRoutes.js'

const ADMIN_KEY = 'test-admin-key-123'

async function start() {
  const db = openDb(':memory:')
  const server = createServer((req, res) => {
    handleAdminRequest(req, res, db)
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

function call(base, path, options = {}) {
  // ponytail: `{ key = ADMIN_KEY }` destructuring can't distinguish "key
  // omitted" from "key: undefined" (JS applies the default either way), but
  // the tests below need the latter to mean "send no key". Check
  // presence explicitly instead.
  const { method = 'GET', body } = options
  const key = 'key' in options ? options.key : ADMIN_KEY
  return fetch(base + path, {
    method,
    headers: { ...(key !== undefined ? { 'X-Admin-Key': key } : {}), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
}

test('every route returns 503 when ADMIN_KEY is unset', async () => {
  const original = process.env.ADMIN_KEY
  delete process.env.ADMIN_KEY
  const { base, close } = await start()
  try {
    assert.equal((await call(base, '/api/admin/items')).status, 503)
    assert.equal((await call(base, '/api/admin/boxes')).status, 503)
    assert.equal((await call(base, '/api/admin/drop-entries')).status, 503)
  } finally {
    await close()
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})

test('a missing or wrong key is rejected with 401 when ADMIN_KEY is set', async () => {
  const original = process.env.ADMIN_KEY
  process.env.ADMIN_KEY = ADMIN_KEY
  const { base, close } = await start()
  try {
    assert.equal((await call(base, '/api/admin/items', { key: undefined })).status, 401)
    assert.equal((await call(base, '/api/admin/items', { key: 'wrong' })).status, 401)
  } finally {
    await close()
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})

test('items: list and patch round-trip with the right key', async () => {
  const original = process.env.ADMIN_KEY
  process.env.ADMIN_KEY = ADMIN_KEY
  const { base, close } = await start()
  try {
    const list = await (await call(base, '/api/admin/items')).json()
    assert.equal(list.items.length, 14)
    const target = list.items[0]
    const res = await call(base, `/api/admin/items/${target.id}`, {
      method: 'PATCH',
      body: { name: '수정된 이름' },
    })
    assert.equal(res.status, 200)
    const updated = await res.json()
    assert.equal(updated.name, '수정된 이름')
  } finally {
    await close()
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})

test('boxes: list and patch round-trip with the right key', async () => {
  const original = process.env.ADMIN_KEY
  process.env.ADMIN_KEY = ADMIN_KEY
  const { base, close } = await start()
  try {
    const list = await (await call(base, '/api/admin/boxes')).json()
    assert.equal(list.boxes.length, 1)
    const res = await call(base, `/api/admin/boxes/${list.boxes[0].id}`, {
      method: 'PATCH',
      body: { costPoints: 999 },
    })
    assert.equal(res.status, 200)
    const updated = await res.json()
    assert.equal(updated.costPoints, 999)
  } finally {
    await close()
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})

test('drop-entries: list and patch round-trip with the right key', async () => {
  const original = process.env.ADMIN_KEY
  process.env.ADMIN_KEY = ADMIN_KEY
  const { base, close } = await start()
  try {
    const list = await (await call(base, '/api/admin/drop-entries')).json()
    assert.equal(list.entries.length, 28)
    const target = list.entries[0]
    const res = await call(base, `/api/admin/drop-entries/${target.id}`, {
      method: 'PATCH',
      body: { weight: 77 },
    })
    assert.equal(res.status, 200)
    const updated = await res.json()
    assert.equal(updated.weight, 77)
  } finally {
    await close()
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})

test('invalid patch bodies return 400', async () => {
  const original = process.env.ADMIN_KEY
  process.env.ADMIN_KEY = ADMIN_KEY
  const { base, close } = await start()
  try {
    const list = await (await call(base, '/api/admin/items')).json()
    const id = list.items[0].id
    for (const body of [{}, { fragmentsRequired: -1 }, { name: '' }, { active: 'yes' }]) {
      const res = await call(base, `/api/admin/items/${id}`, { method: 'PATCH', body })
      assert.equal(res.status, 400, JSON.stringify(body))
    }
  } finally {
    await close()
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})

test('a PATCH to an unknown id returns 404', async () => {
  const original = process.env.ADMIN_KEY
  process.env.ADMIN_KEY = ADMIN_KEY
  const { base, close } = await start()
  try {
    const res = await call(base, '/api/admin/items/no-such-item', {
      method: 'PATCH',
      body: { name: 'x' },
    })
    assert.equal(res.status, 404)
  } finally {
    await close()
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})

test('unknown routes return 404', async () => {
  const original = process.env.ADMIN_KEY
  process.env.ADMIN_KEY = ADMIN_KEY
  const { base, close } = await start()
  try {
    assert.equal((await call(base, '/api/admin/nope')).status, 404)
  } finally {
    await close()
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})
