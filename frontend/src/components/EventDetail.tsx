import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Check, Cloud, ExternalLink, RefreshCw } from 'lucide-react'
import { assetUrl, importEventPhotos, listEventPhotos, updateEventDownloads } from '../lib/api'
import { getAccessToken, isSupabaseConfigured } from '../lib/supabase'
import { track } from '../lib/analytics'
import { STORAGE_TYPE_LABELS } from '../types'
import type { AdminEvent, ApiPhoto } from '../types'

async function requireToken() {
  const token = await getAccessToken()
  if (!token) throw new Error('Your session has expired. Please sign in again.')
  return token
}

function Row({ label, value, href }: { label: string; value: string | null; href?: string | null }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      {value
        ? href
          ? <a href={href} target="_blank" rel="noreferrer">{value} <ExternalLink size={13} /></a>
          : <strong>{value}</strong>
        : <em className="detail-empty">Not set</em>}
    </div>
  )
}

export function EventDetail({ event, onBack }: { event: AdminEvent; onBack: () => void }) {
  const [downloads, setDownloads] = useState(event.downloads_enabled)
  const [photos, setPhotos] = useState<ApiPhoto[]>([])
  const [importing, setImporting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      setPhotos(await listEventPhotos(event.id, await requireToken()))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load photos')
    }
  }, [event.id])

  useEffect(() => { void load() }, [load])

  async function runImport() {
    setImporting(true)
    setError('')
    setStatus('')
    track('drive_import_started')
    try {
      const result = await importEventPhotos(event.id, await requireToken())
      setStatus(`${result.total} photo${result.total === 1 ? '' : 's'} in the folder · ${result.imported} new, ${result.updated} updated.`)
      track('drive_import_completed', { import_status: 'ok' })
      await load()
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Unable to import from Drive')
      track('drive_import_failed', { import_status: 'failed' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <section className="admin-section event-detail">
      <button className="back-button" onClick={onBack}><ArrowLeft size={16} /> All events</button>
      {event.hero_image_url && <img className="detail-hero" src={assetUrl(event.hero_image_url)} alt="" loading="lazy" decoding="async" />}
      <div className="section-heading">
        <div>
          <p className="eyebrow">{event.status === 'published' ? 'Published' : 'Draft'} · {event.plan} tier</p>
          <h2>{event.title}</h2>
        </div>
      </div>
      {event.subtitle && <p className="section-lede">{event.subtitle}</p>}
      <div className="detail-grid">
        <Row label="Location" value={event.location} />
        <Row label="Shoot done on" value={event.event_date} />
        <Row label="Storage type" value={STORAGE_TYPE_LABELS[event.storage_type]} />
        <Row label="Storage link" value={event.storage_url} href={event.storage_url} />
        <Row label="Drive folder ID" value={event.drive_folder_id} />
        <Row label="Gallery slug" value={event.gallery_slug} />
        <div className="detail-row">
          <span>Client downloads</span>
          <label className="checkbox detail-toggle">
            <input
              type="checkbox"
              checked={downloads}
              onChange={async (e) => {
                const next = e.target.checked
                setDownloads(next)
                try {
                  await updateEventDownloads(event.id, next, await requireToken())
                } catch (toggleError) {
                  setDownloads(!next)
                  setError(toggleError instanceof Error ? toggleError.message : 'Unable to update downloads')
                }
              }}
            />
            {downloads ? 'Clients may download photographs' : 'Downloads are off'}
          </label>
        </div>
        <Row label="Gallery URL" value={event.status === 'published' ? `/g/${event.gallery_slug}` : null} href={event.status === 'published' ? `/g/${event.gallery_slug}` : null} />
      </div>

      <div className="import-header">
        <div>
          <p className="eyebrow">Google Drive source</p>
          <h3>{photos.length ? `${photos.length} photographs` : 'No photographs yet'}</h3>
        </div>
        <button className="button button-outline" onClick={() => void runImport()} disabled={importing || !event.drive_folder_id}>
          {importing ? <><Cloud size={15} /> Importing…</> : <><RefreshCw size={15} /> {photos.length ? 'Refresh from Drive' : 'Import photos'}</>}
        </button>
      </div>
      {!event.drive_folder_id && <p className="field-note">Add a Google Drive folder link to this event before importing.</p>}
      {error && <p className="form-error">{error}</p>}
      {status && <p className="import-success"><Check size={15} /> {status}</p>}

      {photos.length > 0 && (
        <div className="photo-thumbs">
          {photos.map((photo) => (
            <figure key={photo.id}>
              <img src={assetUrl(photo.thumbnail_url)} alt={photo.filename} loading="lazy" decoding="async" />
              <figcaption>{photo.filename}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  )
}
