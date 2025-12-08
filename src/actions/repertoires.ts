'use server'

import config from '@/payload.config'
import { getPayload } from 'payload'

/**
 * Server action to fetch repertoires for a specific artist.
 * Uses Payload Local API to query repertoires by artist relationship.
 *
 * @param artistId - The artist's unique identifier
 * @param locale - Locale code ('de' or 'en', default: 'de')
 * @returns Promise resolving to repertoires for the artist
 *
 * @example
 * // In a client component:
 * const repertoires = await fetchRepertoiresByArtist('123', 'en')
 */
export async function fetchRepertoiresByArtist(artistId: string, locale?: 'de' | 'en') {
  const payload = await getPayload({ config })
  return await payload.find({
    collection: 'repertoire',
    where: {
      artists: {
        equals: artistId,
      },
    },
    locale: locale || 'de',
    limit: 1000, // Set reasonable limit for repertoires
  })
}
