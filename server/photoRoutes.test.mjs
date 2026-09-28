import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { handlePhotoRequest } from './photoRoutes.js'

async function start() {
  const server = createServer((req, res) => {
    handlePhotoRequest(req, res)
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

function call(base, body) {
  return fetch(`${base}/api/analyze-photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

test('rejects an unsupported mime type with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, {
      imageBase64: 'aGVsbG8=',
      mimeType: 'image/gif',
      locations: [],
      categories: [],
    })
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})

test('rejects malformed JSON with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, '{not json')
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})

test('rejects a payload missing required fields with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, { mimeType: 'image/jpeg', locations: [], categories: [] })
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})

test('rejects a body over the 8MB cap with 413', async () => {
  const { base, close } = await start()
  try {
    const oversized = 'a'.repeat(9 * 1024 * 1024)
    const res = await call(base, {
      imageBase64: oversized,
      mimeType: 'image/jpeg',
      locations: [],
      categories: [],
    })
    assert.equal(res.status, 413)
  } finally {
    await close()
  }
})

test('unknown routes return 404', async () => {
  const { base, close } = await start()
  try {
    const res = await fetch(`${base}/api/analyze-photo/nope`, { method: 'POST' })
    assert.equal(res.status, 404)
  } finally {
    await close()
  }
})
