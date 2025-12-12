import type { Artist } from '@/payload-types'

/**
 * Format date string for display using locale-specific formatting.
 *
 * @param dateString - ISO date string from Payload
 * @param locale - Locale code (e.g., 'en', 'de')
 * @returns Formatted date string (e.g., "January 15, 2024")
 */
export function formatDate(dateString: string, locale: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Filter and type-guard artists from a post's artists field.
 * Removes any ID references and returns only populated Artist objects.
 *
 * @param artists - Artists field from a post (can be IDs or objects)
 * @returns Array of populated Artist objects
 */
export function getRelatedArtists(artists: unknown): Artist[] {
  if (!Array.isArray(artists)) return []

  return artists.filter((artist): artist is Artist => typeof artist === 'object' && artist !== null) as Artist[]
}
