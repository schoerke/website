import type { Image as PayloadImage } from '@/payload-types'
import { DEFAULT_AVATAR_PATH } from '@/services/media'

/**
 * Type guard to check if an object is a valid PayloadImage.
 *
 * @param obj - Object to check
 * @returns True if the object has either a url or sizes property
 *
 * @example
 * ```ts
 * if (isImageObject(artist.image)) {
 *   const url = getImageUrl(artist.image)
 * }
 * ```
 */
export function isImageObject(obj: unknown): obj is PayloadImage {
  if (typeof obj !== 'object' || obj === null) return false
  return 'url' in obj || 'sizes' in obj
}

/**
 * Extracts the best available image URL from a PayloadImage object.
 * Prefers tablet size for consistency and better caching across the app.
 *
 * @param image - PayloadImage object
 * @returns Image URL string or null if no valid URL is available
 *
 * @example
 * ```ts
 * const artist = await getArtistBySlug('mozart')
 * if (isImageObject(artist.image)) {
 *   const url = getImageUrl(artist.image)
 *   if (isValidUrl(url)) {
 *     // Use url in <Image> component
 *   }
 * }
 * ```
 */
export function getImageUrl(image: PayloadImage): string | null {
  // Prefer tablet size for consistency with ArtistCard (better caching)
  if (image.sizes?.tablet?.url) return image.sizes.tablet.url
  if (image.url) return image.url
  return null
}

/**
 * Type guard to check if a URL string is valid and safe to use.
 * Filters out empty strings, 'null' strings, and URLs containing '/null'.
 *
 * @param url - URL string to validate
 * @returns True if the URL is a valid non-empty string
 *
 * @example
 * ```ts
 * const url = getImageUrl(image)
 * if (isValidUrl(url)) {
 *   <Image src={url} alt="..." />
 * }
 * ```
 */
export function isValidUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && url !== '' && url !== 'null' && !url.includes('/null')
}

/**
 * Gets a valid image URL from a PayloadImage object, with fallback to default avatar.
 * Combines isImageObject, getImageUrl, isValidUrl, and fallback logic in one function.
 *
 * @param image - PayloadImage object, number (ID), null, or undefined
 * @returns Valid image URL string (never null, falls back to DEFAULT_AVATAR_PATH)
 *
 * @example
 * ```ts
 * const imageUrl = getValidImageUrl(artist.image)
 * // Always returns a valid URL, either the artist's image or default avatar
 * <Image src={imageUrl} alt={artist.name} />
 * ```
 */
export function getValidImageUrl(image: PayloadImage | number | null | undefined): string {
  // If image is a number or null/undefined, return default avatar
  if (!image || typeof image === 'number') return DEFAULT_AVATAR_PATH

  // If image is an object, try to extract URL
  if (typeof image === 'object') {
    // Prefer tablet size for consistency
    const tabletUrl = image.sizes?.tablet?.url
    if (isValidUrl(tabletUrl)) return tabletUrl

    // Fallback to original URL
    if (isValidUrl(image.url)) return image.url
  }

  // Final fallback
  return DEFAULT_AVATAR_PATH
}
