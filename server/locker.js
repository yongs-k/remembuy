// Server copy of each device's locker (locations, categories, items), keyed by
// the X-Device-Id the app already sends to the game API. The browser keeps a
// local copy; this one survives cleared storage and is the data the AI phase
// will learn from.

const DEVICE_ID = /^[A-Za-z0-9-]{8,64}$/
// ponytail: whole-state upsert. Fine for hundreds of items; switch to per-item
// rows if lockers grow past ~1MB or need server-side queries.
const MAX_BODY_BYTES = 1024 * 1024

export function ensureLockerTable(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS lockers (
    user_id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`)
}

export function isLockerState(state) {
  return (
    state !== null &&
    typeof state === 'object' &&
    ['items', 'locations', 'categories'].every((key) => Array.isArray(state[key]))
  )
}

export function getLocker(db, userId) {
  const row = db.prepare('SELECT state, updated_at FROM lockers WHERE user_id = ?').get(userId)
  return row ? { state: JSON.parse(row.state), updatedAt: row.updated_at } : null
}

/** Saves unless the stored copy is newer, so a late, stale write can't clobber fresh data. */
export function saveLocker(db, userId, state, updatedAt) {
  db.prepare(
    `INSERT INTO lockers (user_id, state, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at
     WHERE excluded.updated_at >= lockers.updated_at`
  ).run(userId, JSON.stringify(state), updatedAt)
  return getLocker(db, userId)
}

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
    // Decode once after concatenating so multi-byte Korean isn't split across chunks.
    req.on('end', () => resolve(tooLarge ? null : Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

export async function handleLockerRequest(req, res, db) {
  try {
    const deviceId = req.headers['x-device-id']
    if (typeof deviceId !== 'string' || !DEVICE_ID.test(deviceId)) {
      sendJson(res, 400, { error: 'invalid device id' })
      return
    }

    if (req.method === 'GET') {
      const locker = getLocker(db, deviceId)
      if (!locker) sendJson(res, 404, { error: 'not found' })
      else sendJson(res, 200, locker)
      return
    }

    if (req.method === 'PUT') {
      const body = await readBody(req)
      if (body === null) {
        sendJson(res, 413, { error: 'payload too large' })
        return
      }
      let parsed
      try {
        parsed = JSON.parse(body)
      } catch {
        sendJson(res, 400, { error: 'invalid json' })
        return
      }
      const { state, updatedAt } = parsed ?? {}
      if (!isLockerState(state) || typeof updatedAt !== 'string' || Number.isNaN(Date.parse(updatedAt))) {
        sendJson(res, 400, { error: 'invalid payload' })
        return
      }
      sendJson(res, 200, saveLocker(db, deviceId, state, updatedAt))
      return
    }

    sendJson(res, 405, { error: 'method not allowed' })
  } catch {
    sendJson(res, 500, { error: 'server error' })
  }
}
