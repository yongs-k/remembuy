import { createServer } from 'node:http'
import { upsertSubmission, readSubmissions, aggregateRanking } from './podium.js'

const PORT = 8787

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/podium-submissions') {
    const chunks = []
    req.on('data', (chunk) => {
      chunks.push(chunk)
    })
    req.on('end', async () => {
      try {
        // ponytail: concat raw Buffer chunks before decoding once as utf-8 —
        // `body += chunk` decodes each chunk independently and corrupts any
        // multi-byte character (e.g. Korean) split across a chunk boundary.
        const body = Buffer.concat(chunks).toString('utf-8')
        const { deviceId, categoryId, items } = JSON.parse(body)
        const validItems =
          Array.isArray(items) &&
          items.every(
            (item) =>
              [1, 2, 3].includes(item.rank) &&
              typeof item.name === 'string' &&
              item.name.trim().length > 0 &&
              (item.masterItemId === null || typeof item.masterItemId === 'string')
          )
        if (!deviceId || !categoryId || !validItems) {
          sendJson(res, 400, { error: 'invalid payload' })
          return
        }
        await upsertSubmission(deviceId, categoryId, items)
        res.writeHead(204)
        res.end()
      } catch {
        sendJson(res, 500, { error: 'server error' })
      }
    })
    return
  }

  if (req.method === 'GET' && req.url?.startsWith('/api/podium-rankings/')) {
    const categoryId = decodeURIComponent(req.url.replace('/api/podium-rankings/', ''))
    readSubmissions()
      .then((submissions) => {
        const ranking = aggregateRanking(submissions, categoryId)
        sendJson(res, 200, { categoryId, ranking })
      })
      .catch(() => sendJson(res, 500, { error: 'server error' }))
    return
  }

  sendJson(res, 404, { error: 'not found' })
})

server.listen(PORT, () => {
  console.log(`podium server listening on http://localhost:${PORT}`)
})
