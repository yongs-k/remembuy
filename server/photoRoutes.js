import { analyzePhoto, isAllowedImageMimeType } from './photoAnalysis.js'

const MAX_BODY_BYTES = 8 * 1024 * 1024

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

function readLimitedBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let tooLarge = false
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        tooLarge = true
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(tooLarge ? null : Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

export async function handlePhotoRequest(req, res) {
  if (req.method !== 'POST' || req.url !== '/api/analyze-photo') {
    sendJson(res, 404, { error: 'not found' })
    return
  }
  try {
    const raw = await readLimitedBody(req, MAX_BODY_BYTES)
    if (raw === null) {
      sendJson(res, 413, { error: 'image too large' })
      return
    }
    let body
    try {
      body = JSON.parse(raw)
    } catch {
      sendJson(res, 400, { error: 'invalid payload' })
      return
    }
    if (typeof body !== 'object' || body === null) {
      sendJson(res, 400, { error: 'invalid payload' })
      return
    }
    const { imageBase64, mimeType, locations, categories } = body
    if (
      typeof imageBase64 !== 'string' ||
      imageBase64.length === 0 ||
      typeof mimeType !== 'string' ||
      !Array.isArray(locations) ||
      !Array.isArray(categories)
    ) {
      sendJson(res, 400, { error: 'invalid payload' })
      return
    }
    if (!isAllowedImageMimeType(mimeType)) {
      sendJson(res, 400, { error: 'unsupported image type' })
      return
    }
    const result = await analyzePhoto(imageBase64, mimeType, locations, categories)
    sendJson(res, 200, result)
  } catch {
    sendJson(res, 502, { error: 'analysis failed' })
  }
}
