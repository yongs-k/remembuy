import { RESPONSE_SCHEMA } from './linkAnalysis.js'

const DEFAULT_MODEL = 'gemini-3.6-flash'
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function isAllowedImageMimeType(mimeType) {
  return ALLOWED_MIME_TYPES.includes(mimeType)
}

export function buildPhotoPrompt(locations, categories) {
  const locationList = locations.map((l) => `- ${l.id}: ${l.name}`).join('\n')
  const categoryList = categories
    .map((c) => {
      const items = c.masterItems.map((m) => `${m.id}:${m.name}`).join(', ')
      return `- ${c.id} (in ${c.locationId}): ${c.name}${items ? ` [items: ${items}]` : ''}`
    })
    .join('\n')

  return `You are identifying a household product from a photo, to prefill a household-inventory app's "add item" form.

Existing locations:
${locationList}

Existing categories (with their standard items):
${categoryList}

Look at the attached photo and extract: the product name, a matching locationId/categoryId/masterItemId from the lists above if one clearly fits (else null and a suggested new name), and a plausible restock cycle description in Korean (e.g. "약 2개월마다") based on the product type. The photo shows the product itself, not a receipt or a price tag — only fill "place" (store/brand name) or "price" if you can actually read it in the image (e.g. a visible price sticker or store logo); otherwise return null for those two fields. Return null for any field you cannot reasonably determine — never guess.`
}

export async function callGeminiVision(prompt, imageBase64, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(15000),
    }
  )
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Gemini request failed: ${res.status} ${errText}`)
  }
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini response missing content')
  return JSON.parse(text)
}

export async function analyzePhoto(imageBase64, mimeType, locations, categories) {
  const prompt = buildPhotoPrompt(locations, categories)
  return callGeminiVision(prompt, imageBase64, mimeType)
}
