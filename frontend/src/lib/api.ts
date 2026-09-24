import type { AdminEvent, ApiPhoto, EventInput, EventStatus, GalleryPayload, ImportResult, WaitlistEntry } from '../types'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

/**
 * Resolve an image reference from the API.
 *
 * Photo and hero URLs come back as `/images/<signed-token>` relative to the API
 * root, because images are proxied through the backend rather than hotlinked
 * from Drive (Google rate-limits those). Absolute URLs pass through untouched.
 */
export function assetUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  return `${apiBaseUrl ?? ''}${path}`
}

export async function submitWaitlist(entry: WaitlistEntry) {
  if (!apiBaseUrl) return { ok: false, demo: true }
  const response = await fetch(`${apiBaseUrl}/waitlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: entry.name,
      email: entry.email,
      studio_name: entry.studio || null,
      city: entry.city || null,
      country: 'India',
      photography_type: entry.photographyType,
      marketing_consent: entry.consent,
    }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { detail?: string }
    throw new Error(body.detail || 'Unable to join the waitlist')
  }
  return { ok: true, demo: false }
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  if (!apiBaseUrl) throw new Error('API base URL is not configured')
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
  })
  const body = await response.json().catch(() => ({})) as { detail?: string }
  if (!response.ok) throw new Error(body.detail || 'Request failed')
  return body as T
}

/** Empty optional fields are omitted entirely — the API rejects unknown or blank URLs. */
function eventPayload(input: EventInput) {
  return {
    title: input.title,
    location: input.location || null,
    subtitle: input.subtitle || null,
    event_date: input.event_date || null,
    hero_image: input.hero_image || null,
    storage_type: input.storage_type,
    storage_url: input.storage_url || null,
    downloads_enabled: input.downloads_enabled,
  }
}

export async function createEvent(input: EventInput, token: string) {
  return request<AdminEvent>('/admin/events', token, {
    method: 'POST',
    body: JSON.stringify(eventPayload(input)),
  })
}

export async function listEvents(token: string) {
  return request<AdminEvent[]>('/admin/events', token)
}

export async function getEvent(eventId: string, token: string) {
  return request<AdminEvent>(`/admin/events/${eventId}`, token)
}

export async function updateEventStatus(eventId: string, status: EventStatus, token: string) {
  return request<AdminEvent>(`/admin/events/${eventId}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function importEventPhotos(eventId: string, token: string) {
  return request<ImportResult>(`/admin/events/${eventId}/import`, token, { method: 'POST' })
}

export async function listEventPhotos(eventId: string, token: string) {
  return request<ApiPhoto[]>(`/admin/events/${eventId}/photos`, token)
}

export async function fetchGallery(slug: string, token: string) {
  return request<GalleryPayload>(`/galleries/${slug}`, token)
}

export async function updateEventDownloads(eventId: string, enabled: boolean, token: string) {
  return request<AdminEvent>(`/admin/events/${eventId}/downloads`, token, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  })
}
