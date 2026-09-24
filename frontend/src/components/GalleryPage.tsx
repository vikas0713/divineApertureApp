import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
import { Brand } from './Brand'
import { GoogleButton } from './GoogleButton'
import { assetUrl, fetchGallery } from '../lib/api'
import { getAccessToken } from '../lib/supabase'
import { track } from '../lib/analytics'
import type { AdminEvent, ApiPhoto, SessionUser } from '../types'

/**
 * The client gallery. A viewer must be signed in before anything loads — the
 * API refuses without a bearer token, and this gate keeps them from seeing an
 * error instead of a prompt.
 *
 * NOTE: photos are served from Drive's public URLs, so this gates the page,
 * not the images. Real privacy needs the R2 pipeline.
 */
export function GalleryPage({ user, sessionLoaded, onBack }: { user: SessionUser | null; sessionLoaded: boolean; onBack: () => void }) {
  const { slug = '' } = useParams()
  const [event, setEvent] = useState<AdminEvent | null>(null)
  const [photos, setPhotos] = useState<ApiPhoto[]>([])
  const [page, setPage] = useState(1)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const active = activeIndex === null ? null : photos[activeIndex] ?? null
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const token = await getAccessToken()
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const payload = await fetchGallery(slug, token)
      setEvent(payload.event)
      setPhotos(payload.photos)
      track('gallery_viewed', { gallery_type: 'private' })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to open this gallery')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { if (user) void load() }, [user, load])

  // 546 photos in one page means 546 proxy requests on a 0.1 vCPU instance.
  const pageSize = 24
  const pageCount = Math.max(1, Math.ceil(photos.length / pageSize))
  const visible = photos.slice((page - 1) * pageSize, page * pageSize)

  // Arrow keys move through the gallery; Escape closes. Bound only while the
  // lightbox is open so the grid keeps normal scrolling behaviour.
  useEffect(() => {
    if (activeIndex === null) return
    function onKey(keyEvent: KeyboardEvent) {
      if (keyEvent.key === 'Escape') { setActiveIndex(null); return }
      if (keyEvent.key !== 'ArrowLeft' && keyEvent.key !== 'ArrowRight') return
      keyEvent.preventDefault()
      const step = keyEvent.key === 'ArrowRight' ? 1 : -1
      setActiveIndex((current) => {
        if (current === null) return null
        const next = (current + step + photos.length) % photos.length
        // Keep the grid on the page holding the photo now being viewed, so
        // closing the lightbox does not jump somewhere unrelated.
        setPage(Math.floor(next / pageSize) + 1)
        return next
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeIndex, photos.length])

  if (!sessionLoaded) return <Shell><p className="eyebrow">One moment</p></Shell>

  if (!user) {
    return (
      <Shell>
        <p className="eyebrow">Private gallery</p>
        <h1>Sign in to see<br /><em>your photographs.</em></h1>
        <p>This gallery is shared with you. Continue with Google to open it.</p>
        <div className="login-panel"><GoogleButton label="Continue with Google" /></div>
      </Shell>
    )
  }

  if (loading) return <Shell><p className="eyebrow">Opening your gallery</p></Shell>
  if (error) return <Shell><p className="eyebrow">Not available</p><h1>This gallery<br /><em>isn’t open.</em></h1><p>{error}</p><button className="button button-light" onClick={onBack}>Back to Divine Aperture</button></Shell>
  if (!event) return null

  return (
    <div className="page gallery-page">
      <header className="site-header"><div className="header-inner"><Brand /><span className="user-pill"><span className="status-dot" />{user.name}</span></div></header>
      <main>
        <section className="gallery-intro">
          <div><p className="eyebrow">Private collection</p><h1>{event.title}</h1>{event.subtitle && <p>{event.subtitle}</p>}</div>
          <div className="gallery-meta">{event.event_date && <span>{event.event_date}</span>}{event.location && <span>{event.location}</span>}</div>
        </section>
        {event.hero_image_url && (
          <section className="gallery-cover">
            <img src={assetUrl(event.hero_image_url)} alt={event.title} loading="eager" decoding="async" />
            <div><span>For the days we want to remember</span><small>{photos.length} photographs</small></div>
          </section>
        )}
        {photos.length === 0
          ? <p className="section-lede gallery-empty">The studio hasn’t added photographs to this gallery yet.</p>
          : (
            <section className="photo-grid">
              {visible.map((photo, offset) => (
                <article className="photo-card" key={photo.id}>
                  <div className="photo-frame">
                    <button className="photo-image-button" onClick={() => setActiveIndex((page - 1) * pageSize + offset)} aria-label={`Open ${photo.filename}`}>
                      <img src={assetUrl(photo.thumbnail_url)} alt={photo.filename} loading="lazy" decoding="async" />
                    </button>
                    {photo.download_url && (
                      <a
                        className="photo-download"
                        href={assetUrl(photo.download_url)}
                        download
                        onClick={(clickEvent) => clickEvent.stopPropagation()}
                        title={`Download ${photo.filename}`}
                        aria-label={`Download ${photo.filename}`}
                      >
                        <Download size={15} />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </section>
          )}
        {pageCount > 1 && (
          <nav className="gallery-pagination" aria-label="Gallery pages">
            <button className="pagination-button" disabled={page === 1} onClick={() => { setPage(page - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Previous</button>
            <span>Page {page} of {pageCount}</span>
            <button className="pagination-button" disabled={page === pageCount} onClick={() => { setPage(page + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Next</button>
          </nav>
        )}
      </main>
      {active && (
        <div className="lightbox" role="dialog" aria-modal="true">
          <button className="lightbox-close" onClick={() => setActiveIndex(null)} aria-label="Close"><X /></button>
          <button className="lightbox-arrow left" onClick={() => setActiveIndex((i) => i === null ? null : (i - 1 + photos.length) % photos.length)} aria-label="Previous photograph"><ChevronLeft /></button>
          <button className="lightbox-arrow right" onClick={() => setActiveIndex((i) => i === null ? null : (i + 1) % photos.length)} aria-label="Next photograph"><ChevronRight /></button>
          <img src={assetUrl(active.display_url)} alt={active.filename} decoding="async" />
          <div className="lightbox-info">
            <span>{active.filename} · {(activeIndex ?? 0) + 1} / {photos.length}</span>
            {active.download_url && (
              <a className="button button-light lightbox-download" href={assetUrl(active.download_url)} download>
                <Download size={15} /> Download
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="page centered-page"><header className="site-header"><div className="header-inner"><Brand /></div></header><main className="login-card">{children}</main></div>
}
