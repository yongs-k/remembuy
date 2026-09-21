import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications } from '../state/selectors'
import { useSeenNotifications } from '../hooks/useSeenNotifications'
import { Icon } from '../data/materialIcons'

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
          {upcoming.map((item) => {
            const urgent = item.daysUntilEmpty !== undefined && item.daysUntilEmpty <= 7
            return (
              <li
                key={item.id}
                className="rounded-xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]"
              >
                <div className="flex items-center gap-space-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
                    <Icon name="inventory_2" className="text-[22px]" />
                  </div>
                  <p className="min-w-0 flex-1 truncate text-label-lg text-on-surface">{item.name}</p>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-label-sm ${
                      urgent
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    D-{item.daysUntilEmpty}
                  </span>
                </div>
                <div className="mt-space-sm flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/item/${item.id}`)}
                    className="rounded-lg bg-surface-container-high px-3 py-1.5 text-label-md text-on-surface"
                  >
                    상세보기
                  </button>
                  {item.affiliateUrl ? (
                    <a
                      href={item.affiliateUrl}
                      className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-label-md text-on-primary shadow-[0_2px_0px_#8b1901] active:translate-y-0.5"
                    >
                      구매하기
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="ml-auto rounded-lg bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant opacity-60"
                    >
                      구매 링크 없음
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
