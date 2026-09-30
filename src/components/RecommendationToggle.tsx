import { Icon } from '../data/materialIcons'

export function RecommendationToggle({
  value,
  onChange,
}: {
  value?: 'recommend' | 'notRecommend'
  onChange: (value: 'recommend' | 'notRecommend') => void
}) {
  return (
    <div role="group" aria-label="다시 살지 평가" className="flex gap-2">
      <button
        type="button"
        aria-pressed={value === 'recommend'}
        onClick={() => onChange('recommend')}
        className={`flex flex-1 items-center justify-center gap-1.5 min-h-11 rounded-lg text-label-md ${
          value === 'recommend'
            ? 'bg-secondary text-on-secondary'
            : 'bg-surface-container-high text-on-surface'
        }`}
      >
        <Icon name="thumb_up" className="text-[18px]" />
        추천해요
      </button>
      <button
        type="button"
        aria-pressed={value === 'notRecommend'}
        onClick={() => onChange('notRecommend')}
        className={`flex flex-1 items-center justify-center gap-1.5 min-h-11 rounded-lg text-label-md ${
          value === 'notRecommend'
            ? 'bg-on-surface text-surface'
            : 'bg-surface-container-high text-on-surface'
        }`}
      >
        <Icon name="thumb_down" className="text-[18px]" />
        비추천해요
      </button>
    </div>
  )
}
