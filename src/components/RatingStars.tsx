export function RatingStars({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, rating))
  const empty = Math.max(0, 5 - filled)
  return (
    <span className="text-stamp" aria-label={`평점 ${rating}점`}>
      {'★'.repeat(filled)}
      <span className="text-ink/30">{'★'.repeat(empty)}</span>
    </span>
  )
}
