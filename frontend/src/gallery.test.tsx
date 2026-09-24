import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const PAGE_SIZE = 24

function photo(n: number) {
  return {
    id: `p${n}`, filename: `photo-${n}.jpg`, mime_type: 'image/jpeg',
    width: 100, height: 100, sort_order: n, drive_file_id: `d${n}`,
    display_url: `/images/d${n}`, thumbnail_url: `/images/t${n}`, download_url: `/images/dl${n}`,
  }
}

// 30 photos: more than one page, so boundaries are exercised.
const photos = Array.from({ length: 30 }, (_, i) => photo(i + 1))

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
    expect(links).toHaveLength(PAGE_SIZE)
    expect(links[0].getAttribute('href')).toBe('/images/dl1')
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
    expect(lightboxCaption(await openFirst())).toContain('photo-1.jpg')
    expect(lightboxCaption(await openFirst())).toContain('1 / 30')
  })

  it('ArrowRight advances', async () => {
    const c = await openFirst()
    press('ArrowRight')
    expect(lightboxCaption(c)).toContain('photo-2.jpg')
  })

  it('ArrowLeft goes back', async () => {
    const c = await openFirst()
    press('ArrowRight')
    press('ArrowLeft')
    expect(lightboxCaption(c)).toContain('photo-1.jpg')
  })

  it('wraps around at both ends', async () => {
    const c = await openFirst()
    press('ArrowLeft')
    expect(lightboxCaption(c)).toContain('photo-30.jpg')
    press('ArrowRight')
    expect(lightboxCaption(c)).toContain('photo-1.jpg')
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


describe('pagination', () => {
  it('renders one page of photos, not all of them', async () => {
    const c = await mount()
    expect(c.querySelectorAll('.photo-card')).toHaveLength(PAGE_SIZE)
    expect(c.querySelector('.gallery-pagination')?.textContent).toContain('Page 1 of 2')
  })

  it('Next shows the remainder', async () => {
    const c = await mount()
    const next = [...c.querySelectorAll('.pagination-button')].find((b) => b.textContent === 'Next') as HTMLButtonElement
    act(() => { next.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(c.querySelectorAll('.photo-card')).toHaveLength(30 - PAGE_SIZE)
    expect(c.querySelector('.gallery-pagination')?.textContent).toContain('Page 2 of 2')
  })

  it('arrow keys cross the page boundary instead of wrapping within a page', async () => {
    const c = await mount()
    const cards = [...c.querySelectorAll('.photo-image-button')]
    // Open the last photo on page 1 (index 23).
    act(() => { cards[PAGE_SIZE - 1].dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(lightboxCaption(c)).toContain(`photo-${PAGE_SIZE}.jpg`)
    press('ArrowRight')
    expect(lightboxCaption(c)).toContain(`photo-${PAGE_SIZE + 1}.jpg`)
    // The grid behind it followed onto page 2.
    expect(c.querySelector('.gallery-pagination')?.textContent).toContain('Page 2 of 2')
  })
})
