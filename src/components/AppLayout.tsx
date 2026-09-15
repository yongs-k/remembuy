import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useLocker } from '../state/LockerContext'
import { getUpcomingNotifications } from '../state/selectors'
import { useSeenNotifications } from '../hooks/useSeenNotifications'

const TABS = [
  { to: '/', label: '홈', icon: '🏠' },
  { to: '/ranking', label: '랭킹', icon: '🏆' },
  { to: '/feed', label: '공유', icon: '👥' },
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
    <div
      className="relative mx-auto flex h-screen w-full max-w-md flex-col overflow-hidden bg-paper shadow-2xl
        sm:my-8 sm:h-[844px] sm:max-h-[85vh] sm:w-[390px] sm:max-w-none sm:rounded-[3rem] sm:border-[10px] sm:border-ink"
    >
      <div className="absolute left-1/2 top-2 z-20 hidden h-7 w-32 -translate-x-1/2 rounded-full bg-ink sm:block" />

      <header className="flex items-center justify-between border-b border-ink/10 bg-card px-4 py-3 sm:pt-6">
        <span className="font-heading text-lg">REMEMBUY</span>
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="relative text-xl"
          aria-label="알림"
        >
          🔔
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-stamp" />
          )}
        </button>
      </header>
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="absolute inset-x-0 bottom-0 grid grid-cols-5 border-t border-ink/10 bg-card">
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

      <div className="absolute bottom-1 left-1/2 z-20 hidden h-1 w-32 -translate-x-1/2 rounded-full bg-ink/70 sm:block" />
    </div>
  )
}
