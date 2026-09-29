import { searchProductImage } from './imageSearch.js'

const MAX_BODY_BYTES = 64 * 1024

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

export function handleImageSearchRequest(req, res) {
  const chunks = []
  let size = 0
  let tooLarge = false
  req.on('data', (chunk) => {
    size += chunk.length
    if (size > MAX_BODY_BYTES) {
      tooLarge = true
      return
    }
    chunks.push(chunk)
  })
  req.on('end', async () => {
    if (tooLarge) {
      sendJson(res, 413, { error: 'request too large' })
      return
    }
    const body = Buffer.concat(chunks).toString('utf-8')
    let parsed
    try {
      parsed = JSON.parse(body)
    } catch {
      sendJson(res, 400, { error: 'invalid payload' })
      return
    }
    if (typeof parsed !== 'object' || parsed === null) {
      sendJson(res, 400, { error: 'invalid payload' })
      return
    }
    const { name, categoryName } = parsed
    if (typeof name !== 'string' || name.trim().length === 0) {
      sendJson(res, 400, { error: 'invalid payload' })
      return
    }
    if (categoryName !== undefined && typeof categoryName !== 'string') {
      sendJson(res, 400, { error: 'invalid payload' })
      return
    }
    try {
      const result = await searchProductImage(name, categoryName)
      sendJson(res, 200, result)
    } catch {
      sendJson(res, 502, { error: 'image search failed' })
    }
  })
}
