import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null
export const isSupabaseConfigured = Boolean(supabase)

export async function signInWithGoogle(redirectTo = window.location.origin) {
  if (!supabase) return { error: new Error('Supabase is not configured') }
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut()
}
