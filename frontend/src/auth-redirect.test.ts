import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Where Google sends the viewer back.
 *
 * A shared gallery link is the product: the creator sends /g/<slug>, the client
 * opens it, signs in with Google, and must land on *that* gallery (ADR-009).
 * Redirecting to the bare origin drops the slug and strands them on the landing
 * page, so the link only works if they click it a second time.
 */

type OAuthArgs = { provider: string; options: { redirectTo: string } }

const signInWithOAuth = vi.fn(async (_args: OAuthArgs) => ({ data: null, error: null }))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { signInWithOAuth } }),
}))

// vite.config.ts forces these empty so the rest of the suite runs in demo mode.
// This file needs a real client, so stub them before the module is evaluated.
vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321')
vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-publishable-key')

const { signInWithGoogle } = await import('./lib/supabase')

function redirectTarget() {
  return signInWithOAuth.mock.calls[0][0].options.redirectTo
}

function visit(path: string) {
  window.history.pushState({}, '', path)
}

beforeEach(() => {
  signInWithOAuth.mockClear()
  visit('/')
})

describe('signInWithGoogle', () => {
  it('asks Google, since it is the only provider clients get', async () => {
    await signInWithGoogle()
    expect(signInWithOAuth.mock.calls[0][0].provider).toBe('google')
  })

  it('returns the viewer to the shared gallery they signed in from', async () => {
    visit('/g/a-shoot')
    await signInWithGoogle()
    expect(redirectTarget()).toContain('/g/a-shoot')
    expect(redirectTarget()).toBe(window.location.href)
  })

  it('keeps a query string the shared link may carry', async () => {
    visit('/g/a-shoot?from=email')
    await signInWithGoogle()
    expect(redirectTarget()).toContain('/g/a-shoot?from=email')
  })

  it('does not collapse the gallery path to the origin', async () => {
    visit('/g/a-shoot')
    await signInWithGoogle()
    expect(redirectTarget()).not.toBe(window.location.origin)
    expect(redirectTarget()).not.toBe(`${window.location.origin}/`)
  })

  it('still honours an explicit target, for the admin screens', async () => {
    visit('/g/a-shoot')
    await signInWithGoogle('http://localhost:5173/admin')
    expect(redirectTarget()).toBe('http://localhost:5173/admin')
  })
})
