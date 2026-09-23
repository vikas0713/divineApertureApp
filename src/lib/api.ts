import type { WaitlistEntry } from '../types'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

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
