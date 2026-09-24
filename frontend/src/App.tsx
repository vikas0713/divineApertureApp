import { useEffect, useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Check, ChevronLeft, ChevronRight, Cloud, Download, ExternalLink, FolderOpen, Heart, LogOut, Menu, Plus, RefreshCw, Settings, Sparkles, X } from 'lucide-react'
import { Brand } from './components/Brand'
import { GoogleButton } from './components/GoogleButton'
import { AdSlot } from './components/AdSlot'
import { StorageLogos } from './components/StorageLogos'
import { PhotoCard } from './components/PhotoCard'
import { WaitlistForm } from './components/WaitlistForm'
import { AdminDashboard } from './components/AdminDashboard'
import { GalleryPage } from './components/GalleryPage'
import { demoEvent } from './data/demo'
import { initializeAnalytics, track } from './lib/analytics'
import { isSupabaseConfigured, signInWithPassword, signOut, supabase } from './lib/supabase'
import type { GalleryEvent, Photo, SessionUser } from './types'
import './styles.css'

type LoginMode = 'client' | 'admin'

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null)
  // Distinguishes "no session" from "session not resolved yet". Without this,
  // a hard refresh on /admin redirects to the login page before
  // getSession() has had a chance to restore the session.
  const [sessionLoaded, setSessionLoaded] = useState(!isSupabaseConfigured)
  const [event, setEvent] = useState<GalleryEvent>(demoEvent)
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const adsEnabled = import.meta.env.VITE_ADS_ENABLED === 'true'
  const isDemo = !isSupabaseConfigured
  const navigate = useNavigate()

  useEffect(() => {
    if (import.meta.env.VITE_GA_MEASUREMENT_ID) initializeAnalytics()
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUser(toSessionUser(data.session.user))
      setSessionLoaded(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toSessionUser(session.user) : null)
      setSessionLoaded(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  function openGallery() { track('gallery_viewed', { gallery_type: 'private' }); navigate('/gallery') }
  function openAdmin() { track('admin_workspace_viewed'); navigate('/admin') }
  async function logout() { await signOut(); setUser(null); navigate('/') }

  function demoLogin(role: 'superadmin' | 'client') {
    setUser(role === 'superadmin'
      ? { email: 'studio@divineaperture.test', name: 'Divine Aperture', role: 'superadmin' }
      : { email: 'client@example.com', name: 'Gallery guest', role: 'client' })
    navigate(role === 'superadmin' ? '/admin' : '/gallery')
  }

  return (
    <Routes>
      <Route path="/" element={
        <CreatorLanding user={user} mobileMenu={mobileMenu} onMenu={() => setMobileMenu(!mobileMenu)} onGallery={openGallery} onAdmin={openAdmin} onLogin={() => navigate('/login')} onWaitlist={() => navigate('/waitlist')} onLogout={logout} isDemo={isDemo} />
      } />
      <Route path="/gallery" element={
        <Gallery event={event} user={user} adsEnabled={adsEnabled && event.plan === 'free'} activePhoto={activePhoto} onActivePhoto={setActivePhoto} onBack={() => navigate('/')} onLogin={() => navigate('/login')} />
      } />
      <Route path="/g/:slug" element={
        <GalleryPage user={user} sessionLoaded={sessionLoaded} onBack={() => navigate('/')} />
      } />
      <Route path="/waitlist" element={<WaitlistScreen onBack={() => navigate('/')} />} />
      <Route path="/login" element={
        <LoginScreen mode="client" onBack={() => navigate('/')} onDemoLogin={() => demoLogin('client')} onClientLogin={() => { setUser({ email: 'client@example.com', name: 'Gallery guest', role: 'client' }); openGallery() }} />
      } />
      <Route path="/admin/login" element={
        user?.role === 'superadmin'
          ? <Navigate to="/admin" replace />
          : <LoginScreen mode="admin" onBack={() => navigate('/')} onDemoLogin={() => demoLogin('superadmin')} onClientLogin={() => undefined} />
      } />
      <Route path="/admin" element={
        <RequireSuperadmin user={user} sessionLoaded={sessionLoaded}>
          <AdminDashboard onBack={() => navigate('/')} onLogout={logout} />
        </RequireSuperadmin>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function toSessionUser(user: { email?: string | null; user_metadata?: Record<string, string> }): SessionUser {
  const email = user.email ?? ''
  return {
    email,
    name: user.user_metadata?.full_name ?? 'Client',
    role: email && email === import.meta.env.VITE_SUPERADMIN_EMAIL ? 'superadmin' : 'client',
    avatar: user.user_metadata?.avatar_url,
  }
}

/**
 * Gate for the admin area. The backend enforces the same rule with a 403 — this
 * only decides what the browser shows, and where to send you instead.
 */
function RequireSuperadmin({ user, sessionLoaded, children }: { user: SessionUser | null; sessionLoaded: boolean; children: ReactElement }) {
  const location = useLocation()
  if (!sessionLoaded) return <div className="page centered-page"><main className="login-card"><p className="eyebrow">One moment</p></main></div>
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  if (user.role !== 'superadmin') return <Navigate to="/" replace />
  return children
}

function Header({ user, onBack, onLogin, onLogout, compact = false }: { user: SessionUser | null; onBack?: () => void; onLogin?: () => void; onLogout?: () => void; compact?: boolean }) {
  return <header className="site-header"><div className="header-inner">{onBack ? <button className="back-button" onClick={onBack}><ArrowLeft size={16} /> Back</button> : <Brand compact={compact} />}<div className="header-right">{user ? <><span className="user-pill"><span className="status-dot" />{user.name}</span><button className="text-button" onClick={onLogout}><LogOut size={15} /> Sign out</button></> : <button className="text-button" onClick={onLogin}>Viewer login <ArrowUpRight size={15} /></button>}</div></div></header>
}

function Landing({ user, mobileMenu, onMenu, onGallery, onAdmin, onLogin, onWaitlist, onLogout, isDemo }: { user: SessionUser | null; mobileMenu: boolean; onMenu: () => void; onGallery: () => void; onAdmin: () => void; onLogin: () => void; onWaitlist: () => void; onLogout: () => void; isDemo: boolean }) {
  return <div className="page landing-page"><Header user={user} onLogin={onLogin} onLogout={onLogout} /><main><section className="hero"><div className="hero-copy"><p className="eyebrow">A private home for your photographs</p><h1>Let the work<br /><em>speak quietly.</em></h1><p className="hero-lede">Divine Aperture is a considered way to deliver your photographic stories — from your Drive to the people who matter.</p><div className="hero-actions"><button className="button button-dark" onClick={onGallery}>View a gallery <ArrowUpRight size={16} /></button><button className="button button-light" onClick={onWaitlist}>For creators <ArrowUpRight size={16} /></button></div>{isDemo && <p className="demo-note">Demo mode · connect Supabase to enable Google login</p>}</div><div className="hero-image"><img src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1500&q=88" alt="A couple in a quiet outdoor setting" /><span>01 / 08</span></div></section><section className="statement"><p className="eyebrow">A studio, not a storage room</p><div><h2>Give every story<br /><em>the space it deserves.</em></h2><p>Upload to Google Drive. Share one private link. Let the images lead.</p></div></section><section className="feature-grid"><article className="feature-large"><img src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=85" alt="Wedding details" /><span>For the moments in between</span></article><article className="feature-copy"><Sparkles size={20} strokeWidth={1.2} /><h3>Uncomplicated<br />by design.</h3><p>Your clients sign in with Google, find their gallery, and stay with the photographs. No clutter. No file-management feeling.</p><button className="arrow-link" onClick={onAdmin}>Enter studio <ArrowUpRight size={15} /></button></article></section><section className="creator-cta"><div><p className="eyebrow">For photographers</p><h2>Make room for<br /><em>the good work.</em></h2></div><button className="button button-dark" onClick={onWaitlist}>Join the waitlist <ArrowUpRight size={16} /></button></section></main><footer className="site-footer"><Brand /><span>© 2025 Divine Aperture Studio</span><div><button onClick={onWaitlist}>Creator waitlist</button><button onClick={onLogin}>Client login</button></div></footer>{mobileMenu && <div className="mobile-menu"><button onClick={onGallery}>View gallery</button><button onClick={onWaitlist}>Join waitlist</button><button onClick={onLogin}>Client login</button><button onClick={onMenu}>Close</button></div>}</div>
}

function CreatorLanding({ user, mobileMenu, onMenu, onGallery, onAdmin, onLogin, onWaitlist, onLogout, isDemo }: { user: SessionUser | null; mobileMenu: boolean; onMenu: () => void; onGallery: () => void; onAdmin: () => void; onLogin: () => void; onWaitlist: () => void; onLogout: () => void; isDemo: boolean }) {
  return <div className="page landing-page"><Header user={user} onLogout={onLogout} /><main><section className="hero"><div className="hero-copy"><p className="eyebrow">Photo sharing for creators</p><h1>Let the work<br /><em>travel beautifully.</em></h1><p className="hero-lede">Give every customer a private, effortless way to experience your photographs — wherever you keep the originals.</p><div className="hero-actions"><button className="button button-dark" onClick={onGallery}>View a gallery <ArrowUpRight size={16} /></button><button className="button button-light" onClick={onWaitlist}>For creators <ArrowUpRight size={16} /></button></div>{isDemo && <p className="demo-note">Demo mode · connect Supabase to enable Google login</p>}</div><div className="hero-image"><img src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1500&q=88" alt="Photographs shared with a couple" /><span>01 / 08</span></div></section><section className="statement"><div><p className="eyebrow">Your storage, your choice</p><StorageLogos /></div><div><h2>One beautiful link<br /><em>for every customer.</em></h2><p>Use Google Drive, Dropbox, or storage from Divine Aperture. We make the sharing experience feel effortless.</p></div></section><section className="feature-grid"><article className="feature-large"><img src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=85" alt="A curated photo collection" /><span>From your archive to their hands</span></article><article className="feature-copy"><Sparkles size={20} strokeWidth={1.2} /><h3>Simple for you.<br />Beautiful for them.</h3><p>Bring your photos from the storage you already use, send one private link, and let customers browse, select, download, and request prints.</p><button className="arrow-link" onClick={onAdmin}>Enter creator space <ArrowUpRight size={15} /></button></article></section><section className="creator-cta"><div><p className="eyebrow">For photographers and visual creators</p><h2>Share more.<br /><em>Manage less.</em></h2></div><button className="button button-dark" onClick={onWaitlist}>Join the waitlist <ArrowUpRight size={16} /></button></section></main><footer className="site-footer"><Brand /><span>© 2025 Divine Aperture Studio</span><div><button onClick={onWaitlist}>Creator waitlist</button><button onClick={onLogin}>Customer login</button></div></footer>{mobileMenu && <div className="mobile-menu"><button onClick={onGallery}>View gallery</button><button onClick={onWaitlist}>Join waitlist</button><button onClick={onLogin}>Customer login</button><button onClick={onMenu}>Close</button></div>}</div>
}

function LoginScreen({ mode, onBack, onClientLogin, onDemoLogin }: { mode: LoginMode; onBack: () => void; onClientLogin: () => void; onDemoLogin: () => void }) {
  const isAdmin = mode === 'admin'
  return <div className="page centered-page"><Header user={null} onBack={onBack} onLogin={() => undefined} /><main className="login-card"><p className="eyebrow">{isAdmin ? 'Private studio access' : 'Private client access'}</p><h1>{isAdmin ? <>Enter<br /><em>the studio.</em></> : <>Welcome to<br /><em>your gallery.</em></>}</h1><p>{isAdmin ? 'Sign in with the allowlisted studio account to manage events and imports.' : 'Sign in with Google to view your photographs, make selections, and request prints.'}</p><div className="login-panel">{isAdmin && <PasswordLogin onDemoLogin={onDemoLogin} />}<GoogleButton label={isAdmin ? 'Continue as studio admin' : 'Continue as client'} onDemoLogin={onDemoLogin} />{!isAdmin && <button className="demo-link" onClick={onClientLogin}>Use demo client access</button>}<small>By continuing, you agree to the studio’s privacy policy.</small></div></main></div>
}

function PasswordLogin({ onDemoLogin }: { onDemoLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')

  async function submit(formEvent: FormEvent) {
    formEvent.preventDefault()
    setError('')
    // Without Supabase there is nothing to authenticate against; fall through
    // to the same demo session the Google button uses.
    if (!isSupabaseConfigured) { onDemoLogin(); return }
    setSigningIn(true)
    try {
      await signInWithPassword(email, password)
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Unable to sign in')
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <form className="password-login" onSubmit={submit}>
      <label>Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.com" autoComplete="username" /></label>
      <label>Password<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="button button-dark" type="submit" disabled={signingIn}>{signingIn ? 'Signing in…' : 'Sign in'} <ArrowUpRight size={15} /></button>
      <span className="login-divider">or</span>
    </form>
  )
}

function WaitlistScreen({ onBack }: { onBack: () => void }) {
  return <div className="page waitlist-page"><Header user={null} onBack={onBack} /><main className="waitlist-layout"><div><p className="eyebrow">A considered beginning</p><h1>There is room<br /><em>for your work here.</em></h1><p className="hero-lede">We’re opening Divine Aperture slowly, with a small group of photographers who care about how their work is experienced.</p></div><div className="waitlist-card"><WaitlistForm /></div></main></div>
}

function LegacyGallery({ event, user, adsEnabled, activePhoto, onActivePhoto, onBack, onLogin }: { event: GalleryEvent; user: SessionUser | null; adsEnabled: boolean; activePhoto: Photo | null; onActivePhoto: (photo: Photo | null) => void; onBack: () => void; onLogin: () => void }) {
  const [photos, setPhotos] = useState(event.photos)
  const [showRequest, setShowRequest] = useState(false)
  const selected = photos.filter((photo) => photo.selected)
  const activeIndex = activePhoto ? photos.findIndex((photo) => photo.id === activePhoto.id) : -1
  const toggle = (id: string, key: 'favorite' | 'selected') => setPhotos((current) => current.map((photo) => photo.id === id ? { ...photo, [key]: !photo[key] } : photo))
  const move = (direction: number) => { const next = photos[(activeIndex + direction + photos.length) % photos.length]; onActivePhoto(next) }
  return <div className="page gallery-page"><Header user={user} onBack={onBack} onLogin={onLogin} onLogout={() => undefined} /><main><section className="gallery-intro"><div><p className="eyebrow">Private gallery / 01</p><h1>{event.title}</h1><p>{event.subtitle}</p></div><div className="gallery-meta"><span>{event.date}</span><span>{event.location}</span><button className="button button-outline" onClick={() => setShowRequest(true)}>Request prints <ArrowUpRight size={15} /></button></div></section><section className="gallery-cover"><img src={event.cover} alt={event.title} /><div><span>For the days we want to remember</span><small>{photos.length} photographs</small></div></section><div className="gallery-toolbar"><span>{selected.length ? `${selected.length} selected` : 'A visual record'}</span><div>{selected.length > 0 && <button className="text-button" onClick={() => setShowRequest(true)}>Request selected prints <ArrowUpRight size={15} /></button>}<button className="text-button" onClick={() => alert('Download requests are controlled by the studio.')}>Download <Download size={15} /></button></div></div><section className="photo-grid">{photos.map((photo) => <PhotoCard key={photo.id} photo={photo} onOpen={() => onActivePhoto(photo)} onToggleFavorite={() => toggle(photo.id, 'favorite')} onToggleSelect={() => toggle(photo.id, 'selected')} />)}</section><AdSlot enabled={adsEnabled} /></main>{activePhoto && <div className="lightbox" role="dialog" aria-modal="true"><button className="lightbox-close" onClick={() => onActivePhoto(null)}><X /></button><button className="lightbox-arrow left" onClick={() => move(-1)}><ChevronLeft /></button><img src={activePhoto.image} alt={activePhoto.title} /><div className="lightbox-info"><span>{activePhoto.title}</span><span>{activeIndex + 1} / {photos.length}</span></div><button className="lightbox-arrow right" onClick={() => move(1)}><ChevronRight /></button></div>}{showRequest && <div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={() => setShowRequest(false)}><X size={17} /></button><p className="eyebrow">A little more permanence</p><h2>Request prints</h2><p>Tell the studio which photographs you’d like to bring into the room.</p><textarea placeholder="A note for the studio (optional)" /><button className="button button-dark" onClick={() => { setShowRequest(false); alert('Your request has been noted for the studio.') }}>Send request <ArrowUpRight size={15} /></button></div></div>}</div>
}

function Gallery({ event, user, adsEnabled, activePhoto, onActivePhoto, onBack, onLogin }: { event: GalleryEvent; user: SessionUser | null; adsEnabled: boolean; activePhoto: Photo | null; onActivePhoto: (photo: Photo | null) => void; onBack: () => void; onLogin: () => void }) {
  const [photos, setPhotos] = useState(event.photos)
  const [page, setPage] = useState(1)
  const [showRequest, setShowRequest] = useState(false)
  const pageSize = 12
  const selected = photos.filter((photo) => photo.selected)
  const pageCount = Math.max(1, Math.ceil(photos.length / pageSize))
  const visiblePhotos = photos.slice((page - 1) * pageSize, page * pageSize)
  const toggle = (id: string, key: 'favorite' | 'selected') => setPhotos((current) => current.map((photo) => photo.id === id ? { ...photo, [key]: !photo[key] } : photo))
  const setGalleryPage = (nextPage: number) => { setPage(nextPage); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  return <div className="page gallery-page"><Header user={user} onBack={onBack} onLogin={onLogin} onLogout={() => undefined} /><main><section className="gallery-intro"><div><p className="eyebrow">Private collection / 01</p><h1>{event.title}</h1><p>{event.subtitle}</p></div><div className="gallery-meta"><span>{event.date}</span><span>{event.location}</span><button className="button button-outline" onClick={() => setShowRequest(true)}>Request prints <ArrowUpRight size={15} /></button></div></section><section className="gallery-cover"><img src={event.cover} alt={event.title} loading="eager" decoding="async" /><div><span>For the days we want to remember</span><small>{photos.length} photographs</small></div></section><div className="gallery-toolbar"><span>{selected.length ? `${selected.length} selected` : 'A visual record'}</span><div>{selected.length > 0 && <button className="text-button" onClick={() => setShowRequest(true)}>Request selected prints <ArrowUpRight size={15} /></button>}<button className="text-button" onClick={() => alert('Download requests are controlled by the studio.')}>Download <Download size={15} /></button></div></div><section className="photo-grid">{visiblePhotos.map((photo) => <PhotoCard key={photo.id} photo={photo} onOpen={() => onActivePhoto(photo)} onToggleFavorite={() => toggle(photo.id, 'favorite')} onToggleSelect={() => toggle(photo.id, 'selected')} />)}</section><Pagination page={page} pageCount={pageCount} onChange={setGalleryPage} /><AdSlot enabled={adsEnabled} /></main>{activePhoto && <div className="lightbox" role="dialog" aria-modal="true"><button className="lightbox-close" onClick={() => onActivePhoto(null)}><X /></button><img src={activePhoto.image} alt={activePhoto.title} decoding="async" /><div className="lightbox-info"><span>{activePhoto.title}</span></div></div>}{showRequest && <div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={() => setShowRequest(false)}><X size={17} /></button><p className="eyebrow">A little more permanence</p><h2>Request prints</h2><p>Tell the studio which photographs you’d like to bring into the room.</p><textarea placeholder="A note for the studio (optional)" /><button className="button button-dark" onClick={() => { setShowRequest(false); alert('Your request has been noted for the studio.') }}>Send request <ArrowUpRight size={15} /></button></div></div>}</div>
}

function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (page: number) => void }) {
  if (pageCount <= 1) return null
  return <nav className="gallery-pagination" aria-label="Gallery pages"><button className="pagination-button" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button className="pagination-button" disabled={page === pageCount} onClick={() => onChange(page + 1)}>Next</button></nav>
}
