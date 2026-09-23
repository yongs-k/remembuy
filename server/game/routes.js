import { getCatalog, getState, claimSlots, getHistory } from './service.js'
import { getBoxes, getDex, openBox } from './itemService.js'

const DEVICE_ID = /^[A-Za-z0-9-]{8,64}$/
const MAX_BODY_BYTES = 64 * 1024

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
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
    req.on('end', () => resolve(tooLarge ? null : Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

const invalid = { error: 'invalid payload' }

export async function handleGameRequest(req, res, db) {
  try {
    const deviceId = req.headers['x-device-id']
    if (typeof deviceId !== 'string' || !DEVICE_ID.test(deviceId)) {
      sendJson(res, 400, { error: 'invalid device id' })
      return
    }
    const url = new URL(req.url, 'http://localhost')
    const route = `${req.method} ${url.pathname}`

    if (route === 'GET /api/game/catalog') {
      sendJson(res, 200, getCatalog(db))
      return
    }

    if (route === 'GET /api/game/state') {
      sendJson(res, 200, getState(db, deviceId))
      return
    }

    if (route === 'POST /api/game/claims') {
      const raw = await readBody(req)
      let body
      try {
        body = JSON.parse(raw ?? '')
      } catch {
        sendJson(res, 400, invalid)
        return
      }
      const ids = body?.slotIds
      const valid =
        Array.isArray(ids) &&
        ids.length >= 1 &&
        ids.length <= 200 &&
        ids.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 100)
      if (!valid) {
        sendJson(res, 400, invalid)
        return
      }
      sendJson(res, 200, claimSlots(db, deviceId, ids))
      return
    }

    if (route === 'GET /api/game/boxes') {
      sendJson(res, 200, { boxes: getBoxes(db) })
      return
    }

    if (route === 'GET /api/game/dex') {
      sendJson(res, 200, { items: getDex(db, deviceId) })
      return
    }

    const openMatch = url.pathname.match(/^\/api\/game\/boxes\/([^/]+)\/open$/)
    if (req.method === 'POST' && openMatch) {
      try {
        sendJson(res, 200, openBox(db, deviceId, decodeURIComponent(openMatch[1])))
      } catch (error) {
        if (error.message === 'box not found' || error.message === 'insufficient points') {
          sendJson(res, 400, { error: error.message })
        } else {
          throw error
        }
      }
      return
    }

    if (route === 'GET /api/game/points-history') {
      const limitRaw = url.searchParams.get('limit')
      const beforeRaw = url.searchParams.get('before')
      const limit = limitRaw === null ? 50 : Number(limitRaw)
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        sendJson(res, 400, invalid)
        return
      }
      let before
      if (beforeRaw !== null) {
        before = Number(beforeRaw)
        if (!Number.isInteger(before) || before < 1) {
          sendJson(res, 400, invalid)
          return
        }
      }
      sendJson(res, 200, getHistory(db, deviceId, { limit, before }))
      return
    }

    sendJson(res, 404, { error: 'not found' })
  } catch {
    sendJson(res, 500, { error: 'server error' })
  }
}
