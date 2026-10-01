import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBack } from '../hooks/useBack'
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications } from '../state/selectors'
import { RestockCard } from '../components/RestockCard'
import { useSeenNotifications } from '../hooks/useSeenNotifications'
import { Icon } from '../data/materialIcons'

export default function NotificationsPage() {
  const { items } = useLocker()
  const upcoming = useMemo(() => getUpcomingNotifications(items, 7), [items])
  const { markSeen } = useSeenNotifications()
  const navigate = useNavigate()
  const goBack = useBack()

  useEffect(() => {
    if (upcoming.length > 0) {
      markSeen(upcoming.map((item) => `${item.id}:${item.restockedAt ?? item.createdAt}`))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcoming])

  return (
    <div className="space-y-space-md p-margin">
      <button
        type="button"
        onClick={() => goBack(() => navigate('/'))}
        className="relative inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant transition-colors before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] hover:bg-surface-container-high"
      >
        <Icon name="arrow_back" className="text-[16px]" />
        뒤로
      </button>
      <div>
        <div className="flex items-baseline justify-between gap-space-sm">
          <h1 className="font-heading text-display-sm text-on-surface">곧 떨어질 상품</h1>
          {upcoming.length > 0 && (
            <span className="shrink-0 text-label-md tabular-nums text-on-surface-variant">{upcoming.length}개</span>
          )}
        </div>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          7일 안에 떨어지거나 이미 지난 상품을 급한 순서로 보여드려요.
        </p>
      </div>

      {upcoming.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface-container-lowest p-space-xl text-center border border-hairline shadow-card">
          <Icon name="notifications_off" className="text-[32px] text-on-surface-variant" />
          <p className="text-body-sm text-on-surface-variant">7일 안에 떨어질 상품이 없어요.</p>
        </div>
      ) : (
        <ul className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest shadow-card">
          {upcoming.map((item) => (
            <RestockCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  )
}
