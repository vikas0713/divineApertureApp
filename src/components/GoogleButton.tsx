import { LogIn } from 'lucide-react'
import { signInWithGoogle, isSupabaseConfigured } from '../lib/supabase'
import { track } from '../lib/analytics'

export function GoogleButton({ label = 'Continue with Google' }: { label?: string }) {
  async function handleClick() {
    track('google_login_started', { area: label.includes('client') ? 'client' : 'admin' })
    if (!isSupabaseConfigured) {
      window.dispatchEvent(new CustomEvent('demo-login'))
      return
    }
    await signInWithGoogle()
  }

  return <button className="button button-dark google-button" onClick={handleClick}><LogIn size={17} /> {label}</button>
}
