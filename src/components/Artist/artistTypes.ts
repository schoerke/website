import type { Artist } from '@/payload-types'

/** Represents a single image entry in an artist's gallery. */
export type GalleryImage = NonNullable<Artist['galleryImages']>[number]
