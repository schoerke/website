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
 * Appends the document's updatedAt timestamp as a cache-busting query param.
 * Vercel Blob serves the image static route with `Cache-Control: max-age=31536000`,
 * and an image edit re-uploads the file under the SAME filename/URL. Appending
 * `?v=<updatedAt>` changes the URL on every edit, forcing browsers and the
 * next/image optimizer to fetch fresh bytes instead of serving the 1-year cache.
 *
 * @param url - The base image URL
 * @param image - PayloadImage providing updatedAt
 * @returns The URL with `?v=<updatedAt>` appended (or the URL unchanged when no updatedAt)
 */
export function appendImageVersion(url: string, image: { updatedAt?: string | null }): string {
  if (!image.updatedAt) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${encodeURIComponent(image.updatedAt)}`
}

/**
 * Extracts the full-resolution image URL from a PayloadImage object.
 * Returns the original URL so Next.js /_next/image can generate correct
 * srcset variants at any requested size based on the <Image> sizes prop.
 * Appends a cache-busting version param derived from updatedAt.
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
  if (image.url) return appendImageVersion(image.url, image)
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
    if (isValidUrl(image.url)) return appendImageVersion(image.url, image)
  }

  // No valid URL available
  return null
}

/**
 * Extracts a named image size URL from a PayloadImage object, with a
 * cache-busting version param appended (derived from updatedAt).
 * Falls back to the full-resolution URL when the requested size is missing.
 *
 * @param image - PayloadImage object
 * @param sizeName - Name of the image size (e.g. 'thumbnail')
 * @returns The size URL string, or null when neither the size nor the original URL is valid
 *
 * @example
 * ```ts
 * const thumb = getImageUrlForSize(employee.image, 'thumbnail')
 * // '/api/images/file/eva-wagner-400x300.webp?v=2026-08-26T20:38:13.739Z'
 * ```
 */
export function getImageUrlForSize(image: PayloadImage | null | undefined, sizeName: 'thumbnail'): string | null {
  if (!image) return null
  const sizeUrl = image.sizes?.[sizeName]?.url
  const url = sizeUrl && isValidUrl(sizeUrl) ? sizeUrl : image.url
  if (!url || !isValidUrl(url)) return null
  return appendImageVersion(url, image)
}
