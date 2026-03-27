import { useEffect, useState, Fragment } from 'react'
import api from '../api/client'
import { ScheduleData, Session, Staff, ExternalProgram, City } from '../types'
import { format, parseISO } from 'date-fns'
import clsx from 'clsx'

interface Season {
  id: string
  name: string
  isActive: boolean
}

function SessionCard({
  session,
  staff,
  onAssign,
  onRemoveAssign,
}: {
  session: Session
  staff: Staff[]
  onAssign: (sessionId: string, staffId: string, isPrimary: boolean) => void
  onRemoveAssign: (staffId: string, sessionId: string) => void
}) {
  const [showAssign, setShowAssign] = useState(false)
  const assigned = session.assignments ?? []

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 text-xs shadow-sm">
      <div className="font-semibold text-brand truncate">{session.program.name}</div>
      {session.className && <div className="text-gray-400 truncate">{session.className}</div>}
      <div className="text-gray-500 mt-1">{session.startTime} – {session.endTime}</div>

      {/* Assignments */}
      <div className="mt-2 space-y-1">
        {assigned.map(({ staff: s, isPrimary }) => (
          <div key={s.id} className="flex items-center justify-between gap-1">
            <span className={clsx('truncate', isPrimary ? 'font-medium text-brand' : 'text-gray-600')}>
              {isPrimary ? '★ ' : ''}{s.name}
            </span>
            <button
              onClick={() => onRemoveAssign(s.id, session.id)}
              className="text-gray-300 hover:text-red-400 text-xs shrink-0"
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Assign button */}
      {showAssign ? (
        <div className="mt-2">
          <select
            className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs"
            defaultValue=""
            onChange={e => {
              if (e.target.value) {
                const hasPrimary = assigned.some(a => a.isPrimary)
                onAssign(session.id, e.target.value, !hasPrimary)
                setShowAssign(false)
              }
            }}
          >
            <option value="">Select staff...</option>
            {staff
              .filter(s => s.isActive && !assigned.find(a => a.staff.id === s.id))
              .filter(s => s.clearedCities.some(c => c.city.id === session.cityId))
              .map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
          </select>
          <button
            onClick={() => setShowAssign(false)}
            className="text-gray-400 hover:text-gray-600 mt-1 text-xs"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAssign(true)}
          className="mt-2 w-full text-center text-xs text-brand-light hover:text-brand border border-dashed border-brand-light hover:border-brand rounded py-1 transition-colors"
        >
          + Assign
        </button>
      )}
    </div>
  )
}

export default function Schedule() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null)
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get<Season[]>('/schedule/seasons'),
      api.get<City[]>('/cities'),
    ]).then(([s, c]) => {
      setSeasons(s.data)
      setCities(c.data)
      const active = s.data.find(x => x.isActive)
      if (active) setSelectedSeason(active.id)
    })
  }, [])

  useEffect(() => {
    if (!selectedSeason) return
    setLoading(true)
    setError('')
    api.get<ScheduleData>(`/schedule/season/${selectedSeason}`)
      .then(r => setScheduleData(r.data))
      .catch(() => setError('Failed to load schedule'))
      .finally(() => setLoading(false))
  }, [selectedSeason])

  const handleAssign = async (sessionId: string, staffId: string, isPrimary: boolean) => {
    await api.post('/schedule/assign', { sessionId, staffId, isPrimary })
    // Refresh
    const r = await api.get<ScheduleData>(`/schedule/season/${selectedSeason}`)
    setScheduleData(r.data)
  }

  const handleRemoveAssign = async (staffId: string, sessionId: string) => {
    await api.delete(`/schedule/assign/${staffId}/${sessionId}`)
    const r = await api.get<ScheduleData>(`/schedule/season/${selectedSeason}`)
    setScheduleData(r.data)
  }

  // Determine which cities are active in this season
  const activeCityIds = new Set<string>()
  scheduleData?.weeks.forEach(w => w.sessions.forEach(s => activeCityIds.add(s.cityId)))
  const activeCities = cities.filter(c => activeCityIds.has(c.id))

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-500 text-sm mt-1">Weekly staff assignment grid</p>
        </div>
        <select
          value={selectedSeason}
          onChange={e => setSelectedSeason(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
        >
          <option value="">Select season...</option>
          {seasons.map(s => (
            <option key={s.id} value={s.id}>{s.name}{s.isActive ? ' (Active)' : ''}</option>
          ))}
        </select>
      </div>

      {error && <div className="bg-red-50 text-red-600 rounded-lg px-4 py-3 mb-6 text-sm">{error}</div>}

      {loading && (
        <div className="text-center py-16 text-gray-400 animate-pulse">Loading schedule...</div>
      )}

      {!loading && scheduleData && (
        <>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mb-6 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-orange-200 border border-orange-300" />
              <span>NMUSD Overlap</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
              <span>No sessions</span>
            </div>
            {activeCities.map(city => (
              <div key={city.id} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border" style={{ backgroundColor: city.color + '33', borderColor: city.color }} />
                <span>{city.name}</span>
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-brand text-white">
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap w-36">Week</th>
                  {activeCities.map(city => (
                    <th
                      key={city.id}
                      className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                    >
                      {city.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scheduleData.weeks.map((week, wi) => {
                  const isNmusdOverlap = scheduleData.externalPrograms.some(ep => {
                    const epStart = parseISO(ep.startDate)
                    const epEnd = parseISO(ep.endDate)
                    const wkStart = parseISO(week.startDate)
                    const wkEnd = parseISO(week.endDate)
                    return epStart <= wkEnd && epEnd >= wkStart
                  })

                  return (
                    <tr
                      key={week.startDate}
                      className={clsx(
                        'border-t border-gray-100 align-top',
                        wi % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      )}
                    >
                      {/* Week label */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-gray-800 text-xs">
                          Week {wi + 1}
                        </div>
                        <div className="text-gray-400 text-xs mt-0.5">
                          {format(parseISO(week.startDate), 'MMM d')} –{' '}
                          {format(parseISO(week.endDate), 'MMM d')}
                        </div>
                        {isNmusdOverlap && (
                          <span className="inline-block mt-1 text-xs bg-orange-100 text-orange-600 border border-orange-200 rounded px-1.5 py-0.5 font-medium">
                            NMUSD
                          </span>
                        )}
                      </td>

                      {/* City columns */}
                      {activeCities.map(city => {
                        const citySessions = week.sessions.filter(s => s.cityId === city.id)
                        const rowBg = isNmusdOverlap ? 'bg-orange-50/30' : ''

                        return (
                          <td
                            key={city.id}
                            className={clsx('px-3 py-3 align-top min-w-[180px]', rowBg)}
                          >
                            {citySessions.length === 0 ? (
                              <div className="h-12 rounded-lg bg-gray-100/60 border border-dashed border-gray-200" />
                            ) : (
                              <div className="space-y-2">
                                {citySessions.map(session => (
                                  <SessionCard
                                    key={session.id}
                                    session={session}
                                    staff={scheduleData.staff}
                                    onAssign={handleAssign}
                                    onRemoveAssign={handleRemoveAssign}
                                  />
                                ))}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* External Programs */}
          {scheduleData.externalPrograms.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-700 mb-3 text-sm">External Programs</h3>
              <div className="flex flex-wrap gap-3">
                {scheduleData.externalPrograms.map((ep: ExternalProgram) => (
                  <div
                    key={ep.id}
                    className="bg-white border rounded-lg px-4 py-3 text-sm shadow-sm"
                    style={{ borderLeftWidth: 3, borderLeftColor: ep.color }}
                  >
                    <div className="font-medium text-gray-800">{ep.name}</div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      {format(parseISO(ep.startDate), 'MMM d')} – {format(parseISO(ep.endDate), 'MMM d, yyyy')}
                    </div>
                    {ep.notes && <div className="text-gray-400 text-xs mt-1">{ep.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !scheduleData && !error && selectedSeason && (
        <div className="text-center py-16 text-gray-400">No schedule data available for this season.</div>
      )}
    </div>
  )
}
