import { describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

/**
 * Run without Supabase env vars, so isSupabaseConfigured is false: the app is
 * in demo mode, sessionLoaded starts true, and nobody is signed in.
 *
 * A real DOM render (not renderToString) is required — <Navigate> resolves via
 * an effect, so redirects never happen during server rendering.
 */
function mountAt(path: string) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => {
    createRoot(container).render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
  })
  return container
}

function renderAt(path: string) {
  return mountAt(path).innerHTML
}

function clickText(container: HTMLElement, text: string) {
  const button = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
  if (!button) throw new Error(`No button containing "${text}"`)
  act(() => { button.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
}

describe('routing', () => {
  it('renders the creator landing at /', () => {
    expect(renderAt('/')).toContain('Photo sharing for creators')
  })

  it('renders the studio login at /admin/login', () => {
    const html = renderAt('/admin/login')
    expect(html).toContain('Private studio access')
    expect(html).toContain('Password')
  })

  it('keeps the client login separate from the studio login', () => {
    const html = renderAt('/login')
    expect(html).toContain('Private client access')
    expect(html).not.toContain('Password')
  })
})

describe('admin guard', () => {
  it('redirects an unauthenticated visit to /admin into the studio login', () => {
    const html = renderAt('/admin')
    expect(html).toContain('Private studio access')
    expect(html).not.toContain('Superadmin workspace')
  })

  it('never renders the dashboard shell to an unauthenticated visitor', () => {
    expect(renderAt('/admin')).not.toContain('New event')
  })
})

describe('unknown paths', () => {
  it('sends an unknown path back to the landing page', () => {
    expect(renderAt('/nonsense')).toContain('Photo sharing for creators')
  })
})

describe('admin guard admits a superadmin', () => {
  it('signing in at /admin/login lands on the dashboard', () => {
    const container = mountAt('/admin/login')
    expect(container.innerHTML).toContain('Private studio access')

    // Demo mode has no Supabase, so the studio-admin button signs in locally.
    clickText(container, 'Continue as studio admin')

    expect(container.innerHTML).toContain('Superadmin workspace')
    expect(container.innerHTML).toContain('New event')
  })
})
