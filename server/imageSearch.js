const DEFAULT_MODEL = 'gemini-3.6-flash'

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    imageUrl: { type: 'STRING', nullable: true },
  },
  required: ['imageUrl'],
}

export function buildImageSearchPrompt(name, categoryName) {
  return `Find a single, direct, publicly-accessible image URL (ending in a common image extension like .jpg/.jpeg/.png/.webp, from a real, stable, well-known source such as a major retailer or manufacturer product page) that best represents this household product: "${name}"${categoryName ? ` (category: ${categoryName})` : ''}. Return null for imageUrl if you cannot confidently identify a specific, direct image URL — never invent or guess a URL.`
}

export async function callGeminiImageSearch(prompt) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
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

export async function searchProductImage(name, categoryName) {
  const prompt = buildImageSearchPrompt(name, categoryName)
  return callGeminiImageSearch(prompt)
}
