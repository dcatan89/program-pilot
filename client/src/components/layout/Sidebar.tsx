import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/schedule', label: 'Schedule', icon: '📅' },
  { to: '/staff', label: 'Staff', icon: '👥' },
  { to: '/programs', label: 'Programs', icon: '🎯' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="w-60 min-h-screen bg-brand flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✈️</span>
          <div>
            <div className="text-white font-bold text-lg leading-tight">ProgramPilot</div>
            <div className="text-white/50 text-xs">Camp Management</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{user?.name}</div>
            <div className="text-white/50 text-xs capitalize">{user?.role?.toLowerCase()}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
