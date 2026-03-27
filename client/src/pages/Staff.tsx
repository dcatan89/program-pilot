import { useEffect, useState } from 'react'
import api from '../api/client'
import { Staff, City, StaffAvailability } from '../types'
import { format, parseISO } from 'date-fns'
import clsx from 'clsx'

const EMPTY_FORM = { name: '', email: '', phone: '', notes: '', cityIds: [] as string[] }

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [availability, setAvailability] = useState<StaffAvailability[]>([])
  const [availStartDate, setAvailStartDate] = useState('')
  const [availEndDate, setAvailEndDate] = useState('')
  const [availNote, setAvailNote] = useState('')
  const [addingAvail, setAddingAvail] = useState(false)

  const load = async () => {
    const [s, c] = await Promise.all([api.get<Staff[]>('/staff'), api.get<City[]>('/cities')])
    setStaff(s.data)
    setCities(c.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowForm(true)
  }

  const openEdit = async (s: Staff) => {
    setEditId(s.id)
    setForm({
      name: s.name,
      email: s.email ?? '',
      phone: s.phone ?? '',
      notes: s.notes ?? '',
      cityIds: s.clearedCities.map(c => c.city.id),
    })
    setAvailStartDate('')
    setAvailEndDate('')
    setAvailNote('')
    setError('')
    const r = await api.get<StaffAvailability[]>(`/staff/${s.id}/availability`)
    setAvailability(r.data)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    try {
      if (editId) {
        await api.put(`/staff/${editId}`, form)
      } else {
        await api.post('/staff', form)
      }
      setShowForm(false)
      load()
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (s: Staff) => {
    await api.put(`/staff/${s.id}`, {
      name: s.name,
      email: s.email,
      phone: s.phone,
      notes: s.notes,
      cityIds: s.clearedCities.map(c => c.city.id),
      isActive: !s.isActive,
    })
    load()
  }

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email?.toLowerCase().includes(search.toLowerCase()) ?? false)
  )

  const handleAddAvailability = async () => {
    if (!editId || !availStartDate || !availEndDate) return
    setAddingAvail(true)
    const r = await api.post<StaffAvailability>(`/staff/${editId}/availability`, {
      startDate: availStartDate,
      endDate: availEndDate,
      note: availNote || undefined,
    })
    setAvailability(prev => [...prev, r.data].sort((a, b) => a.startDate.localeCompare(b.startDate)))
    setAvailStartDate('')
    setAvailEndDate('')
    setAvailNote('')
    setAddingAvail(false)
  }

  const handleDeleteAvailability = async (blockId: string) => {
    if (!editId) return
    await api.delete(`/staff/${editId}/availability/${blockId}`)
    setAvailability(prev => prev.filter(a => a.id !== blockId))
  }

  const toggleCity = (id: string) => {
    setForm(f => ({
      ...f,
      cityIds: f.cityIds.includes(id) ? f.cityIds.filter(c => c !== id) : [...f.cityIds, id],
    }))
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-500 text-sm mt-1">Manage instructors and their city clearances</p>
        </div>
        <button
          onClick={openNew}
          className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-light transition-colors"
        >
          + Add Staff
        </button>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
        />
      </div>

      {loading ? (
        <div className="text-gray-400 animate-pulse py-8 text-center">Loading staff...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-5 py-3 text-left font-semibold text-gray-600">Name</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-600">Contact</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-600">Cleared Cities</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-600">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                    {search ? 'No staff match your search' : 'No staff yet — add your first instructor'}
                  </td>
                </tr>
              )}
              {filtered.map(s => (
                <tr key={s.id} className={clsx('hover:bg-gray-50 transition-colors', !s.isActive && 'opacity-50')}>
                  <td className="px-5 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-5 py-3 text-gray-500">
                    <div>{s.email ?? '—'}</div>
                    {s.phone && <div className="text-xs">{s.phone}</div>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {s.clearedCities.length === 0 ? (
                        <span className="text-gray-400 text-xs">None</span>
                      ) : (
                        s.clearedCities.map(({ city }) => (
                          <span
                            key={city.id}
                            className="text-xs px-2 py-0.5 rounded-full border font-medium"
                            style={{ backgroundColor: city.color + '22', borderColor: city.color, color: city.color }}
                          >
                            {city.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={clsx(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    )}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-xs text-brand-light hover:text-brand font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(s)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        {s.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide-in form panel */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setShowForm(false)} />
          <div className="w-full max-w-md bg-white shadow-2xl overflow-y-auto flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg">{editId ? 'Edit Staff' : 'Add Staff'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="flex-1 px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                  placeholder="(555) 000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                  placeholder="Any notes..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cleared Cities</label>
                <div className="flex flex-wrap gap-2">
                  {cities.map(city => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => toggleCity(city.id)}
                      className={clsx(
                        'px-3 py-1.5 rounded-full text-sm border font-medium transition-colors',
                        form.cityIds.includes(city.id)
                          ? 'text-white border-transparent'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      )}
                      style={form.cityIds.includes(city.id) ? { backgroundColor: city.color, borderColor: city.color } : {}}
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability / Time Off — only shown in edit mode */}
              {editId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Off / Unavailability</label>
                  {availability.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {availability.map(block => (
                        <span key={block.id} className="inline-flex items-center gap-1 text-xs bg-orange-50 border border-orange-200 text-orange-700 px-2 py-1 rounded-full">
                          {format(parseISO(block.startDate), 'MMM d')} – {format(parseISO(block.endDate), 'MMM d, yyyy')}
                          {block.note && <span className="text-orange-500"> · {block.note}</span>}
                          <button
                            type="button"
                            onClick={() => handleDeleteAvailability(block.id)}
                            className="ml-0.5 hover:text-red-500 font-bold"
                          >×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={availStartDate}
                        onChange={e => setAvailStartDate(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                      />
                      <input
                        type="date"
                        value={availEndDate}
                        onChange={e => setAvailEndDate(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={availNote}
                        onChange={e => setAvailNote(e.target.value)}
                        placeholder="Note (optional, e.g. Vacation)"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                      />
                      <button
                        type="button"
                        onClick={handleAddAvailability}
                        disabled={addingAvail || !availStartDate || !availEndDate}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 disabled:opacity-40"
                      >
                        {addingAvail ? '...' : 'Add'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-brand text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-light transition disabled:opacity-60"
              >
                {saving ? 'Saving...' : editId ? 'Update Staff' : 'Add Staff'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
