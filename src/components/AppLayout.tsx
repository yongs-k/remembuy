import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications } from '../state/selectors'
import { useSeenNotifications } from '../hooks/useSeenNotifications'
import { Icon } from '../data/materialIcons'

const TABS = [
  { to: '/', label: '홈', icon: 'cottage' },
  { to: '/ranking', label: '랭킹', icon: 'leaderboard' },
  { to: '/purchase', label: '구매', icon: 'shopping_cart' },
  { to: '/family', label: '가족', icon: 'groups_2' },
  { to: '/collection', label: '컬렉션', icon: 'menu_book' },
]

export function AppLayout() {
  const navigate = useNavigate()
  const { items } = useLocker()
  const { seenIds } = useSeenNotifications()
  const unreadCount = getUpcomingNotifications(items, 7).filter(
    (item) => !seenIds.includes(`${item.id}:${item.restockedAt ?? item.createdAt}`)
  ).length

  return (
    <div className="h-dvh bg-surface-container-low">
      <div className="relative mx-auto flex h-full max-w-3xl flex-col bg-surface text-on-surface md:border-x-2 md:border-ink">
        <header className="flex items-center justify-between border-b-2 border-ink bg-surface-container-lowest px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container text-on-primary-container shadow-[0_3px_0px_#8b1901]">
              <Icon name="token" className="text-[20px]" />
            </div>
            <span className="font-heading text-lg text-primary">REMEMBUY</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="relative -m-2 ml-auto flex h-11 w-11 items-center justify-center rounded-full text-on-surface hover:text-primary"
            aria-label={unreadCount > 0 ? `알림, 새 알림 ${unreadCount}개` : '알림'}
          >
            <Icon name="notifications" className="text-[22px]" />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-surface-container-lowest" />
            )}
          </button>
        </header>
        <main className="flex-1 overflow-y-auto pb-20">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto grid max-w-3xl grid-cols-5 border-t-2 border-ink bg-surface-container-lowest pb-[env(safe-area-inset-bottom)] md:border-x-2">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-xs ${
                  isActive ? 'text-primary font-bold' : 'text-on-surface-variant'
                }`
              }
            >
              <Icon name={tab.icon} className="text-[22px]" />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
