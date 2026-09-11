export function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="text-stamp" aria-label={`평점 ${rating}점`}>
      {'★'.repeat(rating)}
      <span className="text-ink/30">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}
