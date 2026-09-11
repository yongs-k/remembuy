import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/', label: '홈', icon: '🏠' },
  { to: '/ranking', label: '랭킹', icon: '🏆' },
  { to: '/notifications', label: '알림', icon: '🔔' },
  { to: '/feed', label: '공유', icon: '👥' },
  { to: '/family', label: '가족', icon: '👪' },
  { to: '/collection', label: '컬렉션', icon: '📔' },
]

export function AppLayout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-paper">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-1/2 grid w-full max-w-md -translate-x-1/2 grid-cols-6 border-t border-ink/10 bg-card">
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
