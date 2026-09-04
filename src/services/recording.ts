import config from '@/payload.config'
import { sortRecordingsByYearDesc } from '@/services/utils/sortRecordings'
import { getPayload } from 'payload'

type LocaleCode = 'de' | 'en' | 'all'

/**
 * Retrieves all published recordings from the database.
 * Uses depth: 2 to populate artist relationships and their related data.
 * Returns recordings in reverse chronological order (newest first).
 * Recordings without a year are sorted by creation date.
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
  const result = await payload.find({
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

  /**
   * WORKAROUND: Payload SQLite adapter's descending sort (`sort: '-recordingYear'`) returns
   * ascending order instead. Using in-memory sort until framework issue resolved.
   *
   * TODO: File issue at https://github.com/payloadcms/payload/issues
   * TODO: Monitor performance if recordings collection exceeds 1000 records
   */
  const sorted = sortRecordingsByYearDesc(result.docs)

  return {
    ...result,
    docs: sorted,
  }
}

/**
 * Retrieves all published recordings associated with a specific artist.
 * Queries the artists relationship field for matching artist IDs using `contains`
 * operator (required for hasMany relationships).
 * Uses depth: 2 to populate artist relationships and cover art.
 * Returns recordings in reverse chronological order (newest first).
 * Recordings without a year are sorted by creation date.
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
  const result = await payload.find({
    collection: 'recordings',
    where: {
      artists: {
        contains: artistId, // Use `contains` for hasMany relationship arrays
      },
      _status: {
        equals: 'published',
      },
    },
    locale: locale || 'de',
    depth: 1, // Populate cover art; the artists relationship is not rendered on the discography list
    limit: 0, // Return all recordings for artist (no limit)
    select: {
      title: true,
      description: true,
      recordingYear: true,
      recordingLabel: true,
      catalogNumber: true,
      coverArt: true,
      spotifyURL: true,
      appleMusicURL: true,
      roles: true,
      createdAt: true,
    },
  })

  /**
   * WORKAROUND: Payload SQLite adapter's descending sort (`sort: '-recordingYear'`) returns
   * ascending order instead. Using in-memory sort until framework issue resolved.
   *
   * TODO: File issue at https://github.com/payloadcms/payload/issues
   * TODO: Monitor performance if recordings collection exceeds 1000 records
   */
  const sorted = sortRecordingsByYearDesc(result.docs)

  return {
    ...result,
    docs: sorted,
  }
}

/**
 * Returns the count of published recordings associated with a specific artist.
 * Useful for determining whether to show the Discography tab on the artist detail page.
 *
 * @param artistId - The artist's numeric ID
 * @param locale - Optional locale code ('de' or 'en'). Defaults to 'de'
 * @returns A promise resolving to the count of matching recordings
 *
 * @example
 * const count = await getRecordingCountByArtist(42, 'en')
 * const hasRecordings = count > 0
 */
export const getRecordingCountByArtist = async (artistId: number, locale?: 'de' | 'en'): Promise<number> => {
  const payload = await getPayload({ config })
  const result = await payload.count({
    collection: 'recordings',
    where: {
      artists: { contains: artistId.toString() },
      _status: { equals: 'published' },
    },
    locale: locale || 'de',
  })
  return result.totalDocs
}

/**
 * Returns the newest update timestamp among an artist's published recordings.
 * Used as a lightweight cache revision for the discography tab.
 *
 * @param artistId - The artist's numeric ID
 * @param locale - Optional locale code ('de' or 'en'). Defaults to 'de'
 * @returns The newest recording update timestamp, or null when none exist
 */
export const getRecordingVersionByArtist = async (artistId: number, locale?: 'de' | 'en'): Promise<string | null> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'recordings',
    where: {
      artists: { contains: artistId.toString() },
      _status: { equals: 'published' },
    },
    locale: locale || 'de',
    sort: '-updatedAt',
    limit: 1,
    select: { updatedAt: true },
  })

  return result.docs[0]?.updatedAt ?? null
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
