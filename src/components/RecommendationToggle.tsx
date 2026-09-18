export function RecommendationToggle({
  value,
  onChange,
}: {
  value?: 'recommend' | 'notRecommend'
  onChange: (value: 'recommend' | 'notRecommend') => void
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange('recommend')}
        className={`flex-1 rounded-lg border-2 border-ink py-2 text-sm ${
          value === 'recommend' ? 'bg-accent text-white' : 'bg-card text-ink'
        }`}
      >
        👍 추천해요
      </button>
      <button
        type="button"
        onClick={() => onChange('notRecommend')}
        className={`flex-1 rounded-lg border-2 border-ink py-2 text-sm ${
          value === 'notRecommend' ? 'bg-stamp text-white' : 'bg-card text-ink'
        }`}
      >
        👎 비추천해요
      </button>
    </div>
  )
}
