import { useEffect, useState } from 'react'
import api from '../api/client'
import { format, parseISO } from 'date-fns'
import clsx from 'clsx'

interface Season {
  id: string
  name: string
  year: number
  isActive: boolean
}

interface ProgramWithSessions {
  id: string
  name: string
  seasonId: string
  sessions: {
    id: string
    location: string
    city: { name: string; color: string }
    startDate: string
    endDate: string
    startTime: string
    endTime: string
    sessionType: 'AM' | 'PM' | 'FULL_DAY'
    className?: string
    assignments: { staff: { id: string; name: string }; isPrimary: boolean }[]
  }[]
}

const SESSION_EMPTY = {
  cityId: '',
  location: '',
  startDate: '',
  endDate: '',
  startTime: '09:00',
  endTime: '12:00',
  sessionType: 'AM' as 'AM' | 'PM' | 'FULL_DAY',
  className: '',
}

export default function Programs() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState('')
  const [programs, setPrograms] = useState<ProgramWithSessions[]>([])
  const [cities, setCities] = useState<{ id: string; name: string; color: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Session form
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [sessionProgramId, setSessionProgramId] = useState('')
  const [sessionForm, setSessionForm] = useState(SESSION_EMPTY)
  const [savingSession, setSavingSession] = useState(false)

  // Program form
  const [showProgramForm, setShowProgramForm] = useState(false)
  const [programName, setProgramName] = useState('')
  const [savingProgram, setSavingProgram] = useState(false)

  const loadData = async (seasonId: string) => {
    setLoading(true)
    const [prRes, ctRes] = await Promise.all([
      api.get<ProgramWithSessions[]>(`/schedule/programs/${seasonId}`),
      api.get<{ id: string; name: string; color: string }[]>('/cities'),
    ])
    setPrograms(prRes.data)
    setCities(ctRes.data)
    setLoading(false)
  }

  useEffect(() => {
    api.get<Season[]>('/schedule/seasons').then(r => {
      setSeasons(r.data)
      const active = r.data.find(s => s.isActive)
      if (active) { setSelectedSeason(active.id); loadData(active.id) }
    })
  }, [])

  const handleSeasonChange = (id: string) => {
    setSelectedSeason(id)
    if (id) loadData(id)
    else setPrograms([])
  }

  const handleAddSession = async () => {
    if (!sessionForm.cityId || !sessionForm.location || !sessionForm.startDate || !sessionForm.endDate) return
    setSavingSession(true)
    await api.post('/schedule/sessions', { ...sessionForm, programId: sessionProgramId })
    setSavingSession(false)
    setShowSessionForm(false)
    setSessionForm(SESSION_EMPTY)
    loadData(selectedSeason)
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Delete this session?')) return
    await api.delete(`/schedule/sessions/${sessionId}`)
    loadData(selectedSeason)
  }

  const handleAddProgram = async () => {
    if (!programName.trim()) return
    setSavingProgram(true)
    await api.post('/schedule/programs', { name: programName, seasonId: selectedSeason })
    setSavingProgram(false)
    setShowProgramForm(false)
    setProgramName('')
    loadData(selectedSeason)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programs</h1>
          <p className="text-gray-500 text-sm mt-1">Manage programs and their sessions</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedSeason}
            onChange={e => handleSeasonChange(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
          >
            <option value="">Select season...</option>
            {seasons.map(s => (
              <option key={s.id} value={s.id}>{s.name}{s.isActive ? ' (Active)' : ''}</option>
            ))}
          </select>
          {selectedSeason && (
            <button
              onClick={() => setShowProgramForm(true)}
              className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-light transition"
            >
              + Program
            </button>
          )}
        </div>
      </div>

      {loading && <div className="text-gray-400 animate-pulse py-8 text-center">Loading...</div>}

      {!loading && programs.length === 0 && selectedSeason && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-3xl mb-3">🎯</div>
          <div>No programs yet. Add your first program for this season.</div>
        </div>
      )}

      <div className="space-y-4">
        {programs.map(program => (
          <div key={program.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              onClick={() => setExpanded(expanded === program.id ? null : program.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🎯</span>
                <div className="text-left">
                  <div className="font-semibold text-gray-800">{program.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{program.sessions.length} session{program.sessions.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={e => {
                    e.stopPropagation()
                    setSessionProgramId(program.id)
                    setSessionForm(SESSION_EMPTY)
                    setShowSessionForm(true)
                  }}
                  className="text-xs bg-brand-muted text-brand px-3 py-1.5 rounded-lg font-medium hover:bg-brand/10 transition"
                >
                  + Session
                </button>
                <span className="text-gray-400">{expanded === program.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {expanded === program.id && (
              <div className="border-t border-gray-100">
                {program.sessions.length === 0 ? (
                  <div className="px-6 py-6 text-center text-gray-400 text-sm">No sessions yet</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">City</th>
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Location</th>
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Dates</th>
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Time</th>
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Type</th>
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Staff</th>
                        <th className="px-5 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {program.sessions.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full border font-medium"
                              style={{ backgroundColor: s.city.color + '22', borderColor: s.city.color, color: s.city.color }}
                            >
                              {s.city.name}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-700">{s.location}</td>
                          <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                            {format(parseISO(s.startDate), 'MMM d')} – {format(parseISO(s.endDate), 'MMM d')}
                          </td>
                          <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{s.startTime} – {s.endTime}</td>
                          <td className="px-5 py-3">
                            <span className={clsx(
                              'text-xs px-2 py-0.5 rounded-full font-medium',
                              s.sessionType === 'AM' ? 'bg-green-100 text-green-700' :
                              s.sessionType === 'PM' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            )}>
                              {s.sessionType === 'FULL_DAY' ? 'Full Day' : s.sessionType}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {s.assignments.length === 0 ? (
                              <span className="text-gray-300">Unassigned</span>
                            ) : (
                              s.assignments.map(a => a.staff.name).join(', ')
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => handleDeleteSession(s.id)}
                              className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Program Modal */}
      {showProgramForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-4">New Program</h3>
            <input
              type="text"
              value={programName}
              onChange={e => setProgramName(e.target.value)}
              placeholder="Program name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand-light"
              onKeyDown={e => e.key === 'Enter' && handleAddProgram()}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleAddProgram}
                disabled={savingProgram}
                className="flex-1 bg-brand text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-light transition disabled:opacity-60"
              >
                {savingProgram ? 'Adding...' : 'Add Program'}
              </button>
              <button onClick={() => setShowProgramForm(false)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Session Modal */}
      {showSessionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-y-auto max-h-[90vh]">
            <h3 className="font-bold text-gray-800 text-lg mb-4">Add Session</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <select
                  value={sessionForm.cityId}
                  onChange={e => setSessionForm(f => ({ ...f, cityId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                >
                  <option value="">Select city...</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location / School *</label>
                <input
                  type="text"
                  value={sessionForm.location}
                  onChange={e => setSessionForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                  placeholder="e.g. Westwood Elementary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name (optional)</label>
                <input
                  type="text"
                  value={sessionForm.className}
                  onChange={e => setSessionForm(f => ({ ...f, className: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                  placeholder="e.g. Lego Robotics"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input type="date" value={sessionForm.startDate} onChange={e => setSessionForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <input type="date" value={sessionForm.endDate} onChange={e => setSessionForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input type="time" value={sessionForm.startTime} onChange={e => setSessionForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input type="time" value={sessionForm.endTime} onChange={e => setSessionForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session Type</label>
                <div className="flex gap-2">
                  {(['AM', 'PM', 'FULL_DAY'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSessionForm(f => ({ ...f, sessionType: type }))}
                      className={clsx(
                        'flex-1 py-2 rounded-lg text-sm font-medium border transition',
                        sessionForm.sessionType === type
                          ? type === 'AM' ? 'bg-green-500 text-white border-green-500'
                            : type === 'PM' ? 'bg-yellow-500 text-white border-yellow-500'
                            : 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {type === 'FULL_DAY' ? 'Full Day' : type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleAddSession}
                disabled={savingSession}
                className="flex-1 bg-brand text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-light transition disabled:opacity-60"
              >
                {savingSession ? 'Adding...' : 'Add Session'}
              </button>
              <button onClick={() => setShowSessionForm(false)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
