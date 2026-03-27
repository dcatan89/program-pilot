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

interface SessionRow {
  id: string
  location: string
  city: { id: string; name: string; color: string }
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  sessionType: 'AM' | 'PM' | 'FULL_DAY'
  className?: string
  noClassDates: string[]
  assignments: { staff: { id: string; name: string }; isPrimary: boolean }[]
}

interface ProgramWithSessions {
  id: string
  name: string
  seasonId: string
  sessions: SessionRow[]
}

interface ExternalProgram {
  id: string
  name: string
  startDate: string
  endDate: string
  color: string
  notes?: string
}

interface Conflict {
  staffName: string
  session1: string
  session2: string
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

const EXTERNAL_EMPTY = { name: '', startDate: '', endDate: '', color: '#F97316', notes: '' }

export default function Programs() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState('')
  const [programs, setPrograms] = useState<ProgramWithSessions[]>([])
  const [cities, setCities] = useState<{ id: string; name: string; color: string }[]>([])
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([])
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'programs' | 'external'>('programs')

  // Session form (shared for add + edit)
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [sessionProgramId, setSessionProgramId] = useState('')
  const [sessionForm, setSessionForm] = useState(SESSION_EMPTY)
  const [savingSession, setSavingSession] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [noClassDates, setNoClassDates] = useState<string[]>([])
  const [newNoClassDate, setNewNoClassDate] = useState('')

  // Program form
  const [showProgramForm, setShowProgramForm] = useState(false)
  const [programName, setProgramName] = useState('')
  const [savingProgram, setSavingProgram] = useState(false)
  const [editingProgram, setEditingProgram] = useState<{ id: string; name: string } | null>(null)

  // Season modal
  const [showSeasonModal, setShowSeasonModal] = useState(false)
  const [editingSeason, setEditingSeason] = useState<Season | null>(null)
  const [seasonForm, setSeasonForm] = useState({ name: '', year: new Date().getFullYear(), isActive: true })
  const [savingSeason, setSavingSeason] = useState(false)

  // Staff assignment modal
  const [assignSessionId, setAssignSessionId] = useState<string | null>(null)
  const [assignedStaff, setAssignedStaff] = useState<string[]>([])

  // External programs
  const [externals, setExternals] = useState<ExternalProgram[]>([])
  const [showExternalModal, setShowExternalModal] = useState(false)
  const [editingExternal, setEditingExternal] = useState<ExternalProgram | null>(null)
  const [externalForm, setExternalForm] = useState(EXTERNAL_EMPTY)
  const [savingExternal, setSavingExternal] = useState(false)

  const loadData = async (seasonId: string) => {
    setLoading(true)
    const [prRes, ctRes, stRes, cfRes] = await Promise.all([
      api.get<ProgramWithSessions[]>(`/schedule/programs/${seasonId}`),
      api.get<{ id: string; name: string; color: string }[]>('/cities'),
      api.get<{ id: string; name: string }[]>('/staff'),
      api.get<Conflict[]>(`/schedule/conflicts/${seasonId}`),
    ])
    setPrograms(prRes.data)
    setCities(ctRes.data)
    setStaff(stRes.data)
    setConflicts(cfRes.data)
    setLoading(false)
  }

  const loadSeasons = async () => {
    const r = await api.get<Season[]>('/schedule/seasons')
    setSeasons(r.data)
    return r.data
  }

  const loadExternals = async () => {
    const r = await api.get<ExternalProgram[]>('/schedule/external')
    setExternals(r.data)
  }

  useEffect(() => {
    loadSeasons().then(list => {
      const active = list.find(s => s.isActive)
      if (active) { setSelectedSeason(active.id); loadData(active.id) }
    })
    loadExternals()
  }, [])

  const handleSeasonChange = (id: string) => {
    setSelectedSeason(id)
    if (id) loadData(id)
    else { setPrograms([]); setConflicts([]) }
  }

  // --- Season handlers ---
  const openCreateSeason = () => {
    setEditingSeason(null)
    setSeasonForm({ name: '', year: new Date().getFullYear(), isActive: true })
    setShowSeasonModal(true)
  }
  const openEditSeason = (s: Season) => {
    setEditingSeason(s)
    setSeasonForm({ name: s.name, year: s.year, isActive: s.isActive })
    setShowSeasonModal(true)
  }
  const handleSaveSeason = async () => {
    if (!seasonForm.name.trim()) return
    setSavingSeason(true)
    if (editingSeason) {
      await api.put(`/schedule/seasons/${editingSeason.id}`, seasonForm)
    } else {
      const r = await api.post<Season>('/schedule/seasons', seasonForm)
      setSelectedSeason(r.data.id)
      loadData(r.data.id)
    }
    setSavingSeason(false)
    setShowSeasonModal(false)
    loadSeasons()
  }
  const handleDeleteSeason = async (id: string) => {
    if (!confirm('Delete this season and all its programs/sessions?')) return
    await api.delete(`/schedule/seasons/${id}`)
    const list = await loadSeasons()
    const next = list.find(s => s.id !== id && s.isActive) ?? list[0]
    if (next) { setSelectedSeason(next.id); loadData(next.id) }
    else { setSelectedSeason(''); setPrograms([]); setConflicts([]) }
  }

  // --- Program handlers ---
  const handleAddProgram = async () => {
    if (!programName.trim()) return
    setSavingProgram(true)
    await api.post('/schedule/programs', { name: programName, seasonId: selectedSeason })
    setSavingProgram(false)
    setShowProgramForm(false)
    setProgramName('')
    loadData(selectedSeason)
  }
  const handleEditProgram = async () => {
    if (!editingProgram || !programName.trim()) return
    setSavingProgram(true)
    await api.put(`/schedule/programs/${editingProgram.id}`, { name: programName })
    setSavingProgram(false)
    setEditingProgram(null)
    setProgramName('')
    loadData(selectedSeason)
  }
  const handleDeleteProgram = async (id: string) => {
    if (!confirm('Delete this program and all its sessions?')) return
    await api.delete(`/schedule/programs/${id}`)
    loadData(selectedSeason)
  }

  // --- Session handlers ---
  const openAddSession = (programId: string) => {
    setEditingSessionId(null)
    setSessionProgramId(programId)
    setSessionForm(SESSION_EMPTY)
    setNoClassDates([])
    setNewNoClassDate('')
    setShowSessionForm(true)
  }
  const openEditSession = (s: SessionRow, programId: string) => {
    setEditingSessionId(s.id)
    setSessionProgramId(programId)
    setSessionForm({
      cityId: s.city.id,
      location: s.location,
      startDate: s.startDate.slice(0, 10),
      endDate: s.endDate.slice(0, 10),
      startTime: s.startTime,
      endTime: s.endTime,
      sessionType: s.sessionType,
      className: s.className ?? '',
    })
    setNoClassDates(s.noClassDates.map(d => d.slice(0, 10)))
    setNewNoClassDate('')
    setShowSessionForm(true)
  }
  const handleSaveSession = async () => {
    if (!sessionForm.cityId || !sessionForm.location || !sessionForm.startDate || !sessionForm.endDate) return
    setSavingSession(true)
    if (editingSessionId) {
      await api.put(`/schedule/sessions/${editingSessionId}`, {
        ...sessionForm,
        noClassDates,
      })
    } else {
      await api.post('/schedule/sessions', { ...sessionForm, programId: sessionProgramId })
    }
    setSavingSession(false)
    setShowSessionForm(false)
    setSessionForm(SESSION_EMPTY)
    setEditingSessionId(null)
    loadData(selectedSeason)
  }
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Delete this session?')) return
    await api.delete(`/schedule/sessions/${sessionId}`)
    loadData(selectedSeason)
  }

  // --- Staff assignment handlers ---
  const openAssignModal = (s: SessionRow) => {
    setAssignSessionId(s.id)
    setAssignedStaff(s.assignments.map(a => a.staff.id))
  }
  const handleToggleStaff = async (staffId: string) => {
    if (!assignSessionId) return
    if (assignedStaff.includes(staffId)) {
      await api.delete(`/schedule/assign/${staffId}/${assignSessionId}`)
      setAssignedStaff(prev => prev.filter(id => id !== staffId))
    } else {
      await api.post('/schedule/assign', { staffId, sessionId: assignSessionId, isPrimary: assignedStaff.length === 0 })
      setAssignedStaff(prev => [...prev, staffId])
    }
    loadData(selectedSeason)
  }

  // --- External program handlers ---
  const openAddExternal = () => {
    setEditingExternal(null)
    setExternalForm(EXTERNAL_EMPTY)
    setShowExternalModal(true)
  }
  const openEditExternal = (ext: ExternalProgram) => {
    setEditingExternal(ext)
    setExternalForm({ name: ext.name, startDate: ext.startDate.slice(0, 10), endDate: ext.endDate.slice(0, 10), color: ext.color, notes: ext.notes ?? '' })
    setShowExternalModal(true)
  }
  const handleSaveExternal = async () => {
    if (!externalForm.name.trim() || !externalForm.startDate || !externalForm.endDate) return
    setSavingExternal(true)
    if (editingExternal) {
      await api.put(`/schedule/external/${editingExternal.id}`, externalForm)
    } else {
      await api.post('/schedule/external', externalForm)
    }
    setSavingExternal(false)
    setShowExternalModal(false)
    loadExternals()
  }
  const handleDeleteExternal = async (id: string) => {
    if (!confirm('Delete this external program?')) return
    await api.delete(`/schedule/external/${id}`)
    loadExternals()
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
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
          <button
            onClick={openCreateSeason}
            className="border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
          >
            Manage Seasons
          </button>
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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['programs', 'external'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab === 'programs' ? 'Programs' : 'External Programs'}
          </button>
        ))}
      </div>

      {/* Programs Tab */}
      {activeTab === 'programs' && (
        <>
          {/* Conflicts banner */}
          {conflicts.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              <strong className="font-semibold">{conflicts.length} scheduling conflict{conflicts.length > 1 ? 's' : ''}:</strong>
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                {conflicts.map((c, i) => (
                  <li key={i}>{c.staffName}: {c.session1} overlaps with {c.session2}</li>
                ))}
              </ul>
            </div>
          )}

          {loading && <div className="text-gray-400 animate-pulse py-8 text-center">Loading...</div>}

          {!loading && programs.length === 0 && selectedSeason && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-3xl mb-3">🎯</div>
              <div>No programs yet. Add your first program for this season.</div>
            </div>
          )}

          {!selectedSeason && !loading && (
            <div className="text-center py-16 text-gray-400">Select a season to view programs.</div>
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); openAddSession(program.id) }}
                      className="text-xs bg-brand-muted text-brand px-3 py-1.5 rounded-lg font-medium hover:bg-brand/10 transition"
                    >
                      + Session
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setEditingProgram(program); setProgramName(program.name) }}
                      className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteProgram(program.id) }}
                      className="text-xs text-gray-300 hover:text-red-400 px-2 py-1.5 rounded transition"
                    >
                      Delete
                    </button>
                    <span className="text-gray-400 ml-1">{expanded === program.id ? '▲' : '▼'}</span>
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
                              <td className="px-5 py-3 text-gray-700">
                                <div>{s.location}</div>
                                {s.className && <div className="text-xs text-gray-400">{s.className}</div>}
                              </td>
                              <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                                <div>{format(parseISO(s.startDate), 'MMM d')} – {format(parseISO(s.endDate), 'MMM d')}</div>
                                {s.noClassDates.length > 0 && (
                                  <div className="text-xs text-orange-400">{s.noClassDates.length} no-class day{s.noClassDates.length > 1 ? 's' : ''}</div>
                                )}
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
                                  s.assignments.map(a => (
                                    <span key={a.staff.id} className={clsx('mr-1', a.isPrimary && 'font-medium')}>{a.staff.name}</span>
                                  ))
                                )}
                              </td>
                              <td className="px-5 py-3 whitespace-nowrap">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => openEditSession(s, program.id)}
                                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => openAssignModal(s)}
                                    className="text-xs text-brand hover:text-brand-light transition-colors"
                                  >
                                    Assign
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSession(s.id)}
                                    className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
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
        </>
      )}

      {/* External Programs Tab */}
      {activeTab === 'external' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={openAddExternal}
              className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-light transition"
            >
              + Add External
            </button>
          </div>
          {externals.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-3xl mb-3">📅</div>
              <div>No external programs yet.</div>
            </div>
          )}
          <div className="space-y-3">
            {externals.map(ext => (
              <div key={ext.id} className="bg-white rounded-xl border border-gray-200 shadow-sm flex overflow-hidden">
                <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: ext.color }} />
                <div className="flex-1 px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-gray-800">{ext.name}</div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {format(parseISO(ext.startDate), 'MMM d, yyyy')} – {format(parseISO(ext.endDate), 'MMM d, yyyy')}
                      </div>
                      {ext.notes && <div className="text-xs text-gray-400 mt-1">{ext.notes}</div>}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button onClick={() => openEditExternal(ext)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Edit</button>
                      <button onClick={() => handleDeleteExternal(ext.id)} className="text-xs text-gray-300 hover:text-red-400 transition-colors">Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manage Seasons Modal */}
      {showSeasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-4">
              {editingSeason ? 'Edit Season' : 'New Season'}
            </h3>
            {/* Season list for management */}
            {!editingSeason && seasons.length > 0 && (
              <div className="mb-5">
                <div className="text-sm font-medium text-gray-600 mb-2">Existing Seasons</div>
                <div className="space-y-2">
                  {seasons.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50">
                      <div className="text-sm text-gray-700">
                        {s.name} <span className="text-gray-400">({s.year})</span>
                        {s.isActive && <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Active</span>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEditSeason(s)} className="text-xs text-gray-400 hover:text-gray-600">Edit</button>
                        <button onClick={() => handleDeleteSeason(s.id)} className="text-xs text-gray-300 hover:text-red-400">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 my-4" />
                <div className="text-sm font-medium text-gray-600 mb-2">Create New Season</div>
              </div>
            )}
            <div className="space-y-3">
              <input
                type="text"
                value={seasonForm.name}
                onChange={e => setSeasonForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Season name (e.g. Summer 2027)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                autoFocus
              />
              <input
                type="number"
                value={seasonForm.year}
                onChange={e => setSeasonForm(f => ({ ...f, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                placeholder="Year"
              />
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seasonForm.isActive}
                  onChange={e => setSeasonForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="rounded"
                />
                Active season
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSaveSeason}
                disabled={savingSeason}
                className="flex-1 bg-brand text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-light transition disabled:opacity-60"
              >
                {savingSeason ? 'Saving...' : editingSeason ? 'Save Changes' : 'Create Season'}
              </button>
              <button onClick={() => { setShowSeasonModal(false); setEditingSeason(null) }} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Program Modal */}
      {(showProgramForm || editingProgram) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-4">{editingProgram ? 'Rename Program' : 'New Program'}</h3>
            <input
              type="text"
              value={programName}
              onChange={e => setProgramName(e.target.value)}
              placeholder="Program name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand-light"
              onKeyDown={e => e.key === 'Enter' && (editingProgram ? handleEditProgram() : handleAddProgram())}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={editingProgram ? handleEditProgram : handleAddProgram}
                disabled={savingProgram}
                className="flex-1 bg-brand text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-light transition disabled:opacity-60"
              >
                {savingProgram ? 'Saving...' : editingProgram ? 'Save' : 'Add Program'}
              </button>
              <button onClick={() => { setShowProgramForm(false); setEditingProgram(null); setProgramName('') }} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Session Modal */}
      {showSessionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-y-auto max-h-[90vh]">
            <h3 className="font-bold text-gray-800 text-lg mb-4">{editingSessionId ? 'Edit Session' : 'Add Session'}</h3>
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

              {/* No-class dates section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No-Class Dates</label>
                {noClassDates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {noClassDates.map(d => (
                      <span key={d} className="inline-flex items-center gap-1 text-xs bg-orange-50 border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full">
                        {format(parseISO(d), 'MMM d')}
                        <button
                          type="button"
                          onClick={() => setNoClassDates(prev => prev.filter(x => x !== d))}
                          className="ml-0.5 hover:text-red-500"
                        >×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newNoClassDate}
                    onChange={e => setNewNoClassDate(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newNoClassDate && !noClassDates.includes(newNoClassDate)) {
                        setNoClassDates(prev => [...prev, newNoClassDate].sort())
                        setNewNoClassDate('')
                      }
                    }}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSaveSession}
                disabled={savingSession}
                className="flex-1 bg-brand text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-light transition disabled:opacity-60"
              >
                {savingSession ? 'Saving...' : editingSessionId ? 'Save Changes' : 'Add Session'}
              </button>
              <button onClick={() => { setShowSessionForm(false); setEditingSessionId(null) }} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Assignment Modal */}
      {assignSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-1">Assign Staff</h3>
            <p className="text-xs text-gray-400 mb-4">First selected staff member is set as primary.</p>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {staff.map(s => (
                <label key={s.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignedStaff.includes(s.id)}
                    onChange={() => handleToggleStaff(s.id)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">
                    {s.name}
                    {assignedStaff[0] === s.id && <span className="ml-2 text-xs text-brand font-medium">Primary</span>}
                  </span>
                </label>
              ))}
            </div>
            <button
              onClick={() => setAssignSessionId(null)}
              className="mt-4 w-full py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* External Program Modal */}
      {showExternalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-4">{editingExternal ? 'Edit External Program' : 'Add External Program'}</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={externalForm.name}
                onChange={e => setExternalForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Program name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                  <input type="date" value={externalForm.startDate} onChange={e => setExternalForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                  <input type="date" value={externalForm.endDate} onChange={e => setExternalForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={externalForm.color} onChange={e => setExternalForm(f => ({ ...f, color: e.target.value }))}
                    className="w-10 h-9 rounded border border-gray-300 cursor-pointer" />
                  <span className="text-sm text-gray-500">{externalForm.color}</span>
                </div>
              </div>
              <textarea
                value={externalForm.notes}
                onChange={e => setExternalForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notes (optional)"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light resize-none"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSaveExternal}
                disabled={savingExternal}
                className="flex-1 bg-brand text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-light transition disabled:opacity-60"
              >
                {savingExternal ? 'Saving...' : editingExternal ? 'Save Changes' : 'Add Program'}
              </button>
              <button onClick={() => setShowExternalModal(false)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
