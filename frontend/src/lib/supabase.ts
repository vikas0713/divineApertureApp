import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = url && publishableKey ? createClient(url, publishableKey) : null
export const isSupabaseConfigured = Boolean(supabase)

/**
 * Returns the viewer to the page they signed in from, not to the site root.
 * A shared gallery link is the whole point: someone opening /g/<slug> and
 * signing in has to land back on that gallery, and the origin alone drops the
 * slug (ADR-009).
 *
 * The target must be on Supabase's redirect allowlist — `site_url` plus
 * `additional_redirect_urls` in supabase/config.toml locally, and
 * Authentication -> URL Configuration on a hosted project. Supabase falls back
 * to `site_url` without a word when the URL is not allowed, which looks exactly
 * like this function being ignored.
 */
export async function signInWithGoogle(redirectTo = window.location.href) {
  if (!supabase) return { error: new Error('Supabase is not configured') }
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut()
}

export async function getAccessToken() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}
