import test from 'node:test'
import assert from 'node:assert/strict'
import { buildImageSearchPrompt } from './imageSearch.js'

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
