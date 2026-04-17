import type { Artist } from '@/payload-types'

export type GalleryImage = NonNullable<Artist['galleryImages']>[number]
