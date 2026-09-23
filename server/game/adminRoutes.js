import {
  adminListItems,
  adminUpdateItem,
  adminListBoxes,
  adminUpdateBox,
  adminListDropEntries,
  adminUpdateDropEntry,
} from './adminService.js'
import { checkAdminAuth } from './adminAuth.js'

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

function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0
}

function parseItemPatch(body) {
  const patch = {}
  if (body?.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) return null
    patch.name = body.name
  }
  if (body?.fragmentsRequired !== undefined) {
    if (!isPositiveInt(body.fragmentsRequired)) return null
    patch.fragmentsRequired = body.fragmentsRequired
  }
  if (body?.active !== undefined) {
    if (typeof body.active !== 'boolean') return null
    patch.active = body.active
  }
  if (Object.keys(patch).length === 0) return null
  return patch
}

function parseBoxPatch(body) {
  const patch = {}
  if (body?.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) return null
    patch.name = body.name
  }
  if (body?.costPoints !== undefined) {
    if (!isPositiveInt(body.costPoints)) return null
    patch.costPoints = body.costPoints
  }
  if (body?.active !== undefined) {
    if (typeof body.active !== 'boolean') return null
    patch.active = body.active
  }
  if (Object.keys(patch).length === 0) return null
  return patch
}

function parseDropEntryPatch(body) {
  const patch = {}
  if (body?.weight !== undefined) {
    if (!Number.isInteger(body.weight) || body.weight < 0) return null
    patch.weight = body.weight
  }
  if (body?.active !== undefined) {
    if (typeof body.active !== 'boolean') return null
    patch.active = body.active
  }
  if (Object.keys(patch).length === 0) return null
  return patch
}

export async function handleAdminRequest(req, res, db) {
  try {
    const auth = checkAdminAuth(req)
    if (auth === 'unconfigured') {
      sendJson(res, 503, { error: 'admin not configured' })
      return
    }
    if (auth === 'unauthorized') {
      sendJson(res, 401, { error: 'unauthorized' })
      return
    }

    const url = new URL(req.url, 'http://localhost')
    const route = `${req.method} ${url.pathname}`

    if (route === 'GET /api/admin/items') {
      sendJson(res, 200, { items: adminListItems(db) })
      return
    }

    const itemMatch = url.pathname.match(/^\/api\/admin\/items\/([^/]+)$/)
    if (req.method === 'PATCH' && itemMatch) {
      const raw = await readBody(req)
      let body
      try {
        body = JSON.parse(raw ?? '')
      } catch {
        sendJson(res, 400, invalid)
        return
      }
      const patch = parseItemPatch(body)
      if (!patch) {
        sendJson(res, 400, invalid)
        return
      }
      try {
        sendJson(res, 200, adminUpdateItem(db, decodeURIComponent(itemMatch[1]), patch))
      } catch (error) {
        if (error.message === 'item not found') {
          sendJson(res, 404, { error: error.message })
        } else {
          throw error
        }
      }
      return
    }

    if (route === 'GET /api/admin/boxes') {
      sendJson(res, 200, { boxes: adminListBoxes(db) })
      return
    }

    const boxMatch = url.pathname.match(/^\/api\/admin\/boxes\/([^/]+)$/)
    if (req.method === 'PATCH' && boxMatch) {
      const raw = await readBody(req)
      let body
      try {
        body = JSON.parse(raw ?? '')
      } catch {
        sendJson(res, 400, invalid)
        return
      }
      const patch = parseBoxPatch(body)
      if (!patch) {
        sendJson(res, 400, invalid)
        return
      }
      try {
        sendJson(res, 200, adminUpdateBox(db, decodeURIComponent(boxMatch[1]), patch))
      } catch (error) {
        if (error.message === 'box not found') {
          sendJson(res, 404, { error: error.message })
        } else {
          throw error
        }
      }
      return
    }

    if (route === 'GET /api/admin/drop-entries') {
      sendJson(res, 200, { entries: adminListDropEntries(db) })
      return
    }

    const dropEntryMatch = url.pathname.match(/^\/api\/admin\/drop-entries\/(\d+)$/)
    if (req.method === 'PATCH' && dropEntryMatch) {
      const raw = await readBody(req)
      let body
      try {
        body = JSON.parse(raw ?? '')
      } catch {
        sendJson(res, 400, invalid)
        return
      }
      const patch = parseDropEntryPatch(body)
      if (!patch) {
        sendJson(res, 400, invalid)
        return
      }
      try {
        sendJson(res, 200, adminUpdateDropEntry(db, Number(dropEntryMatch[1]), patch))
      } catch (error) {
        if (error.message === 'drop entry not found') {
          sendJson(res, 404, { error: error.message })
        } else {
          throw error
        }
      }
      return
    }

    sendJson(res, 404, { error: 'not found' })
  } catch {
    sendJson(res, 500, { error: 'server error' })
  }
}
