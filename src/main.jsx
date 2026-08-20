import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CalendarDays, CarFront, Check, ChevronDown, Clock3, MapPin, Pencil, Phone, Plus, Search, Trash2, X } from 'lucide-react'
import './styles.css'

const emptyForm = { customerName: '', customerPhone: '', pickup: '', destination: '', rideDate: '', rideTime: '', vehicle: 'Standard', status: 'upcoming', notes: '' }
const apiUrl = (path) => `${import.meta.env.VITE_API_URL || ''}${path}`

async function readApiResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) throw new Error('api-unavailable')
  if (!response.ok) throw new Error('api-error')
  return response.json()
}

function formatDate(date) {
  if (!date) return 'Not set'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
}

function normalizeTime(time) {
  const match = String(time || '').match(/^(\d{1,2}):(\d{2})/)
  if (!match) return ''
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

function formatTime(time) {
  const normalized = normalizeTime(time)
  if (!normalized) return 'Not set'
  const [hours, minutes] = normalized.split(':').map(Number)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hours, minutes))
}

function App() {
  const [reservations, setReservations] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  const loadReservations = async () => {
    try {
      const response = await fetch(apiUrl('/api/reservations'))
      setReservations(await readApiResponse(response))
    } catch (error) {
      setNotice(error.message === 'api-unavailable' ? 'The reservation API is not deployed yet. Deploy the Netlify Function and configure its database.' : 'The reservation API cannot reach MySQL. Check its database environment variables and run db/schema.sql.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReservations() }, [])

  const visibleReservations = useMemo(() => reservations.filter((reservation) => {
    const matchesFilter = filter === 'all' || reservation.status === filter
    const haystack = `${reservation.customerName} ${reservation.pickup} ${reservation.destination}`.toLowerCase()
    return matchesFilter && haystack.includes(search.toLowerCase())
  }), [reservations, search, filter])

  const counts = useMemo(() => ({
    total: reservations.length,
    upcoming: reservations.filter((item) => item.status === 'upcoming').length,
    completed: reservations.filter((item) => item.status === 'completed').length,
    cancelled: reservations.filter((item) => item.status === 'cancelled').length
  }), [reservations])

  const updateForm = (event) => setForm({ ...form, [event.target.name]: event.target.value })

  const submitReservation = async (event) => {
    event.preventDefault()
    setNotice('')
    const endpoint = editingId ? apiUrl(`/api/reservations/${editingId}`) : apiUrl('/api/reservations')
    try {
      const response = await fetch(endpoint, { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const saved = await readApiResponse(response)
      setReservations((current) => editingId ? current.map((item) => item.id === editingId ? saved : item) : [...current, saved])
      resetForm()
      setNotice(editingId ? 'Reservation updated.' : 'Reservation added.')
    } catch (error) { setNotice(error.message === 'api-unavailable' ? 'The reservation API is not deployed yet. Deploy the Netlify Function before saving.' : 'Could not save reservation. Check the API database connection.') }
  }

  const resetForm = () => { setForm(emptyForm); setEditingId(null) }

  const editReservation = (reservation) => {
    setForm({ ...reservation, rideDate: String(reservation.rideDate).slice(0, 10), rideTime: normalizeTime(reservation.rideTime) })
    setEditingId(reservation.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelReservation = async (id) => {
    if (!window.confirm('Cancel this reservation?')) return
    const response = await fetch(apiUrl(`/api/reservations/${id}/cancel`), { method: 'PATCH' })
    if (response.ok) { setReservations((current) => current.map((item) => item.id === id ? { ...item, status: 'cancelled' } : item)); setNotice('Reservation cancelled.') }
  }

  const deleteReservation = async (id) => {
    if (!window.confirm('Permanently delete this reservation?')) return
    const response = await fetch(apiUrl(`/api/reservations/${id}`), { method: 'DELETE' })
    if (response.ok) { setReservations((current) => current.filter((item) => item.id !== id)); setNotice('Reservation deleted.') }
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><CarFront size={19} /></span><span>route<span className="brand-amp">&</span>ride</span></div>
      <div className="topbar-meta"><span className="live-dot" /> Dispatch desk <span className="date-stamp">Thursday, August 20, 2026</span></div>
    </header>

    <main>
      <section className="intro"><div><p className="eyebrow">Operations / Reservations</p><h1>Move people<br /><em>with purpose.</em></h1><p className="subcopy">A clear view of every ride, from first request to final drop-off.</p></div><div className="intro-art"><div className="road-line" /><span className="art-label">CITY / 24</span><MapPin className="art-pin" size={30} /></div></section>

      {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={16} /></button></div>}

      <section className="stats" aria-label="Reservation summary">
        <div className="stat-card stat-accent"><span>All reservations</span><strong>{counts.total}</strong><small>Across your network</small></div>
        <div className="stat-card"><span>Upcoming</span><strong>{counts.upcoming}</strong><small><Clock3 size={13} /> Ready to dispatch</small></div>
        <div className="stat-card"><span>Completed</span><strong>{counts.completed}</strong><small><Check size={13} /> Rides finished</small></div>
        <div className="stat-card"><span>Cancelled</span><strong>{counts.cancelled}</strong><small><X size={13} /> Kept in history</small></div>
      </section>

      <section className="workspace">
        <div className="form-panel">
          <div className="panel-heading"><div><p className="eyebrow">{editingId ? 'Edit booking' : 'New booking'}</p><h2>{editingId ? 'Update a ride' : 'Reserve a ride'}</h2></div>{editingId && <button className="text-button" onClick={resetForm}>Clear edit</button>}</div>
          <form onSubmit={submitReservation}>
            <label>Passenger name<input name="customerName" value={form.customerName} onChange={updateForm} placeholder="e.g. Morgan Lee" required /></label>
            <label>Phone number<div className="input-with-icon"><Phone size={15} /><input name="customerPhone" value={form.customerPhone} onChange={updateForm} placeholder="+1 555 000 0000" required /></div></label>
            <div className="form-grid"><label>Pick-up<input name="pickup" value={form.pickup} onChange={updateForm} placeholder="Street, hotel, airport" required /></label><label>Destination<input name="destination" value={form.destination} onChange={updateForm} placeholder="Where to?" required /></label></div>
            <div className="form-grid"><label>Date<div className="input-with-icon"><CalendarDays size={15} /><input type="date" name="rideDate" value={form.rideDate} onChange={updateForm} required /></div></label><label>Time<div className="input-with-icon"><Clock3 size={15} /><input type="time" name="rideTime" value={form.rideTime} onChange={updateForm} required /></div></label></div>
            <label>Vehicle<select name="vehicle" value={form.vehicle} onChange={updateForm}><option>Standard</option><option>Executive</option><option>Van</option></select><ChevronDown className="select-chevron" size={15} /></label>
            <label>Notes <span className="optional">Optional</span><textarea name="notes" value={form.notes} onChange={updateForm} placeholder="Accessibility needs, luggage, special instructions" rows="3" /></label>
            <button className="primary-button" type="submit"><Plus size={17} /> {editingId ? 'Save changes' : 'Add reservation'}</button>
          </form>
        </div>

        <div className="list-panel"><div className="list-heading"><div><p className="eyebrow">Live schedule</p><h2>Reservations <span>{visibleReservations.length}</span></h2></div><div className="toolbar"><div className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search rides" /></div><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All statuses</option><option value="upcoming">Upcoming</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div></div>
          {loading ? <div className="empty-state">Loading schedule...</div> : visibleReservations.length === 0 ? <div className="empty-state"><CalendarDays size={28} /><strong>No reservations found</strong><span>Add a booking or adjust your search.</span></div> : <div className="reservation-list">{visibleReservations.map((reservation) => <article className={`reservation ${reservation.status}`} key={reservation.id}><div className="reservation-time"><strong>{formatTime(reservation.rideTime)}</strong><span>{formatDate(reservation.rideDate)}</span></div><div className="reservation-route"><strong>{reservation.customerName}</strong><span>{reservation.pickup} <b>to</b> {reservation.destination}</span><small><Phone size={12} /> {reservation.customerPhone} <i /> {reservation.vehicle}</small></div><span className={`status status-${reservation.status}`}>{reservation.status}</span><div className="actions"><button onClick={() => editReservation(reservation)} title="Edit reservation" aria-label="Edit reservation"><Pencil size={15} /></button>{reservation.status === 'upcoming' && <button onClick={() => cancelReservation(reservation.id)} title="Cancel reservation" aria-label="Cancel reservation"><X size={15} /></button>}<button className="danger" onClick={() => deleteReservation(reservation.id)} title="Delete reservation" aria-label="Delete reservation"><Trash2 size={15} /></button></div></article>)}</div>}
        </div>
      </section>
    </main>
    <footer><span>route<span className="brand-amp">&</span>ride</span><span>Reservation management, made human.</span></footer>
  </div>
}

export default App

createRoot(document.getElementById('root')).render(<App />)