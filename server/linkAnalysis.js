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
