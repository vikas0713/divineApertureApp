import type { GalleryEvent, Photo } from '../types'

const images = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1544078751-58fee2d8a03b?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1000&q=85',
]

export const demoPhotos: Photo[] = images.map((image, index) => ({
  id: `photo-${index + 1}`,
  title: ['The first light', 'A quiet promise', 'Between chapters', 'The long way home', 'Softly held', 'After the rain', 'The gathered room', 'Still, together'][index],
  location: ['Udaipur', 'Udaipur', 'Lake Pichola', 'City Palace', 'Aravalli Hills', 'Udaipur', 'The old courtyard', 'Rajasthan'][index],
  image,
}))

export const demoEvent: GalleryEvent = {
  id: 'event-aravalli',
  title: 'A day in the Aravallis',
  subtitle: 'A wedding story by Divine Aperture Studio',
  date: '18 February 2025',
  location: 'Udaipur, Rajasthan',
  status: 'published',
  plan: 'free',
  cover: images[0],
  driveFolderId: '1a2b3c_demo_drive_folder',
  photos: demoPhotos,
}
