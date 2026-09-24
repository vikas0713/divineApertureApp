import { Check, Heart, Maximize2 } from 'lucide-react'
import type { Photo } from '../types'

export function PhotoCard({ photo, onToggleFavorite, onToggleSelect, onOpen }: {
  photo: Photo
  onToggleFavorite: () => void
  onToggleSelect: () => void
  onOpen: () => void
}) {
  return (
    <article className="photo-card">
      <button className="photo-image-button" onClick={onOpen} aria-label={`Open ${photo.title}`}>
        <img src={photo.image} alt={photo.title} loading="lazy" decoding="async" fetchPriority="low" />
        <span className="photo-expand"><Maximize2 size={15} /></span>
      </button>
      <div className="photo-caption">
        <div><strong>{photo.title}</strong><span>{photo.location}</span></div>
        <div className="photo-actions">
          <button className={photo.favorite ? 'icon-button active' : 'icon-button'} onClick={onToggleFavorite} aria-label="Favorite"><Heart size={16} fill={photo.favorite ? 'currentColor' : 'none'} /></button>
          <button className={photo.selected ? 'icon-button active selected' : 'icon-button'} onClick={onToggleSelect} aria-label="Select"><Check size={16} /></button>
        </div>
      </div>
    </article>
  )
}
