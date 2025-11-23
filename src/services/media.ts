import type { Media } from '@/payload-types'
import type { Payload } from 'payload'

/**
 * Generic function to fetch media by filename
 */
export const getMediaByFilename = async (payload: Payload, filename: string): Promise<Media | null> => {
  const result = await payload.find({
    collection: 'media',
    where: { filename: { equals: filename } },
    limit: 1,
  })

  return result.docs[0] || null
}

/**
 * Generic function to fetch media by ID
 */
export const getMediaById = async (payload: Payload, id: string): Promise<Media | null> => {
  try {
    return await payload.findByID({
      collection: 'media',
      id,
    })
  } catch {
    return null
  }
}

/**
 * Generic function to fetch media by alt text
 */
export const getMediaByAlt = async (payload: Payload, alt: string): Promise<Media | null> => {
  const result = await payload.find({
    collection: 'media',
    where: { alt: { equals: alt } },
    limit: 1,
  })

  return result.docs[0] || null
}

// Convenience helpers for known assets

/**
 * Get the full logo
 */
export const getLogo = async (payload: Payload): Promise<Media | null> => {
  return getMediaByFilename(payload, 'logo.png')
}

/**
 * Get the logo icon
 */
export const getLogoIcon = async (payload: Payload): Promise<Media | null> => {
  return getMediaByFilename(payload, 'logo_icon.png')
}

/**
 * Get the default avatar
 */
export const getDefaultAvatar = async (payload: Payload): Promise<Media | null> => {
  return getMediaByFilename(payload, 'default-avatar.webp')
}
