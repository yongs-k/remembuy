import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { handleAnalyzeLinkRequest } from './analyzeLinkRoute.js'

async function start() {
  const server = createServer((req, res) => {
    handleAnalyzeLinkRequest(req, res)
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
  return fetch(`${base}/api/analyze-link`, {
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

test('rejects a null JSON body with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, 'null')
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})

test('rejects a payload missing required fields with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, { url: 'https://example.com' })
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})

test('rejects wrong-typed fields with 400', async () => {
  const { base, close } = await start()
  try {
    const res = await call(base, { url: 123, locations: [], categories: [] })
    assert.equal(res.status, 400)
  } finally {
    await close()
  }
})
