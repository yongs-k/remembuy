export function pickWeighted(entries, randomFn = Math.random) {
  if (entries.length === 0) throw new Error('pickWeighted: no entries')
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  if (total <= 0) throw new Error('pickWeighted: total weight is zero')
  let target = randomFn() * total
  for (const entry of entries) {
    target -= entry.weight
    if (target < 0) return entry
  }
  return entries[entries.length - 1]
}

export function applyFragment(existingCount, fragmentsRequired) {
  const newCount = existingCount + 1
  const justCompleted = existingCount < fragmentsRequired && newCount >= fragmentsRequired
  return { newCount, justCompleted }
}
