import { useEffect, useMemo } from 'react'
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications } from '../state/selectors'
import { RestockCard } from '../components/RestockCard'
import { useSeenNotifications } from '../hooks/useSeenNotifications'
import { Icon } from '../data/materialIcons'

export default function NotificationsPage() {
  const { items } = useLocker()
  const upcoming = useMemo(() => getUpcomingNotifications(items, 7), [items])
  const { markSeen } = useSeenNotifications()

  useEffect(() => {
    if (upcoming.length > 0) {
      markSeen(upcoming.map((item) => `${item.id}:${item.restockedAt ?? item.createdAt}`))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcoming])

  return (
    <div className="space-y-space-md p-margin">
      <div>
        <div className="flex items-baseline justify-between gap-space-sm">
          <h1 className="font-heading text-display-sm text-on-surface">만료 임박 제품</h1>
          {upcoming.length > 0 && (
            <span className="shrink-0 text-label-md tabular-nums text-primary">{upcoming.length}개</span>
          )}
        </div>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          7일 안에 떨어지거나 이미 지난 상품을 급한 순서로 보여드려요.
        </p>
      </div>

      {upcoming.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface-container-lowest p-space-xl text-center border border-hairline shadow-card">
          <Icon name="notifications_off" className="text-[32px] text-on-surface-variant" />
          <p className="text-body-sm text-on-surface-variant">임박한 소모품이 없습니다.</p>
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
