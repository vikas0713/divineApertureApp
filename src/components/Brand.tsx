import { Aperture } from 'lucide-react'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-mark"><Aperture size={compact ? 18 : 22} strokeWidth={1.2} /></div>
      {!compact && <div><span>Divine Aperture</span><small>Studio</small></div>}
    </div>
  )
}
