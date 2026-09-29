import test from 'node:test'
import assert from 'node:assert/strict'
import { buildImageSearchPrompt, isHttpUrl } from './imageSearch.js'

test('buildImageSearchPrompt includes the product name', () => {
  const prompt = buildImageSearchPrompt('톤업 선크림')
  assert.match(prompt, /톤업 선크림/)
})

test('buildImageSearchPrompt includes the category name when given', () => {
  const prompt = buildImageSearchPrompt('톤업 선크림', '스킨케어')
  assert.match(prompt, /스킨케어/)
})

test('buildImageSearchPrompt instructs the model never to invent a URL', () => {
  const prompt = buildImageSearchPrompt('톤업 선크림')
  assert.match(prompt, /null/i)
  assert.match(prompt, /never/i)
})

test('isHttpUrl accepts http and https URLs', () => {
  assert.equal(isHttpUrl('http://example.com/a.jpg'), true)
  assert.equal(isHttpUrl('https://example.com/a.jpg'), true)
})

test('isHttpUrl rejects non-http(s) schemes and malformed values', () => {
  assert.equal(isHttpUrl('javascript:alert(1)'), false)
  assert.equal(isHttpUrl('data:image/png;base64,abc'), false)
  assert.equal(isHttpUrl('not a url'), false)
  assert.equal(isHttpUrl(null), false)
  assert.equal(isHttpUrl(undefined), false)
})
