import test from 'node:test'
import assert from 'node:assert/strict'
import { checkAdminAuth } from './adminAuth.js'

function reqWithHeader(headerValue) {
  return { headers: headerValue === undefined ? {} : { 'x-admin-key': headerValue } }
}

test('checkAdminAuth returns "unconfigured" when ADMIN_KEY is unset', () => {
  const original = process.env.ADMIN_KEY
  delete process.env.ADMIN_KEY
  try {
    assert.equal(checkAdminAuth(reqWithHeader('anything')), 'unconfigured')
    assert.equal(checkAdminAuth(reqWithHeader(undefined)), 'unconfigured')
  } finally {
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})

test('checkAdminAuth returns "unauthorized" for a missing or wrong key when ADMIN_KEY is set', () => {
  const original = process.env.ADMIN_KEY
  process.env.ADMIN_KEY = 'secret123'
  try {
    assert.equal(checkAdminAuth(reqWithHeader(undefined)), 'unauthorized')
    assert.equal(checkAdminAuth(reqWithHeader('wrong')), 'unauthorized')
  } finally {
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})

test('checkAdminAuth returns "ok" for the exact matching key', () => {
  const original = process.env.ADMIN_KEY
  process.env.ADMIN_KEY = 'secret123'
  try {
    assert.equal(checkAdminAuth(reqWithHeader('secret123')), 'ok')
  } finally {
    if (original === undefined) delete process.env.ADMIN_KEY
    else process.env.ADMIN_KEY = original
  }
})
