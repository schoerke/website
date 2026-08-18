import type { Image as PayloadImage } from '@/payload-types'

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
 * Extracts the full-resolution image URL from a PayloadImage object.
 * Returns the original URL so Next.js /_next/image can generate correct
 * srcset variants at any requested size based on the <Image> sizes prop.
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
  // Return full-res original so Next.js image optimization can generate
  // correct srcset variants at any requested size via /_next/image
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
 * Gets a valid image URL from a PayloadImage object, or null when no valid URL exists.
 * Combines isImageObject, getImageUrl, isValidUrl, and fallback logic in one function.
 *
 * @param image - PayloadImage object, number (ID), null, or undefined
 * @returns The image URL string, or null if there is no valid URL (missing image,
 *          unpopulated ID, empty/'null'/containing-'-null-' placeholder values)
 *
 * @example
 * ```ts
 * const imageUrl = getValidImageUrl(artist.image)
 * if (imageUrl) {
 *   <Image src={imageUrl} alt={artist.name} />
 * }
 * ```
 */
export function getValidImageUrl(image: PayloadImage | number | null | undefined): string | null {
  // If image is a number or null/undefined, there's no image URL
  if (!image || typeof image === 'number') return null

  // If image is an object, return full-res original URL so Next.js image
  // optimization can generate correct srcset variants via /_next/image
  if (typeof image === 'object') {
    if (isValidUrl(image.url)) return image.url
  }

  // No valid URL available
  return null
}
