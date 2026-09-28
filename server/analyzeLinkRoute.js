import { analyzeLink } from './linkAnalysis.js'

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

export function handleAnalyzeLinkRequest(req, res) {
  const chunks = []
  req.on('data', (chunk) => {
    chunks.push(chunk)
  })
  req.on('end', async () => {
    const body = Buffer.concat(chunks).toString('utf-8')
    let parsed
    try {
      parsed = JSON.parse(body)
    } catch {
      sendJson(res, 400, { error: 'invalid payload' })
      return
    }
    if (typeof parsed !== 'object' || parsed === null) {
      sendJson(res, 400, { error: 'invalid payload' })
      return
    }
    const { url, locations, categories } = parsed
    if (typeof url !== 'string' || !Array.isArray(locations) || !Array.isArray(categories)) {
      sendJson(res, 400, { error: 'invalid payload' })
      return
    }
    try {
      const result = await analyzeLink(url, locations, categories)
      sendJson(res, 200, result)
    } catch {
      sendJson(res, 502, { error: 'analysis failed' })
    }
  })
}
