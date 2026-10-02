import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { ensureRecoveryTable, getOrCreateCode, resolveCode, normalizeCode } from './recovery.js'

test('a device keeps one short code that resolves back to it', () => {
  const db = new DatabaseSync(':memory:')
  ensureRecoveryTable(db)
  const code = getOrCreateCode(db, 'device-aaaa1111')
  assert.match(code, /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/)
  assert.equal(getOrCreateCode(db, 'device-aaaa1111'), code)
  assert.notEqual(getOrCreateCode(db, 'device-bbbb2222'), code)
  assert.equal(resolveCode(db, code), 'device-aaaa1111')
  assert.equal(resolveCode(db, code.toLowerCase().replace('-', ' ')), 'device-aaaa1111')
  assert.equal(resolveCode(db, 'ZZZZ-ZZZZ'), null)
})

test('normalizeCode accepts loose input and rejects ambiguous characters', () => {
  assert.equal(normalizeCode('abcd2345'), 'ABCD-2345')
  assert.equal(normalizeCode(' abcd - 2345 '), 'ABCD-2345')
  assert.equal(normalizeCode('ABCD-01IL'), null)
  assert.equal(normalizeCode('ABC-2345'), null)
})
