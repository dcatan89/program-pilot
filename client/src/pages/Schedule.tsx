import { useEffect, useState, useRef, useCallback } from 'react'
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, addWeeks, addMonths, subWeeks, subMonths, eachDayOfInterval, isSameDay, parseISO
} from 'date-fns'
import api from '../api/client'
import { Staff, City, Shift } from '../types'
import clsx from 'clsx'

type ViewMode = 'week' | '2weeks' | 'month'

// ── helpers ────────────────────────────────────────────────────────────────
function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function minutesToTime(mins: number) {
  const clamped = Math.max(0, Math.min(1439, mins))
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}
function durationLabel(start: string, end: string) {
  const d = timeToMinutes(end) - timeToMinutes(start)
  if (d <= 0) return ''
  const h = Math.floor(d / 60), m = d % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 || 12
  return `${hh}:${String(m).padStart(2, '0')}${ampm}`
}

const SESSION_COLORS: Record<string, { bg: string; border: string }> = {
  AM:       { bg: '#0891B2', border: '#0369A1' },
  PM:       { bg: '#7C3AED', border: '#6D28D9' },
  FULL_DAY: { bg: '#1E3A5F', border: '#1e3a5f' },
}

// ── Shift Block ─────────────────────────────────────────────────────────────
function ShiftBlock({
  shift,
  onEdit,
  onResizeStart,
}: {
  shift: Shift & { previewEndTime?: string }
  onEdit: (s: Shift) => void
  onResizeStart: (e: React.MouseEvent, s: Shift) => void
}) {
  const endTime = shift.previewEndTime ?? shift.endTime
  const durMins = timeToMinutes(endTime) - timeToMinutes(shift.startTime)
  const height = Math.max(64, durMins * 1.5)
  const colors = SESSION_COLORS[shift.sessionType] ?? SESSION_COLORS.AM
  const dur = durationLabel(shift.startTime, endTime)

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('shiftId', shift.id); e.stopPropagation() }}
      onClick={e => { e.stopPropagation(); onEdit(shift) }}
      className="w-full rounded-md overflow-hidden cursor-pointer select-none relative flex flex-col"
      style={{ height, backgroundColor: colors.bg, minHeight: 64 }}
    >
      {/* Content */}
      <div className="px-2 pt-1.5 pb-5 flex flex-col gap-0.5 flex-1 min-h-0">
        <div className="text-white font-bold text-xs leading-tight truncate">
          {fmtTime(shift.startTime)} – {fmtTime(endTime)}
        </div>
        <div className="text-white/90 text-[11px] leading-tight truncate font-medium">
          {shift.location}
        </div>
        <div className="text-white/70 text-[10px] truncate">
          {shift.city.name} · {shift.sessionType === 'FULL_DAY' ? 'Full Day' : shift.sessionType}
        </div>
        {shift.notes && (
          <div className="text-white/60 text-[10px] truncate italic">{shift.notes}</div>
        )}
        {dur && (
          <div className="text-white/70 text-[10px] mt-auto">{dur}</div>
        )}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={e => onResizeStart(e, shift)}
        onClick={e => e.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center"
        style={{ backgroundColor: colors.border }}
      >
        <div className="w-6 h-0.5 rounded-full bg-white/40" />
      </div>
    </div>
  )
}

// ── Shift Modal ─────────────────────────────────────────────────────────────
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
    try { await onSave({ staffId, cityId, date, startTime, endTime, location, sessionType, notes }) }
    finally { setSaving(false) }
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

// ── Main ────────────────────────────────────────────────────────────────────
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
  const [dragOver, setDragOver] = useState<string | null>(null) // "staffId|dateISO"
  const [resizePreview, setResizePreview] = useState<{ shiftId: string; endTime: string } | null>(null)
  const resizeRef = useRef<{ shiftId: string; startY: number; origEndTime: string; origStartTime: string } | null>(null)

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

  const loadShifts = useCallback(async () => {
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
  }, [dateRange.start.toISOString(), dateRange.end.toISOString()])

  useEffect(() => { loadShifts() }, [dateRange.start.toISOString()])

  // ── Resize handlers ────────────────────────────────────────────────────
  const handleResizeStart = useCallback((e: React.MouseEvent, shift: Shift) => {
    e.preventDefault()
    e.stopPropagation()
    resizeRef.current = {
      shiftId: shift.id,
      startY: e.clientY,
      origEndTime: shift.endTime,
      origStartTime: shift.startTime,
    }

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return
      const deltaY = ev.clientY - resizeRef.current.startY
      const deltaMinutes = Math.round(deltaY / 1.5)
      const origMins = timeToMinutes(resizeRef.current.origEndTime)
      const startMins = timeToMinutes(resizeRef.current.origStartTime)
      const newMins = Math.max(startMins + 15, origMins + deltaMinutes)
      setResizePreview({ shiftId: resizeRef.current.shiftId, endTime: minutesToTime(newMins) })
    }

    const onMouseUp = async () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      if (resizeRef.current && resizePreview) {
        try {
          await api.put(`/shifts/${resizeRef.current.shiftId}`, { endTime: resizePreview.endTime })
          await loadShifts()
        } catch (e) { /* ignore */ }
      }
      resizeRef.current = null
      setResizePreview(null)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [resizePreview, loadShifts])

  // ── Drag-to-move handlers ──────────────────────────────────────────────
  const handleDrop = async (e: React.DragEvent, staffId: string, day: Date) => {
    e.preventDefault()
    setDragOver(null)
    const shiftId = e.dataTransfer.getData('shiftId')
    if (!shiftId) return
    try {
      await api.put(`/shifts/${shiftId}`, { staffId, date: format(day, 'yyyy-MM-dd') })
      await loadShifts()
    } catch (e) { /* ignore */ }
  }

  const navigate = (dir: 1 | -1) => {
    if (viewMode === 'week') setAnchorDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1))
    else if (viewMode === '2weeks') setAnchorDate(d => dir > 0 ? addWeeks(d, 2) : subWeeks(d, 2))
    else setAnchorDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1))
  }

  const openAdd = (sId: string, day: Date) => {
    setEditingShift(null); setPrefillStaffId(sId); setPrefillDate(day); setModalOpen(true)
  }
  const openEdit = (shift: Shift) => {
    setEditingShift(shift); setPrefillStaffId(shift.staffId); setPrefillDate(parseISO(shift.date)); setModalOpen(true)
  }

  const handleSave = async (data: Partial<Shift>) => {
    if (editingShift) await api.put(`/shifts/${editingShift.id}`, data)
    else await api.post('/shifts', data)
    await loadShifts()
    setModalOpen(false)
  }
  const handleDelete = async () => {
    if (!editingShift) return
    await api.delete(`/shifts/${editingShift.id}`)
    await loadShifts()
    setModalOpen(false)
  }

  // Staff total hours in current range
  const staffHours = (staffId: string) => {
    const total = shifts
      .filter(s => s.staffId === staffId)
      .reduce((acc, s) => acc + Math.max(0, timeToMinutes(s.endTime) - timeToMinutes(s.startTime)), 0)
    const h = Math.floor(total / 60), m = total % 60
    return total === 0 ? null : m === 0 ? `${h}h` : `${h}h ${m}m`
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
          <table className="border-collapse text-sm bg-white" style={{ minWidth: `${176 + days.length * 130}px` }}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-brand text-white">
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap w-48 sticky left-0 bg-brand z-20 border-r border-white/20">
                  Staff
                </th>
                {days.map(day => {
                  const isToday = isSameDay(day, new Date())
                  return (
                    <th key={day.toISOString()}
                      className={clsx('px-2 py-3 text-center font-medium whitespace-nowrap min-w-[130px]',
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
                const hours = staffHours(s.id)
                return (
                  <tr key={s.id} className={clsx('border-t border-gray-100',
                    si % 2 === 0 ? 'bg-white' : 'bg-gray-50/40')}>
                    {/* Staff name */}
                    <td className={clsx(
                      'px-4 py-3 whitespace-nowrap sticky left-0 z-10 border-r border-gray-100',
                      si % 2 === 0 ? 'bg-white' : 'bg-gray-50/40')}>
                      <div className="font-medium text-gray-800 text-sm">{s.name}</div>
                      {hours && <div className="text-xs text-gray-400 mt-0.5">{hours}</div>}
                    </td>

                    {/* Day cells */}
                    {days.map(day => {
                      const cellKey = `${s.id}|${day.toISOString()}`
                      const dayShifts = staffShifts.filter(sh => isSameDay(parseISO(sh.date), day))
                      const isToday = isSameDay(day, new Date())
                      const isDragOver = dragOver === cellKey

                      // Apply resize preview
                      const displayShifts = dayShifts.map(sh =>
                        resizePreview?.shiftId === sh.id
                          ? { ...sh, previewEndTime: resizePreview.endTime }
                          : sh
                      )

                      return (
                        <td key={day.toISOString()}
                          onDragOver={e => { e.preventDefault(); setDragOver(cellKey) }}
                          onDragLeave={() => setDragOver(null)}
                          onDrop={e => handleDrop(e, s.id, day)}
                          className={clsx(
                            'px-1.5 py-1.5 align-top transition-colors',
                            isToday && 'bg-blue-50/20',
                            isDragOver && 'bg-brand-muted outline-dashed outline-2 outline-brand-light outline-offset-[-2px]'
                          )}>
                          <div className="space-y-1.5">
                            {displayShifts.map(shift => (
                              <ShiftBlock
                                key={shift.id}
                                shift={shift as Shift & { previewEndTime?: string }}
                                onEdit={openEdit}
                                onResizeStart={handleResizeStart}
                              />
                            ))}
                            {/* + Add button */}
                            <button
                              onClick={() => openAdd(s.id, day)}
                              className="w-full text-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded py-1 text-xs transition leading-none"
                              title="Add shift">
                              +
                            </button>
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
