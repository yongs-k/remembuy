export type ImageSearchResult = { imageUrl: string | null }

export async function searchProductImage(
  name: string,
  categoryName?: string
): Promise<ImageSearchResult> {
  const res = await fetch('/api/search-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, categoryName }),
  })
  if (!res.ok) throw new Error(`image search failed: ${res.status}`)
  return res.json()
}
