import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { Staff, Session, Conflict } from '../types'
import { format, parseISO, isAfter, isBefore, startOfToday } from 'date-fns'

interface DashboardStats {
  totalStaff: number
  activeSessions: number
  upcomingSessions: number
  conflicts: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({ totalStaff: 0, activeSessions: 0, upcomingSessions: 0, conflicts: 0 })
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [recentSessions, setRecentSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [staffRes, seasonsRes] = await Promise.all([
          api.get<Staff[]>('/staff'),
          api.get<{ id: string; name: string; isActive: boolean }[]>('/schedule/seasons'),
        ])
        const activeSeason = seasonsRes.data.find(s => s.isActive)
        if (activeSeason) {
          const [scheduleRes, conflictsRes] = await Promise.all([
            api.get(`/schedule/season/${activeSeason.id}`),
            api.get<Conflict[]>(`/schedule/conflicts/${activeSeason.id}`),
          ])
          const allSessions: Session[] = scheduleRes.data.weeks.flatMap((w: { sessions: Session[] }) => w.sessions)
          const today = startOfToday()
          const active = allSessions.filter(s => !isBefore(parseISO(s.endDate), today) && !isAfter(parseISO(s.startDate), today))
          const upcoming = allSessions.filter(s => isAfter(parseISO(s.startDate), today))
          setStats({
            totalStaff: staffRes.data.filter(s => s.isActive).length,
            activeSessions: active.length,
            upcomingSessions: upcoming.length,
            conflicts: conflictsRes.data.length,
          })
          setConflicts(conflictsRes.data.slice(0, 5))
          setRecentSessions(upcoming.slice(0, 6))
        } else {
          setStats(s => ({ ...s, totalStaff: staffRes.data.filter(s => s.isActive).length }))
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 animate-pulse">Loading dashboard...</div>
      </div>
    )
  }

  const statCards = [
    { label: 'Active Staff', value: stats.totalStaff, icon: '👥', color: 'bg-blue-50 text-blue-600', link: '/staff' },
    { label: 'Active Sessions', value: stats.activeSessions, icon: '▶️', color: 'bg-green-50 text-green-600', link: '/schedule' },
    { label: 'Upcoming Sessions', value: stats.upcomingSessions, icon: '📅', color: 'bg-purple-50 text-purple-600', link: '/schedule' },
    { label: 'Scheduling Conflicts', value: stats.conflicts, icon: '⚠️', color: stats.conflicts > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500', link: '/schedule' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your camp operations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon, color, link }) => (
          <Link key={label} to={link} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${color} text-xl mb-3`}>
              {icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Upcoming Sessions</h2>
            <Link to="/schedule" className="text-brand text-sm hover:underline">View schedule →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentSessions.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">No upcoming sessions</div>
            ) : (
              recentSessions.map(session => (
                <div key={session.id} className="px-6 py-3 flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{session.program.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {session.city.name} · {session.location}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="text-xs font-medium text-gray-700">
                      {format(parseISO(session.startDate), 'MMM d')} – {format(parseISO(session.endDate), 'MMM d')}
                    </div>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
                      session.sessionType === 'AM' ? 'bg-green-100 text-green-700' :
                      session.sessionType === 'PM' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {session.sessionType === 'FULL_DAY' ? 'Full Day' : session.sessionType}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Conflicts */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Scheduling Conflicts</h2>
            {conflicts.length > 0 && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                {conflicts.length} found
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {conflicts.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <div className="text-2xl mb-2">✅</div>
                <div className="text-gray-500 text-sm">No conflicts detected</div>
              </div>
            ) : (
              conflicts.map((c, i) => (
                <div key={i} className="px-6 py-3">
                  <div className="text-sm font-medium text-red-600">{c.staffName}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {c.session1} conflicts with {c.session2}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
