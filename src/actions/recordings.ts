'use server'

import { getRecordingsByArtist } from '@/services/recording'

/**
 * Server action to fetch recordings for a specific artist.
 * Uses Payload Local API with depth: 2 to populate all relationships.
 *
 * @param artistId - The artist's unique identifier
 * @param locale - Locale code ('de' or 'en', default: 'de')
 * @returns Promise resolving to published recordings for the artist
 *
 * @example
 * // In a client component:
 * const recordings = await fetchRecordingsByArtist('123', 'en')
 */
export async function fetchRecordingsByArtist(artistId: string, locale?: 'de' | 'en') {
  return await getRecordingsByArtist(artistId, locale || 'de')
}
