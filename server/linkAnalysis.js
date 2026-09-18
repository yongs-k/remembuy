function extractMetaContent(html, propertyValue) {
  const metaTagRegex = /<meta\b[^>]*>/gi
  const tags = html.match(metaTagRegex) || []
  for (const tag of tags) {
    const propMatch = tag.match(/property\s*=\s*(["'])([^"']*og:[a-z]+)\1/i)
    if (!propMatch || propMatch[2].toLowerCase() !== propertyValue) continue
    const contentMatch = tag.match(/content\s*=\s*(["'])([\s\S]*?)\1/i)
    if (contentMatch) return contentMatch[2]
  }
  return null
}

export function extractText(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const ogTitle = extractMetaContent(html, 'og:title')
  const ogDesc = extractMetaContent(html, 'og:description')
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  const bodyText = (bodyMatch ? bodyMatch[1] : html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000)

  const parts = []
  if (titleMatch) parts.push(`Title: ${titleMatch[1].trim()}`)
  if (ogTitle) parts.push(`OG Title: ${ogTitle.trim()}`)
  if (ogDesc) parts.push(`OG Description: ${ogDesc.trim()}`)
  parts.push(`Body: ${bodyText}`)
  return parts.join('\n')
}

export function buildPrompt(pageText, locations, categories) {
  const locationList = locations.map((l) => `- ${l.id}: ${l.name}`).join('\n')
  const categoryList = categories
    .map((c) => {
      const items = c.masterItems.map((m) => `${m.id}:${m.name}`).join(', ')
      return `- ${c.id} (in ${c.locationId}): ${c.name}${items ? ` [items: ${items}]` : ''}`
    })
    .join('\n')

  return `You are extracting structured shopping info from a product page's text, to prefill a household-inventory app's "add item" form.

Existing locations:
${locationList}

Existing categories (with their standard items):
${categoryList}

Page content:
${pageText}

Extract: the product name, a matching locationId/categoryId/masterItemId from the lists above if one clearly fits (else null and a suggested new name), the purchase price as a plain number (no currency symbols), the place of purchase (site/brand name), and a plausible restock cycle description in Korean (e.g. "약 2개월마다") based on the product type — or null if you can't reasonably guess any field.`
}

export async function fetchPageText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`fetch failed with status ${res.status}`)
  const html = await res.text()
  return extractText(html.slice(0, 200_000))
}

// ponytail: brief specified gemini-2.5-flash, but the live API now 404s on it
// ("no longer available to new users") and names gemini-3.6-flash as the
// replacement — updated to keep the endpoint actually working.
const DEFAULT_MODEL = 'gemini-3.6-flash'

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', nullable: true },
    locationId: { type: 'STRING', nullable: true },
    suggestedLocationName: { type: 'STRING', nullable: true },
    categoryId: { type: 'STRING', nullable: true },
    suggestedCategoryName: { type: 'STRING', nullable: true },
    masterItemId: { type: 'STRING', nullable: true },
    place: { type: 'STRING', nullable: true },
    price: { type: 'NUMBER', nullable: true },
    restockCycle: { type: 'STRING', nullable: true },
  },
  required: [
    'name',
    'locationId',
    'suggestedLocationName',
    'categoryId',
    'suggestedCategoryName',
    'masterItemId',
    'place',
    'price',
    'restockCycle',
  ],
}

export async function callGemini(prompt) {
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

export async function analyzeLink(url, locations, categories) {
  const pageText = await fetchPageText(url)
  const prompt = buildPrompt(pageText, locations, categories)
  return callGemini(prompt)
}
