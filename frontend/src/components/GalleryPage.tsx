import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, Download, X } from 'lucide-react'
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
  const [active, setActive] = useState<ApiPhoto | null>(null)
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
              {photos.map((photo) => (
                <article className="photo-card" key={photo.id}>
                  <button className="photo-image-button" onClick={() => setActive(photo)} aria-label={`Open ${photo.filename}`}>
                    <img src={assetUrl(photo.thumbnail_url)} alt={photo.filename} loading="lazy" decoding="async" />
                  </button>
                </article>
              ))}
            </section>
          )}
      </main>
      {active && (
        <div className="lightbox" role="dialog" aria-modal="true">
          <button className="lightbox-close" onClick={() => setActive(null)}><X /></button>
          <img src={assetUrl(active.display_url)} alt={active.filename} decoding="async" />
          <div className="lightbox-info">
            <span>{active.filename}</span>
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
