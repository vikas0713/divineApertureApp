import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, LogOut, Plus, RefreshCw, Settings } from 'lucide-react'
import { Brand } from './Brand'
import { EventDetail } from './EventDetail'
import { EventForm } from './EventForm'
import { track } from '../lib/analytics'
import { createEvent, listEvents, updateEventStatus } from '../lib/api'
import { getAccessToken, isSupabaseConfigured } from '../lib/supabase'
import { demoAdminEvents } from '../data/demo'
import { STORAGE_TYPE_LABELS } from '../types'
import type { AdminEvent, EventInput } from '../types'

async function requireToken() {
  const token = await getAccessToken()
  if (!token) throw new Error('Your session has expired. Please sign in again.')
  return token
}

export function AdminDashboard({ onBack, onLogout }: { onBack: () => void; onLogout: () => void }) {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [selected, setSelected] = useState<AdminEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Demo mode keeps the dashboard usable before Supabase is configured.
      setEvents(isSupabaseConfigured ? await listEvents(await requireToken()) : demoAdminEvents)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load events')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleCreate(input: EventInput) {
    if (!isSupabaseConfigured) {
      setEvents((current) => [{ ...demoAdminEvents[0], id: `demo-${Date.now()}`, title: input.title, location: input.location || null, subtitle: input.subtitle || null, event_date: input.event_date || null, hero_image_url: input.hero_image || null, storage_type: input.storage_type, storage_url: input.storage_url || null, status: 'draft' }, ...current])
      setShowCreate(false)
      return
    }
    const created = await createEvent(input, await requireToken())
    track('event_created', { storage_type: input.storage_type })
    setEvents((current) => [created, ...current])
    setShowCreate(false)
  }

  async function togglePublish(event: AdminEvent) {
    const next = event.status === 'published' ? 'draft' : 'published'
    if (!isSupabaseConfigured) {
      setEvents((current) => current.map((row) => row.id === event.id ? { ...row, status: next } : row))
      return
    }
    try {
      const updated = await updateEventStatus(event.id, next, await requireToken())
      setEvents((current) => current.map((row) => row.id === updated.id ? updated : row))
      setSelected((current) => current?.id === updated.id ? updated : current)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update event')
    }
  }

  const published = events.filter((event) => event.status === 'published').length

  return (
    <div className="page admin-page">
      <header className="site-header"><div className="header-inner"><Brand /><div className="header-right"><span className="admin-label"><Settings size={14} /> Superadmin workspace</span><button className="text-button" onClick={onLogout}><LogOut size={15} /> Sign out</button></div></div></header>
      <main className="admin-main">
        <div className="admin-top">
          <div><p className="eyebrow">Studio / Overview</p><h1>Good morning,<br /><em>Divine Aperture.</em></h1></div>
          <button className="button button-dark" onClick={() => setShowCreate(true)}><Plus size={16} /> New event</button>
        </div>
        <div className="admin-stats">
          <div><span>Published stories</span><strong>{published.toString().padStart(2, '0')}</strong></div>
          <div><span>Total events</span><strong>{events.length.toString().padStart(2, '0')}</strong></div>
          <div><span>Drafts</span><strong>{(events.length - published).toString().padStart(2, '0')}</strong></div>
        </div>

        {selected
          ? <EventDetail event={selected} onBack={() => setSelected(null)} />
          : (
            <section className="admin-section">
              <div className="section-heading">
                <div><p className="eyebrow">Your stories</p><h2>Events</h2></div>
                <div className="section-actions">
                  <button className="text-button" onClick={() => void load()}><RefreshCw size={15} /> Refresh</button>
                  <button className="text-button" onClick={onBack}>Preview as client <ExternalLink size={15} /></button>
                </div>
              </div>
              {error && <p className="form-error">{error}</p>}
              {loading && <p className="section-lede">Loading events…</p>}
              {!loading && !error && events.length === 0 && (
                <div className="empty-state">
                  <h3>No events yet.</h3>
                  <p>Create your first event and point it at a shared Google Drive folder.</p>
                  <button className="button button-dark" onClick={() => setShowCreate(true)}><Plus size={16} /> New event</button>
                </div>
              )}
              {events.map((event) => (
                <article className="event-row" key={event.id}>
                  {event.hero_image_url
                    ? <img src={event.hero_image_url} alt="" loading="lazy" decoding="async" />
                    : <div className="event-row-placeholder" aria-hidden="true" />}
                  <button className="event-row-copy" onClick={() => setSelected(event)}>
                    <span className={event.status === 'published' ? 'event-status published' : 'event-status'}><i /> {event.status === 'published' ? 'Published' : 'Draft'} · {STORAGE_TYPE_LABELS[event.storage_type]}</span>
                    <h3>{event.title}</h3>
                    <p>{[event.event_date, event.location].filter(Boolean).join(' · ') || 'No date or location yet'}</p>
                  </button>
                  <button className="button button-outline" onClick={() => void togglePublish(event)}>
                    {event.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                </article>
              ))}
            </section>
          )}

      </main>
      {showCreate && <EventForm onClose={() => setShowCreate(false)} onSubmit={handleCreate} />}
    </div>
  )
}
