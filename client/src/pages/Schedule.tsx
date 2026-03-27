import { useEffect, useState } from 'react'
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, addWeeks, addMonths, subWeeks, subMonths, eachDayOfInterval, isSameDay, parseISO
} from 'date-fns'
import api from '../api/client'
import { Staff, City, Shift } from '../types'
import clsx from 'clsx'

type ViewMode = 'week' | '2weeks' | 'month'

// ---------- Shift Modal ----------
function ShiftModal({
  shift, staff, cities, prefillStaffId, prefillDate, onSave, onDelete, onClose,
}: {
  shift: Shift | null
  staff: Staff[]
  cities: City[]
  prefillStaffId: string
  prefillDate: Date
  onSave: (data: Partial<Shift>) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}) {
  const [staffId, setStaffId] = useState(shift?.staffId ?? prefillStaffId)
  const [cityId, setCityId] = useState(shift?.cityId ?? cities[0]?.id ?? '')
  const [date, setDate] = useState(shift?.date ? shift.date.slice(0, 10) : format(prefillDate, 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState(shift?.startTime ?? '08:00')
  const [endTime, setEndTime] = useState(shift?.endTime ?? '12:00')
  const [location, setLocation] = useState(shift?.location ?? '')
  const [sessionType, setSessionType] = useState<'AM' | 'PM' | 'FULL_DAY'>(shift?.sessionType ?? 'AM')
  const [notes, setNotes] = useState(shift?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!staffId || !cityId || !date || !startTime || !endTime || !location) return
    setSaving(true)
    try {
      await onSave({ staffId, cityId, date, startTime, endTime, location, sessionType, notes })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-5">{shift ? 'Edit Shift' : 'Add Shift'}</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Staff</label>
            <select value={staffId} onChange={e => setStaffId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light">
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
            <select value={cityId} onChange={e => setCityId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light">
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Irvine Rec Center"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Session Type</label>
            <select value={sessionType} onChange={e => setSessionType(e.target.value as 'AM' | 'PM' | 'FULL_DAY')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light">
              <option value="AM">AM</option>
              <option value="PM">PM</option>
              <option value="FULL_DAY">Full Day</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} placeholder="Optional notes..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light resize-none" />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-brand text-white py-2 rounded-lg font-semibold text-sm hover:bg-brand-light transition disabled:opacity-60">
            {saving ? 'Saving...' : 'Save'}
          </button>
          {shift && (
            <button onClick={onDelete}
              className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition">
              Delete
            </button>
          )}
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- Main ----------
export default function Schedule() {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [anchorDate, setAnchorDate] = useState(new Date())
  const [staff, setStaff] = useState<Staff[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [prefillStaffId, setPrefillStaffId] = useState('')
  const [prefillDate, setPrefillDate] = useState(new Date())

  const dateRange = (() => {
    if (viewMode === 'week') {
      const start = startOfWeek(anchorDate, { weekStartsOn: 0 })
      return { start, end: endOfWeek(anchorDate, { weekStartsOn: 0 }) }
    }
    if (viewMode === '2weeks') {
      const start = startOfWeek(anchorDate, { weekStartsOn: 0 })
      return { start, end: addDays(start, 13) }
    }
    return { start: startOfMonth(anchorDate), end: endOfMonth(anchorDate) }
  })()

  const days = eachDayOfInterval(dateRange)

  useEffect(() => {
    Promise.all([api.get<Staff[]>('/staff'), api.get<City[]>('/cities')])
      .then(([s, c]) => {
        setStaff(s.data.filter(st => st.isActive))
        setCities(c.data)
      })
  }, [])

  const loadShifts = async () => {
    setLoading(true)
    try {
      const r = await api.get<Shift[]>('/shifts', {
        params: {
          start: format(dateRange.start, 'yyyy-MM-dd'),
          end: format(dateRange.end, 'yyyy-MM-dd'),
        },
      })
      setShifts(r.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadShifts() }, [dateRange.start.toISOString()])

  const navigate = (dir: 1 | -1) => {
    if (viewMode === 'week') setAnchorDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1))
    else if (viewMode === '2weeks') setAnchorDate(d => dir > 0 ? addWeeks(d, 2) : subWeeks(d, 2))
    else setAnchorDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1))
  }

  const openAdd = (sId: string, day: Date) => {
    setEditingShift(null)
    setPrefillStaffId(sId)
    setPrefillDate(day)
    setModalOpen(true)
  }

  const openEdit = (shift: Shift) => {
    setEditingShift(shift)
    setPrefillStaffId(shift.staffId)
    setPrefillDate(parseISO(shift.date))
    setModalOpen(true)
  }

  const handleSave = async (data: Partial<Shift>) => {
    if (editingShift) {
      await api.put(`/shifts/${editingShift.id}`, data)
    } else {
      await api.post('/shifts', data)
    }
    await loadShifts()
    setModalOpen(false)
  }

  const handleDelete = async () => {
    if (!editingShift) return
    await api.delete(`/shifts/${editingShift.id}`)
    await loadShifts()
    setModalOpen(false)
  }

  const rangeLabel = viewMode === 'month'
    ? format(anchorDate, 'MMMM yyyy')
    : `${format(dateRange.start, 'MMM d')} – ${format(dateRange.end, 'MMM d, yyyy')}`

  return (
    <div className="p-6 flex flex-col" style={{ height: 'calc(100vh - 0px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm">
            {(['week', '2weeks', 'month'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={clsx('px-3 py-1.5 font-medium transition',
                  viewMode === v ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-50')}>
                {v === 'week' ? 'Week' : v === '2weeks' ? '2 Weeks' : 'Month'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm">←</button>
            <span className="text-sm font-medium text-gray-700 min-w-[180px] text-center">{rangeLabel}</span>
            <button onClick={() => navigate(1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm">→</button>
          </div>
          <button onClick={() => setAnchorDate(new Date())}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition">
            Today
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto rounded-xl border border-gray-200 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 animate-pulse text-sm">Loading...</div>
        ) : (
          <table className="border-collapse text-sm bg-white" style={{ minWidth: `${176 + days.length * 112}px` }}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-brand text-white">
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap w-44 sticky left-0 bg-brand z-20 border-r border-white/20">
                  Staff
                </th>
                {days.map(day => {
                  const isToday = isSameDay(day, new Date())
                  return (
                    <th key={day.toISOString()}
                      className={clsx('px-2 py-3 text-center font-medium whitespace-nowrap min-w-[112px]',
                        isToday ? 'bg-brand-light' : '')}>
                      <div className="text-xs opacity-75">{format(day, 'EEE')}</div>
                      <div className={clsx('text-sm', isToday && 'font-bold')}>{format(day, 'M/d')}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {staff.map((s, si) => {
                const staffShifts = shifts.filter(sh => sh.staffId === s.id)
                return (
                  <tr key={s.id} className={clsx('border-t border-gray-100',
                    si % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
                    <td className={clsx(
                      'px-4 py-2 whitespace-nowrap font-medium text-gray-800 sticky left-0 z-10 border-r border-gray-100',
                      si % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
                      {s.name}
                    </td>
                    {days.map(day => {
                      const dayShifts = staffShifts.filter(sh => isSameDay(parseISO(sh.date), day))
                      const isToday = isSameDay(day, new Date())
                      return (
                        <td key={day.toISOString()}
                          onClick={() => dayShifts.length === 0 && openAdd(s.id, day)}
                          className={clsx('px-1 py-1 align-top cursor-pointer group',
                            isToday && 'bg-blue-50/30')}>
                          <div className="min-h-[52px] p-0.5 space-y-1">
                            {dayShifts.map(shift => (
                              <div key={shift.id}
                                onClick={e => { e.stopPropagation(); openEdit(shift) }}
                                className="rounded-md px-2 py-1 text-xs cursor-pointer hover:opacity-80 transition"
                                style={{ backgroundColor: shift.city.color + '22', borderLeft: `3px solid ${shift.city.color}` }}>
                                <div className="font-semibold text-gray-800 truncate leading-tight">
                                  {shift.startTime} – {shift.endTime}
                                </div>
                                <div className="text-gray-600 truncate">{shift.city.name}</div>
                                <div className="text-gray-400 truncate text-[11px]">{shift.location}</div>
                                {shift.notes && (
                                  <div className="text-gray-400 truncate text-[11px] italic">{shift.notes}</div>
                                )}
                              </div>
                            ))}
                            {dayShifts.length === 0 && (
                              <div className="min-h-[44px] rounded border border-dashed border-transparent group-hover:border-gray-200 transition flex items-center justify-center">
                                <span className="text-gray-300 text-xs opacity-0 group-hover:opacity-100 transition select-none">+ Add</span>
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={days.length + 1} className="text-center py-16 text-gray-400 text-sm">
                    No active staff found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <ShiftModal
          shift={editingShift}
          staff={staff}
          cities={cities}
          prefillStaffId={prefillStaffId}
          prefillDate={prefillDate}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
