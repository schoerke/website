import config from '@/payload.config'
import { getPayload } from 'payload'

type LocaleCode = 'de' | 'en' | 'all'

/**
 * Retrieves all published recordings from the database.
 * Uses depth: 2 to populate artist relationships and their related data.
 *
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @returns A promise resolving to all published recordings with populated relationships
 *
 * @example
 * const recordings = await getAllRecordings('en')
 * console.log(recordings.docs) // Array of published recording documents with artist details
 */
export const getAllRecordings = async (locale?: LocaleCode) => {
  const payload = await getPayload({ config })
  return await payload.find({
    collection: 'recordings',
    where: {
      _status: {
        equals: 'published',
      },
    },
    locale: locale || 'de',
    depth: 2, // Populate artist relationships and their related data
    limit: 0, // Return all recordings (no limit)
  })
}

/**
 * Retrieves all published recordings associated with a specific artist.
 * Queries the artists relationship field for matching artist IDs.
 * Uses depth: 2 to populate artist relationships and cover art.
 *
 * @param artistId - The artist's unique identifier
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @returns A promise resolving to published recordings for the specified artist
 *
 * @example
 * const artistRecordings = await getRecordingsByArtist('123', 'en')
 * console.log(artistRecordings.docs) // Array of recordings featuring this artist
 */
export const getRecordingsByArtist = async (artistId: string, locale?: LocaleCode) => {
  const payload = await getPayload({ config })
  return await payload.find({
    collection: 'recordings',
    where: {
      artists: {
        equals: artistId,
      },
      _status: {
        equals: 'published',
      },
    },
    locale: locale || 'de',
    depth: 2, // Populate artist relationships and cover art
    limit: 0, // Return all recordings for artist (no limit)
  })
}

/**
 * Retrieves a single published recording by its unique ID.
 * Uses depth: 2 to populate all relationships (artists, cover art, etc.).
 *
 * @param id - The recording's unique identifier
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @returns A promise resolving to the recording document with populated relationships
 *
 * @example
 * const recording = await getRecordingById('456', 'en')
 * console.log(recording.title, recording.artists) // Full recording details with artist info
 */
export const getRecordingById = async (id: string, locale?: LocaleCode) => {
  const payload = await getPayload({ config })
  return await payload.findByID({
    collection: 'recordings',
    id,
    locale: locale || 'de',
    depth: 2,
  })
}
