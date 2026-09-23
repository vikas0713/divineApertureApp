import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, ChevronLeft, ChevronRight, Cloud, Download, ExternalLink, FolderOpen, Heart, LogOut, Menu, Plus, RefreshCw, Settings, Sparkles, X } from 'lucide-react'
import { Brand } from './components/Brand'
import { GoogleButton } from './components/GoogleButton'
import { AdSlot } from './components/AdSlot'
import { PhotoCard } from './components/PhotoCard'
import { WaitlistForm } from './components/WaitlistForm'
import { demoEvent } from './data/demo'
import { initializeAnalytics, track } from './lib/analytics'
import { isSupabaseConfigured, signOut, supabase } from './lib/supabase'
import type { GalleryEvent, Photo, SessionUser } from './types'
import './styles.css'

type View = 'landing' | 'gallery' | 'login' | 'waitlist' | 'admin'

export default function App() {
  const [view, setView] = useState<View>('landing')
  const [user, setUser] = useState<SessionUser | null>(null)
  const [event, setEvent] = useState<GalleryEvent>(demoEvent)
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const adsEnabled = import.meta.env.VITE_ADS_ENABLED === 'true'
  const isDemo = !isSupabaseConfigured

  useEffect(() => {
    if (import.meta.env.VITE_GA_MEASUREMENT_ID) initializeAnalytics()
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUser({ email: data.session.user.email ?? '', name: data.session.user.user_metadata?.full_name ?? 'Client', role: isSuperadmin(data.session.user.email) ? 'superadmin' : 'client', avatar: data.session.user.user_metadata?.avatar_url })
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser({ email: session.user.email ?? '', name: session.user.user_metadata?.full_name ?? 'Client', role: isSuperadmin(session.user.email) ? 'superadmin' : 'client', avatar: session.user.user_metadata?.avatar_url })
      else setUser(null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const demoLogin = () => setUser({ email: 'studio@divineaperture.test', name: 'Divine Aperture', role: 'superadmin' })
    window.addEventListener('demo-login', demoLogin)
    return () => window.removeEventListener('demo-login', demoLogin)
  }, [])

  function isSuperadmin(email?: string | null) { return Boolean(email && email === import.meta.env.VITE_SUPERADMIN_EMAIL) }
  function openGallery() { setView('gallery'); track('gallery_viewed', { gallery_type: 'private' }) }
  function openAdmin() { setView('admin'); track('admin_workspace_viewed') }
  async function logout() { await signOut(); setUser(null); setView('landing') }

  if (view === 'login') return <LoginScreen onBack={() => setView('landing')} onClientLogin={() => { setUser({ email: 'client@example.com', name: 'Gallery guest', role: 'client' }); openGallery() }} />
  if (view === 'waitlist') return <WaitlistScreen onBack={() => setView('landing')} />
  if (view === 'gallery') return <Gallery event={event} user={user} adsEnabled={adsEnabled && event.plan === 'free'} activePhoto={activePhoto} onActivePhoto={setActivePhoto} onBack={() => setView('landing')} onLogin={() => setView('login')} />
  if (view === 'admin') return <Admin event={event} user={user} onBack={() => setView('landing')} onLogout={logout} onCreate={() => setShowCreate(true)} onRefresh={() => setEvent((current) => ({ ...current, photos: [...current.photos] }))} />
  return <Landing user={user} mobileMenu={mobileMenu} onMenu={() => setMobileMenu(!mobileMenu)} onGallery={openGallery} onAdmin={openAdmin} onLogin={() => setView('login')} onWaitlist={() => setView('waitlist')} onLogout={logout} isDemo={isDemo} />
}

function Header({ user, onBack, onLogin, onLogout, compact = false }: { user: SessionUser | null; onBack?: () => void; onLogin?: () => void; onLogout?: () => void; compact?: boolean }) {
  return <header className="site-header"><div className="header-inner">{onBack ? <button className="back-button" onClick={onBack}><ArrowLeft size={16} /> Back</button> : <Brand compact={compact} />}<div className="header-right">{user ? <><span className="user-pill"><span className="status-dot" />{user.name}</span><button className="text-button" onClick={onLogout}><LogOut size={15} /> Sign out</button></> : <button className="text-button" onClick={onLogin}>Client login <ArrowUpRight size={15} /></button>}</div></div></header>
}

function Landing({ user, mobileMenu, onMenu, onGallery, onAdmin, onLogin, onWaitlist, onLogout, isDemo }: { user: SessionUser | null; mobileMenu: boolean; onMenu: () => void; onGallery: () => void; onAdmin: () => void; onLogin: () => void; onWaitlist: () => void; onLogout: () => void; isDemo: boolean }) {
  return <div className="page landing-page"><Header user={user} onLogin={onLogin} onLogout={onLogout} /><main><section className="hero"><div className="hero-copy"><p className="eyebrow">A private home for your photographs</p><h1>Let the work<br /><em>speak quietly.</em></h1><p className="hero-lede">Divine Aperture is a considered way to deliver your photographic stories — from your Drive to the people who matter.</p><div className="hero-actions"><button className="button button-dark" onClick={onGallery}>View a gallery <ArrowUpRight size={16} /></button><button className="button button-light" onClick={onWaitlist}>For creators <ArrowUpRight size={16} /></button></div>{isDemo && <p className="demo-note">Demo mode · connect Supabase to enable Google login</p>}</div><div className="hero-image"><img src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1500&q=88" alt="A couple in a quiet outdoor setting" /><span>01 / 08</span></div></section><section className="statement"><p className="eyebrow">A studio, not a storage room</p><div><h2>Give every story<br /><em>the space it deserves.</em></h2><p>Upload to Google Drive. Share one private link. Let the images lead.</p></div></section><section className="feature-grid"><article className="feature-large"><img src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=85" alt="Wedding details" /><span>For the moments in between</span></article><article className="feature-copy"><Sparkles size={20} strokeWidth={1.2} /><h3>Uncomplicated<br />by design.</h3><p>Your clients sign in with Google, find their gallery, and stay with the photographs. No clutter. No file-management feeling.</p><button className="arrow-link" onClick={onAdmin}>Enter studio <ArrowUpRight size={15} /></button></article></section><section className="creator-cta"><div><p className="eyebrow">For photographers</p><h2>Make room for<br /><em>the good work.</em></h2></div><button className="button button-dark" onClick={onWaitlist}>Join the waitlist <ArrowUpRight size={16} /></button></section></main><footer className="site-footer"><Brand /><span>© 2025 Divine Aperture Studio</span><div><button onClick={onWaitlist}>Creator waitlist</button><button onClick={onLogin}>Client login</button></div></footer>{mobileMenu && <div className="mobile-menu"><button onClick={onGallery}>View gallery</button><button onClick={onWaitlist}>Join waitlist</button><button onClick={onLogin}>Client login</button><button onClick={onMenu}>Close</button></div>}</div>
}

function LoginScreen({ onBack, onClientLogin }: { onBack: () => void; onClientLogin: () => void }) {
  return <div className="page centered-page"><Header user={null} onBack={onBack} onLogin={() => undefined} /><main className="login-card"><p className="eyebrow">Private client access</p><h1>Welcome to<br /><em>your gallery.</em></h1><p>Sign in with Google to view your photographs, make selections, and request prints.</p><GoogleButton label="Continue as client" /><button className="demo-link" onClick={onClientLogin}>Use demo client access</button><small>By continuing, you agree to the studio’s privacy policy.</small></main></div>
}

function WaitlistScreen({ onBack }: { onBack: () => void }) {
  return <div className="page waitlist-page"><Header user={null} onBack={onBack} /><main className="waitlist-layout"><div><p className="eyebrow">A considered beginning</p><h1>There is room<br /><em>for your work here.</em></h1><p className="hero-lede">We’re opening Divine Aperture slowly, with a small group of photographers who care about how their work is experienced.</p></div><div className="waitlist-card"><WaitlistForm /></div></main></div>
}

function Gallery({ event, user, adsEnabled, activePhoto, onActivePhoto, onBack, onLogin }: { event: GalleryEvent; user: SessionUser | null; adsEnabled: boolean; activePhoto: Photo | null; onActivePhoto: (photo: Photo | null) => void; onBack: () => void; onLogin: () => void }) {
  const [photos, setPhotos] = useState(event.photos)
  const [showRequest, setShowRequest] = useState(false)
  const selected = photos.filter((photo) => photo.selected)
  const activeIndex = activePhoto ? photos.findIndex((photo) => photo.id === activePhoto.id) : -1
  const toggle = (id: string, key: 'favorite' | 'selected') => setPhotos((current) => current.map((photo) => photo.id === id ? { ...photo, [key]: !photo[key] } : photo))
  const move = (direction: number) => { const next = photos[(activeIndex + direction + photos.length) % photos.length]; onActivePhoto(next) }
  return <div className="page gallery-page"><Header user={user} onBack={onBack} onLogin={onLogin} onLogout={() => undefined} /><main><section className="gallery-intro"><div><p className="eyebrow">Private gallery / 01</p><h1>{event.title}</h1><p>{event.subtitle}</p></div><div className="gallery-meta"><span>{event.date}</span><span>{event.location}</span><button className="button button-outline" onClick={() => setShowRequest(true)}>Request prints <ArrowUpRight size={15} /></button></div></section><section className="gallery-cover"><img src={event.cover} alt={event.title} /><div><span>For the days we want to remember</span><small>{photos.length} photographs</small></div></section><div className="gallery-toolbar"><span>{selected.length ? `${selected.length} selected` : 'A visual record'}</span><div>{selected.length > 0 && <button className="text-button" onClick={() => setShowRequest(true)}>Request selected prints <ArrowUpRight size={15} /></button>}<button className="text-button" onClick={() => alert('Download requests are controlled by the studio.')}>Download <Download size={15} /></button></div></div><section className="photo-grid">{photos.map((photo) => <PhotoCard key={photo.id} photo={photo} onOpen={() => onActivePhoto(photo)} onToggleFavorite={() => toggle(photo.id, 'favorite')} onToggleSelect={() => toggle(photo.id, 'selected')} />)}</section><AdSlot enabled={adsEnabled} /></main>{activePhoto && <div className="lightbox" role="dialog" aria-modal="true"><button className="lightbox-close" onClick={() => onActivePhoto(null)}><X /></button><button className="lightbox-arrow left" onClick={() => move(-1)}><ChevronLeft /></button><img src={activePhoto.image} alt={activePhoto.title} /><div className="lightbox-info"><span>{activePhoto.title}</span><span>{activeIndex + 1} / {photos.length}</span></div><button className="lightbox-arrow right" onClick={() => move(1)}><ChevronRight /></button></div>}{showRequest && <div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={() => setShowRequest(false)}><X size={17} /></button><p className="eyebrow">A little more permanence</p><h2>Request prints</h2><p>Tell the studio which photographs you’d like to bring into the room.</p><textarea placeholder="A note for the studio (optional)" /><button className="button button-dark" onClick={() => { setShowRequest(false); alert('Your request has been noted for the studio.') }}>Send request <ArrowUpRight size={15} /></button></div></div>}</div>
}

function Admin({ event, user, onBack, onLogout, onCreate, onRefresh }: { event: GalleryEvent; user: SessionUser | null; onBack: () => void; onLogout: () => void; onCreate: () => void; onRefresh: () => void }) {
  const [folder, setFolder] = useState(event.driveFolderId ?? '')
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  function importFolder() { setImporting(true); track('drive_import_started'); window.setTimeout(() => { setImporting(false); setImported(true); track('drive_import_completed', { import_status: 'completed' }) }, 900) }
  return <div className="page admin-page"><header className="site-header"><div className="header-inner"><Brand /><div className="header-right"><span className="admin-label"><Settings size={14} /> Superadmin workspace</span><button className="text-button" onClick={onLogout}><LogOut size={15} /> Sign out</button></div></div></header><main className="admin-main"><div className="admin-top"><div><p className="eyebrow">Studio / Overview</p><h1>Good morning,<br /><em>Divine Aperture.</em></h1></div><button className="button button-dark" onClick={onCreate}><Plus size={16} /> New event</button></div><div className="admin-stats"><div><span>Published stories</span><strong>01</strong></div><div><span>Photos in delivery</span><strong>{event.photos.length}</strong></div><div><span>Selected by clients</span><strong>{event.photos.filter((photo) => photo.selected).length.toString().padStart(2, '0')}</strong></div></div><section className="admin-section"><div className="section-heading"><div><p className="eyebrow">Your stories</p><h2>Events</h2></div><button className="text-button" onClick={onBack}>Preview as client <ExternalLink size={15} /></button></div><article className="event-row"><img src={event.cover} alt="" /><div className="event-row-copy"><span className="event-status"><i /> Published · Free tier</span><h3>{event.title}</h3><p>{event.date} · {event.location}</p></div><button className="icon-button" onClick={onRefresh} aria-label="Refresh event"><RefreshCw size={17} /></button></article></section><section className="admin-section import-section"><div className="section-heading"><div><p className="eyebrow">Google Drive source</p><h2>Bring in the work.</h2></div><Cloud size={24} strokeWidth={1.2} /></div><p className="section-lede">Paste the folder ID of a Drive folder. We’ll import direct image files and prepare them for your gallery.</p><div className="import-box"><FolderOpen size={20} /><input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="Google Drive folder ID" /><button className="button button-dark" onClick={importFolder} disabled={importing}>{importing ? 'Importing…' : 'Import photos'} <ArrowUpRight size={15} /></button></div>{imported && <p className="import-success"><Check size={15} /> Import complete. {event.photos.length} images are ready.</p>}<small className="security-note">Your Drive folder is only used as an import source. Gallery images are delivered privately.</small></section><section className="admin-section split-section"><div><p className="eyebrow">Creator access</p><h2>One studio,<br /><em>for now.</em></h2><p className="section-lede">The waitlist is collecting interest while this superadmin workspace stays private.</p></div><div className="waitlist-mini"><span>Creator waitlist</span><strong>12</strong><button className="arrow-link">Review requests <ArrowUpRight size={15} /></button></div></section></main></div>
}
