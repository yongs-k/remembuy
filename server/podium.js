import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, 'data', 'podiums.json')

export async function readSubmissions() {
  let raw
  try {
    raw = await readFile(DATA_FILE, 'utf-8')
  } catch (err) {
    if (err.code === 'ENOENT') return []
    throw err
  }
  return JSON.parse(raw)
}

export async function writeSubmissions(submissions) {
  await mkdir(path.dirname(DATA_FILE), { recursive: true })
  await writeFile(DATA_FILE, JSON.stringify(submissions, null, 2))
}

export async function upsertSubmission(deviceId, categoryId, items) {
  const submissions = await readSubmissions()
  const filtered = submissions.filter(
    (s) => !(s.deviceId === deviceId && s.categoryId === categoryId)
  )
  filtered.push({ deviceId, categoryId, items })
  await writeSubmissions(filtered)
}

const RANK_SCORE = { 1: 3, 2: 2, 3: 1 }

export function aggregateRanking(submissions, categoryId) {
  const scoreByKey = new Map()
  for (const submission of submissions) {
    if (submission.categoryId !== categoryId) continue
    for (const entry of submission.items) {
      const key = entry.masterItemId ?? entry.name.trim().toLowerCase()
      const current = scoreByKey.get(key) ?? {
        name: entry.name,
        masterItemId: entry.masterItemId,
        score: 0,
        voters: 0,
      }
      current.score += RANK_SCORE[entry.rank] ?? 0
      current.voters += 1
      scoreByKey.set(key, current)
    }
  }
  return Array.from(scoreByKey.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}
