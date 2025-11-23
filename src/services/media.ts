import type { Media } from '@/payload-types'
import config from '@/payload.config'
import { getPayload } from 'payload'

/**
 * Fetches a media item from the media collection by its filename.
 *
 * @param filename - The exact filename to search for (e.g., 'logo.png', 'avatar.webp')
 * @returns A promise that resolves to the Media object if found, or null if not found
 *
 * @example
 * ```ts
 * const logo = await getMediaByFilename('logo.png')
 * if (logo) {
 *   console.log(logo.url) // Access the media URL
 * }
 * ```
 */
export const getMediaByFilename = async (filename: string): Promise<Media | null> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'media',
    where: { filename: { equals: filename } },
    limit: 1,
  })

  return result.docs[0] || null
}

/**
 * Fetches a media item from the media collection by its ID.
 *
 * @param id - The unique identifier of the media item
 * @returns A promise that resolves to the Media object if found, or null if not found or if an error occurs
 *
 * @example
 * ```ts
 * const media = await getMediaById('507f1f77bcf86cd799439011')
 * if (media) {
 *   console.log(media.url)
 * }
 * ```
 */
export const getMediaById = async (id: string): Promise<Media | null> => {
  const payload = await getPayload({ config })
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
 * Fetches a media item from the media collection by its alt text.
 *
 * This is useful for finding images by their descriptive alt text,
 * such as employee photos or artist images.
 *
 * @param alt - The alt text to search for (exact match)
 * @returns A promise that resolves to the Media object if found, or null if not found
 *
 * @example
 * ```ts
 * const employeePhoto = await getMediaByAlt('John Doe')
 * if (employeePhoto) {
 *   console.log(employeePhoto.url)
 * }
 * ```
 */
export const getMediaByAlt = async (alt: string): Promise<Media | null> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'media',
    where: { alt: { equals: alt } },
    limit: 1,
  })

  return result.docs[0] || null
}

// Convenience helpers for known assets

/**
 * Fetches the full logo image (logo.png) from the media collection.
 *
 * This is a convenience wrapper around getMediaByFilename for the main logo asset.
 *
 * @returns A promise that resolves to the Media object for logo.png, or null if not found
 *
 * @example
 * ```ts
 * const logo = await getLogo()
 * if (logo) {
 *   <Image src={logo.url} alt={logo.alt || 'Logo'} />
 * }
 * ```
 */
export const getLogo = async (): Promise<Media | null> => {
  return getMediaByFilename('logo.png')
}

/**
 * Fetches the logo icon image (logo_icon.png) from the media collection.
 *
 * This is typically used for smaller logo representations in headers, footers, or favicons.
 * This is a convenience wrapper around getMediaByFilename.
 *
 * @returns A promise that resolves to the Media object for logo_icon.png, or null if not found
 *
 * @example
 * ```ts
 * const logoIcon = await getLogoIcon()
 * if (logoIcon) {
 *   <Image src={logoIcon.url} alt="Logo" width={40} height={40} />
 * }
 * ```
 */
export const getLogoIcon = async (): Promise<Media | null> => {
  return getMediaByFilename('logo_icon.png')
}

/**
 * Fetches the default avatar image (default-avatar.webp) from the media collection.
 *
 * This is used as a fallback image when an employee or artist doesn't have a specific photo.
 * This is a convenience wrapper around getMediaByFilename.
 *
 * @returns A promise that resolves to the Media object for default-avatar.webp, or null if not found
 *
 * @example
 * ```ts
 * const avatar = await getDefaultAvatar()
 * if (avatar) {
 *   <Image src={avatar.url} alt="Default Avatar" />
 * }
 * ```
 */
export const getDefaultAvatar = async (): Promise<Media | null> => {
  return getMediaByFilename('default-avatar.webp')
}
