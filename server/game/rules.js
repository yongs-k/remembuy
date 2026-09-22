export function percentOf(claimed, total) {
  if (total <= 0) return 0
  return Math.floor((claimed * 100) / total)
}

export function tiersReached(claimed, total, tiers) {
  if (total <= 0) return []
  return tiers
    .filter((tier) => claimed * 100 >= tier.min_percent * total)
    .sort((a, b) => a.sort - b.sort)
}

export function highestTier(tiers) {
  if (tiers.length === 0) return null
  return tiers.reduce((best, tier) => (tier.sort > best.sort ? tier : best))
}

export function nextTier(earnedCodes, tiers) {
  return [...tiers].sort((a, b) => a.sort - b.sort).find((tier) => !earnedCodes.includes(tier.code)) ?? null
}

export function bonusPoints(base, rateBp) {
  return Math.floor((base * rateBp) / 10000)
}

export function benefitActive(benefit, now) {
  const at = now.toISOString()
  if (benefit.start_at && benefit.start_at > at) return false
  if (benefit.end_at && benefit.end_at <= at) return false
  return true
}

export function pointRateBp(benefits, tierCode, now) {
  if (!tierCode) return 0
  return benefits
    .filter((b) => b.tier_code === tierCode && b.type === 'POINT_RATE' && benefitActive(b, now))
    .reduce((sum, b) => sum + b.value, 0)
}
