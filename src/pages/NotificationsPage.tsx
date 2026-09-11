import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications } from '../state/selectors'
import { useSeenNotifications } from '../hooks/useSeenNotifications'

export default function NotificationsPage() {
  const { items } = useLocker()
  const navigate = useNavigate()
  const upcoming = useMemo(() => getUpcomingNotifications(items, 7), [items])
  const { markSeen } = useSeenNotifications()

  useEffect(() => {
    if (upcoming.length > 0) {
      markSeen(upcoming.map((item) => item.id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcoming])

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">알림</h1>

      {upcoming.length === 0 ? (
        <p className="text-sm text-ink/50">임박한 소모품이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {upcoming.map((item) => (
            <li key={item.id} className="rounded-lg border border-ink/10 bg-card p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{item.name}</p>
                <span className="text-warn">D-{item.daysUntilEmpty}</span>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="text-sm text-accent underline"
                >
                  상세보기
                </button>
                <a
                  href={item.affiliateUrl ?? '#'}
                  className="ml-auto rounded-full bg-stamp px-3 py-1 text-sm text-white"
                >
                  구매하기
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
