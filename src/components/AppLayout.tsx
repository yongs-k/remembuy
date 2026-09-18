import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications } from '../state/selectors'
import { useSeenNotifications } from '../hooks/useSeenNotifications'

const TABS = [
  { to: '/', label: '홈', icon: '🏠' },
  { to: '/ranking', label: '랭킹', icon: '🏆' },
  { to: '/purchase', label: '구매', icon: '🛒' },
  { to: '/family', label: '가족', icon: '👪' },
  { to: '/collection', label: '컬렉션', icon: '📔' },
]

export function AppLayout() {
  const navigate = useNavigate()
  const { items } = useLocker()
  const { seenIds } = useSeenNotifications()
  const unreadCount = getUpcomingNotifications(items, 7).filter(
    (item) => !seenIds.includes(item.id)
  ).length

  return (
    <div className="flex h-dvh bg-paper text-ink md:mx-auto md:max-w-[820px]">
      <nav className="hidden w-56 flex-col gap-1 border-r-2 border-ink bg-card p-4 md:flex">
        <span className="mb-4 font-heading text-lg">REMEMBUY</span>
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm ${
                isActive
                  ? 'border-ink bg-stamp text-white shadow-chunky'
                  : 'border-transparent text-ink/70'
              }`
            }
          >
            <span>{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b-2 border-ink bg-card px-4 py-3">
          <span className="font-heading text-lg md:hidden">REMEMBUY</span>
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="relative ml-auto text-xl"
            aria-label="알림"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-stamp" />
            )}
          </button>
        </header>
        <main className="flex-1 overflow-y-auto pb-20 md:pb-4">
          <div className="mx-auto w-full max-w-3xl">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t-2 border-ink bg-card md:hidden">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-xs ${
                isActive ? 'text-stamp' : 'text-ink/60'
              }`
            }
          >
            <span>{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
