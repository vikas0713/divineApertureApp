import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowUpRight, Check } from 'lucide-react'
import { track } from '../lib/analytics'
import { submitWaitlist } from '../lib/api'
import type { WaitlistEntry } from '../types'

const initial: WaitlistEntry = { name: '', email: '', studio: '', city: '', photographyType: 'Wedding', consent: false }

export function WaitlistForm() {
  const [form, setForm] = useState(initial)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const update = (key: keyof WaitlistEntry, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }))
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const result = await submitWaitlist(form)
      if (result.demo) localStorage.setItem('divine-aperture-waitlist', JSON.stringify({ ...form, createdAt: new Date().toISOString() }))
      track('waitlist_submitted', { photography_type: form.photographyType })
      setSubmitted(true)
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to join the waitlist')
    }
  }
  if (submitted) return <div className="success-card"><span className="success-icon"><Check size={19} /></span><h3>You’re on the list.</h3><p>We’ll be in touch when Divine Aperture is ready for your work.</p></div>
  return (
    <form className="waitlist-form" onSubmit={submit}>
      <div className="form-row"><label>Name<input required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Your name" /></label><label>Email<input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@studio.com" /></label></div>
      <div className="form-row"><label>Studio / business<input value={form.studio} onChange={(e) => update('studio', e.target.value)} placeholder="Studio name" /></label><label>City<input value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="Where you work" /></label></div>
      <label>Photography type<select value={form.photographyType} onChange={(e) => update('photographyType', e.target.value)}><option>Wedding</option><option>Portrait</option><option>Fashion</option><option>Commercial</option><option>Fine art</option></select></label>
      <label className="checkbox"><input type="checkbox" checked={form.consent} onChange={(e) => update('consent', e.target.checked)} /> Keep me updated about Divine Aperture</label>
      {error && <p className="form-error">{error}</p>}
      <button className="button button-dark" type="submit">Join the waitlist <ArrowUpRight size={16} /></button>
    </form>
  )
}
