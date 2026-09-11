export function RecommendationBadge({
  recommendation,
}: {
  recommendation: 'recommend' | 'notRecommend'
}) {
  if (recommendation === 'recommend') {
    return <span className="text-sm text-accent">👍 추천해요</span>
  }
  return <span className="text-sm text-ink/40">👎 비추천해요</span>
}
