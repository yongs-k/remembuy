export async function resizeImageToBase64(
  file: File,
  maxDimension = 1280,
  quality = 0.8
): Promise<{ base64: string; mimeType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('failed to read file'))
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('failed to decode image'))
    image.src = dataUrl
  })

  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
  const width = Math.round(img.width * scale)
  const height = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  ctx.drawImage(img, 0, 0, width, height)

  const resizedDataUrl = canvas.toDataURL('image/jpeg', quality)
  const base64 = resizedDataUrl.split(',')[1]
  return { base64, mimeType: 'image/jpeg' }
}
