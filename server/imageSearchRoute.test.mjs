import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { handleImageSearchRequest } from './imageSearchRoute.js'

async function start() {
  const server = createServer((req, res) => {
    handleImageSearchRequest(req, res)
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
  return fetch(`${base}/api/search-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

test('rejects malformed JSON with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, '{not json')
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})

test('rejects a missing name with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, { categoryName: '스킨케어' })
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})

test('rejects an empty name with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, { name: '   ' })
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})

test('rejects a wrong-typed categoryName with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, { name: '톤업 선크림', categoryName: 123 })
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})

test('rejects a body over the 64KB cap with 413', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, { name: 'a'.repeat(65 * 1024) })
    assert.equal(res.status, 413)
  } finally {
    await close()
  }
})
