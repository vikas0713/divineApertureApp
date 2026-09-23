export type UserRole = 'superadmin' | 'client'
export type EventStatus = 'draft' | 'published' | 'archived'

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
