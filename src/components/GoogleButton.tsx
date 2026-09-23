import { LogIn } from 'lucide-react'
import { signInWithGoogle, isSupabaseConfigured } from '../lib/supabase'
import { track } from '../lib/analytics'

export function GoogleButton({ label = 'Continue with Google', onDemoLogin }: { label?: string; onDemoLogin?: () => void }) {
  async function handleClick() {
    track('google_login_started', { area: label.includes('client') ? 'client' : 'admin' })
    if (!isSupabaseConfigured) {
      onDemoLogin?.()
      return
    }
    await signInWithGoogle()
  }

  return <button className="button button-dark google-button" onClick={handleClick}><LogIn size={17} /> {label}</button>
}
