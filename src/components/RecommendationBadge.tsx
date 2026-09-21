import { Icon } from '../data/materialIcons'

export function RecommendationBadge({
  recommendation,
}: {
  recommendation: 'recommend' | 'notRecommend'
}) {
  if (recommendation === 'recommend') {
    return (
      <span className="inline-flex items-center gap-1 text-body-sm text-secondary">
        <Icon name="thumb_up" className="text-[14px]" />
        추천해요
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant">
      <Icon name="thumb_down" className="text-[14px]" />
      비추천해요
    </span>
  )
}
