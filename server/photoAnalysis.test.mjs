import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPhotoPrompt, isAllowedImageMimeType } from './photoAnalysis.js'

test('buildPhotoPrompt includes the location/category names', () => {
  const locations = [{ id: 'bathroom', name: '욕실' }]
  const categories = [
    {
      id: 'bathroom-skincare',
      locationId: 'bathroom',
      name: '스킨케어',
      masterItems: [{ id: 'bathroom-skincare-sunscreen', name: '선크림' }],
    },
  ]
  const prompt = buildPhotoPrompt(locations, categories)
  assert.match(prompt, /욕실/)
  assert.match(prompt, /스킨케어/)
  assert.match(prompt, /선크림/)
})

test('buildPhotoPrompt does not embed any image data (the image travels separately as inlineData)', () => {
  const prompt = buildPhotoPrompt([], [])
  assert.doesNotMatch(prompt, /base64/i)
  assert.doesNotMatch(prompt, /data:image/i)
})

test('isAllowedImageMimeType accepts jpeg, png, and webp', () => {
  assert.equal(isAllowedImageMimeType('image/jpeg'), true)
  assert.equal(isAllowedImageMimeType('image/png'), true)
  assert.equal(isAllowedImageMimeType('image/webp'), true)
})

test('isAllowedImageMimeType rejects anything else', () => {
  assert.equal(isAllowedImageMimeType('image/gif'), false)
  assert.equal(isAllowedImageMimeType('application/pdf'), false)
  assert.equal(isAllowedImageMimeType(''), false)
  assert.equal(isAllowedImageMimeType(undefined), false)
})
