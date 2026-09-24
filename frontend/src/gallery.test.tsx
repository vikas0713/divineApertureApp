import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const photos = [
  { id: 'p1', filename: 'one.ARW', mime_type: 'image/x-sony-arw', width: 4024, height: 6024, sort_order: 0, drive_file_id: 'd1', display_url: '/images/d1', thumbnail_url: '/images/t1', download_url: '/images/dl1' },
  { id: 'p2', filename: 'two.jpg', mime_type: 'image/jpeg', width: 1849, height: 4000, sort_order: 1, drive_file_id: 'd2', display_url: '/images/d2', thumbnail_url: '/images/t2', download_url: '/images/dl2' },
  { id: 'p3', filename: 'three.jpg', mime_type: 'image/jpeg', width: 100, height: 100, sort_order: 2, drive_file_id: 'd3', display_url: '/images/d3', thumbnail_url: '/images/t3', download_url: '/images/dl3' },
]

const event = {
  id: 'e1', title: 'A shoot', subtitle: null, event_date: null, location: null,
  gallery_slug: 'a-shoot', status: 'published', plan: 'free', hero_image_url: null,
  storage_type: 'google_drive', storage_url: null, drive_folder_id: 'f1',
  created_at: null, downloads_enabled: true,
}

vi.mock('./lib/supabase', () => ({
  getAccessToken: vi.fn(async () => 'token'),
  isSupabaseConfigured: true,
  signInWithGoogle: vi.fn(),
}))
vi.mock('./lib/api', () => ({
  assetUrl: (p: string | null) => p ?? '',
  fetchGallery: vi.fn(async () => ({ event, photos })),
}))

const { GalleryPage } = await import('./components/GalleryPage')

const user = { email: 'v@example.com', name: 'Viewer', role: 'client' as const }

async function mount() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  await act(async () => {
    createRoot(container).render(
      <MemoryRouter initialEntries={['/g/a-shoot']}>
        <Routes>
          <Route path="/g/:slug" element={<GalleryPage user={user} sessionLoaded onBack={() => {}} />} />
        </Routes>
      </MemoryRouter>,
    )
  })
  return container
}

function press(key: string) {
  act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })) })
}

function lightboxCaption(c: HTMLElement) {
  return c.querySelector('.lightbox-info span')?.textContent ?? ''
}

beforeEach(() => { document.body.innerHTML = '' })

describe('gallery grid', () => {
  it('puts a download link on every photo without opening it', async () => {
    const c = await mount()
    const links = [...c.querySelectorAll('a.photo-download')]
    expect(links).toHaveLength(3)
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/images/dl1', '/images/dl2', '/images/dl3'])
    // `download` makes the browser save rather than navigate.
    expect(links.every((a) => a.hasAttribute('download'))).toBe(true)
    // The lightbox must not have opened.
    expect(c.querySelector('.lightbox')).toBeNull()
  })

  it('omits download links when the event has downloads off', async () => {
    const api = await import('./lib/api')
    vi.mocked(api.fetchGallery).mockResolvedValueOnce({
      event: { ...event, downloads_enabled: false },
      photos: photos.map((p) => ({ ...p, download_url: null })),
    } as never)
    const c = await mount()
    expect(c.querySelectorAll('a.photo-download')).toHaveLength(0)
  })
})

describe('lightbox arrow keys', () => {
  async function openFirst() {
    const c = await mount()
    const open = c.querySelector('.photo-image-button') as HTMLButtonElement
    act(() => { open.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    return c
  }

  it('opens on the photo that was clicked', async () => {
    expect(lightboxCaption(await openFirst())).toContain('one.ARW')
    expect(lightboxCaption(await openFirst())).toContain('1 / 3')
  })

  it('ArrowRight advances', async () => {
    const c = await openFirst()
    press('ArrowRight')
    expect(lightboxCaption(c)).toContain('two.jpg')
  })

  it('ArrowLeft goes back', async () => {
    const c = await openFirst()
    press('ArrowRight')
    press('ArrowLeft')
    expect(lightboxCaption(c)).toContain('one.ARW')
  })

  it('wraps around at both ends', async () => {
    const c = await openFirst()
    press('ArrowLeft')
    expect(lightboxCaption(c)).toContain('three.jpg')
    press('ArrowRight')
    expect(lightboxCaption(c)).toContain('one.ARW')
  })

  it('Escape closes', async () => {
    const c = await openFirst()
    press('Escape')
    expect(c.querySelector('.lightbox')).toBeNull()
  })

  it('does not listen for arrows while the lightbox is shut', async () => {
    const c = await mount()
    press('ArrowRight')
    expect(c.querySelector('.lightbox')).toBeNull()
  })
})
