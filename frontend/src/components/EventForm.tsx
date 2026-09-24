import { useState } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
import { ENABLED_STORAGE_TYPES, STORAGE_TYPE_LABELS } from '../types'
import type { EventInput, StorageType } from '../types'

const empty: EventInput = {
  title: '',
  location: '',
  subtitle: '',
  event_date: '',
  hero_image: '',
  storage_type: 'google_drive',
  storage_url: '',
  downloads_enabled: true,
}

const storageOptions = Object.keys(STORAGE_TYPE_LABELS) as StorageType[]

export function EventForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (input: EventInput) => Promise<void> }) {
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const update = <K extends keyof EventInput>(key: K, value: EventInput[K]) => setForm((current) => ({ ...current, [key]: value }))

  async function submit() {
    setSaving(true)
    setError('')
    try {
      await onSubmit(form)
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to create event')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal event-form" onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <button type="button" className="modal-close" onClick={onClose}><X size={17} /></button>
        <p className="eyebrow">A new story</p>
        <h2>Create event</h2>
        <label>Event name<input required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="A day in the Aravallis" /></label>
        <label>Event location<input value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Udaipur, Rajasthan" /></label>
        <label>Event headline<input value={form.subtitle} onChange={(e) => update('subtitle', e.target.value)} placeholder="Two days, one monsoon, endless light" /></label>
        <label>Shoot done on<input type="date" value={form.event_date} onChange={(e) => update('event_date', e.target.value)} /></label>
        <label>Hero image<input type="text" value={form.hero_image} onChange={(e) => update('hero_image', e.target.value)} placeholder="Drive link or file ID" /></label>
        <small className="field-note">A Google Drive file link, a bare Drive file ID, or any image URL.</small>
        <label>Storage type
          <select value={form.storage_type} onChange={(e) => update('storage_type', e.target.value as StorageType)}>
            {storageOptions.map((option) => (
              <option key={option} value={option} disabled={!ENABLED_STORAGE_TYPES.includes(option)}>
                {STORAGE_TYPE_LABELS[option]}{ENABLED_STORAGE_TYPES.includes(option) ? '' : ' — coming soon'}
              </option>
            ))}
          </select>
        </label>
        <label>Google Drive link<input type="url" value={form.storage_url} onChange={(e) => update('storage_url', e.target.value)} placeholder="https://drive.google.com/drive/folders/…" /></label>
        <small className="field-note">Paste the publicly shared folder link. We read the folder ID from it.</small>
        <label className="checkbox"><input type="checkbox" checked={form.downloads_enabled} onChange={(e) => update('downloads_enabled', e.target.checked)} /> Let clients download photographs</label>
        {error && <p className="form-error">{error}</p>}
        <button className="button button-dark" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create draft'} <ArrowUpRight size={15} /></button>
      </form>
    </div>
  )
}
