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
      <div className="flex items-center justify-between gap-space-sm">
        <h1 className="flex items-center gap-1.5 font-heading text-headline-lg text-on-surface">
          <Icon name="notifications" className="text-[24px] text-primary" />
          알림
        </h1>
        {upcoming.length > 0 && (
          <span className="rounded-full bg-error-container px-2 py-0.5 text-label-sm text-on-error-container">
            소진 임박 {upcoming.length}건
          </span>
        )}
      </div>

      {upcoming.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface-container-lowest p-space-xl text-center shadow-[0_3px_0px_#eae0de]">
          <Icon name="notifications_off" className="text-[32px] text-on-surface-variant" />
          <p className="text-body-sm text-on-surface-variant">임박한 소모품이 없습니다.</p>
        </div>
      ) : (
        <ul className="space-y-space-sm">
          {upcoming.map((item) => (
            <RestockCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  )
}
