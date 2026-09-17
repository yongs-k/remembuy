import test from 'node:test'
import assert from 'node:assert/strict'
import { extractText, buildPrompt } from './linkAnalysis.js'

test('extractText pulls title, og:title, og:description, and stripped body text', () => {
  const html = `
    <html><head>
      <title>테스트 상품 - 쇼핑몰</title>
      <meta property="og:title" content="테스트 상품" />
      <meta property="og:description" content="아주 좋은 상품입니다" />
      <script>console.log('should be stripped')</script>
    </head><body>
      <div>가격: 12,000원 <span>재고 있음</span></div>
    </body></html>
  `
  const result = extractText(html)
  assert.match(result, /테스트 상품 - 쇼핑몰/)
  assert.match(result, /OG Title: 테스트 상품/)
  assert.match(result, /OG Description: 아주 좋은 상품입니다/)
  assert.match(result, /가격: 12,000원/)
  assert.doesNotMatch(result, /console\.log/)
})

test('extractText truncates body text to 4000 characters', () => {
  const longBody = 'a'.repeat(5000)
  const html = `<html><body>${longBody}</body></html>`
  const result = extractText(html)
  const bodyLine = result.split('\n').find((line) => line.startsWith('Body:'))
  assert.ok(bodyLine.length <= 4000 + 'Body: '.length)
})

test('buildPrompt includes the page text and the location/category names', () => {
  const locations = [{ id: 'bathroom', name: '욕실' }]
  const categories = [
    {
      id: 'bathroom-skincare',
      locationId: 'bathroom',
      name: '스킨케어',
      masterItems: [{ id: 'bathroom-skincare-sunscreen', name: '선크림' }],
    },
  ]
  const prompt = buildPrompt('Title: 테스트 선크림', locations, categories)
  assert.match(prompt, /테스트 선크림/)
  assert.match(prompt, /욕실/)
  assert.match(prompt, /스킨케어/)
  assert.match(prompt, /선크림/)
})
