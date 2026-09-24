export type UserRole = 'superadmin' | 'client'
export type EventStatus = 'draft' | 'published' | 'archived'
export type StorageType = 'google_drive' | 'dropbox' | 'divine_aperture'

export const STORAGE_TYPE_LABELS: Record<StorageType, string> = {
  google_drive: 'Google Drive',
  dropbox: 'Drop Box',
  divine_aperture: 'Divine Aperture Storage',
}

/** Storage sources the API accepts today. The rest render disabled. */
export const ENABLED_STORAGE_TYPES: StorageType[] = ['google_drive']

/** An event as the admin API returns it. Distinct from the demo-shaped GalleryEvent. */
export interface AdminEvent {
  id: string
  title: string
  subtitle: string | null
  event_date: string | null
  location: string | null
  gallery_slug: string
  status: EventStatus
  plan: 'free' | 'paid'
  hero_image_url: string | null
  storage_type: StorageType
  storage_url: string | null
  drive_folder_id: string | null
  created_at: string | null
  downloads_enabled: boolean
}

/** Fields the create form collects. Server-owned fields are deliberately absent. */
export interface EventInput {
  title: string
  location: string
  subtitle: string
  event_date: string
  /** Drive file link, bare Drive file ID, or a plain image URL. */
  hero_image: string
  storage_type: StorageType
  storage_url: string
  downloads_enabled: boolean
}

/** A photo as the API returns it. */
export interface ApiPhoto {
  id: string
  filename: string
  mime_type: string
  width: number | null
  height: number | null
  sort_order: number
  drive_file_id: string | null
  display_url: string | null
  thumbnail_url: string | null
  /** Null when the event has downloads turned off. */
  download_url: string | null
}

export interface GalleryPayload {
  event: AdminEvent
  photos: ApiPhoto[]
}

export interface ImportResult {
  imported: number
  updated: number
  total: number
}

export interface SessionUser {
  email: string
  name: string
  role: UserRole
  avatar?: string
}

export interface Photo {
  id: string
  title: string
  location: string
  image: string
  selected?: boolean
  favorite?: boolean
}

export interface GalleryEvent {
  id: string
  title: string
  subtitle: string
  date: string
  location: string
  status: EventStatus
  plan: 'free' | 'paid'
  cover: string
  driveFolderId?: string
  photos: Photo[]
}

export interface WaitlistEntry {
  name: string
  email: string
  studio: string
  city: string
  photographyType: string
  consent: boolean
}
