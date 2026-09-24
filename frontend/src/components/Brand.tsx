import logo from '../assets/divine-aperture-logo.png'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-mark"><img className="brand-logo" src={logo} alt="Divine Aperture Studio" /></div>
      {!compact && <div><span>Divine Aperture</span><small>Studio</small></div>}
    </div>
  )
}
