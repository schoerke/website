import type { PopulateType, SelectType } from 'payload'

/**
 * Slim field selection for post LIST views (news/projects pages, artist news tab).
 * Lists render only title, image, preview, date, and category path — NOT the full
 * rich-text content/embed payload or populated artists/createdBy.
 *
 * Client-safe: only imports Payload types (no server APIs).
 */
export const POST_LIST_SELECT: SelectType = {
  title: true,
  slug: true,
  image: true,
  content: true,
  categories: true,
  createdAt: true,
}

/**
 * Slim image population for post list views. `filename` is required so the virtual
 * `url` field computes (see docs/patterns/payload.md); `updatedAt` drives `?v=` cache-busting.
 *
 * Client-safe: only imports Payload types (no server APIs).
 */
export const POST_LIST_IMAGES_POPULATE: PopulateType = {
  images: {
    filename: true,
    url: true,
    alt: true,
    width: true,
    height: true,
    focalX: true,
    focalY: true,
    updatedAt: true,
  },
}