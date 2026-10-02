// Short recovery codes ("ABCD-2345") standing in for the long device id, so a
// user can copy or read their code out and load their records elsewhere.
import { randomInt } from 'node:crypto'

const DEVICE_ID = /^[A-Za-z0-9-]{8,64}$/
// No 0/O, 1/I/L: the code is meant to be read and typed by people.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE = /^[A-Z2-9]{4}-[A-Z2-9]{4}$/

export function ensureRecoveryTable(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS recovery_codes (
    code TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  )`)
}

/** "abcd 2345" / "ABCD2345" → "ABCD-2345"; null if it can't be a code. */
export function normalizeCode(input) {
  const compact = String(input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (compact.length !== 8) return null
  const code = `${compact.slice(0, 4)}-${compact.slice(4)}`
  return CODE.test(code) ? code : null
}

function randomCode() {
  let s = ''
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)]
  return `${s.slice(0, 4)}-${s.slice(4)}`
}

/** The device's code, created on first request. */
export function getOrCreateCode(db, userId, now = new Date()) {
  const existing = db.prepare('SELECT code FROM recovery_codes WHERE user_id = ?').get(userId)
  if (existing) return existing.code
  // ~8.5e11 codes: a collision is unlikely, but retry instead of failing.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode()
    const result = db
      .prepare('INSERT OR IGNORE INTO recovery_codes (code, user_id, created_at) VALUES (?, ?, ?)')
      .run(code, userId, now.toISOString())
    if (result.changes === 1) return code
  }
  throw new Error('could not allocate a recovery code')
}

export function resolveCode(db, input) {
  const code = normalizeCode(input)
  if (!code) return null
  const row = db.prepare('SELECT user_id FROM recovery_codes WHERE code = ?').get(code)
  return row ? row.user_id : null
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

export function handleRecoveryRequest(req, res, db) {
  try {
    const url = new URL(req.url, 'http://localhost')
    if (req.method === 'GET' && url.pathname === '/api/recovery-code') {
      const deviceId = req.headers['x-device-id']
      if (typeof deviceId !== 'string' || !DEVICE_ID.test(deviceId)) {
        sendJson(res, 400, { error: 'invalid device id' })
        return
      }
      sendJson(res, 200, { code: getOrCreateCode(db, deviceId) })
      return
    }
    if (req.method === 'GET' && url.pathname === '/api/recovery-code/resolve') {
      const deviceId = resolveCode(db, url.searchParams.get('code'))
      if (!deviceId) sendJson(res, 404, { error: 'not found' })
      else sendJson(res, 200, { deviceId })
      return
    }
    sendJson(res, 404, { error: 'not found' })
  } catch {
    sendJson(res, 500, { error: 'server error' })
  }
}
