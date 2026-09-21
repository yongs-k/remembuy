import { Icon } from '../data/materialIcons'

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
        aria-pressed={value === 'recommend'}
        onClick={() => onChange('recommend')}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-label-md ${
          value === 'recommend'
            ? 'bg-secondary text-on-secondary shadow-[0_2px_0px_#304c46]'
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
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-label-md ${
          value === 'notRecommend'
            ? 'bg-primary text-on-primary shadow-[0_2px_0px_#8b1901]'
            : 'bg-surface-container-high text-on-surface'
        }`}
      >
        <Icon name="thumb_down" className="text-[18px]" />
        비추천해요
      </button>
    </div>
  )
}
