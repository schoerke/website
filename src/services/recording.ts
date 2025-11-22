import type { Payload } from 'payload'

type LocaleCode = 'de' | 'en' | 'all'

/**
 * Get all published recordings
 */
export const getAllRecordings = async (payload: Payload, locale?: LocaleCode) => {
  return await payload.find({
    collection: 'recordings',
    where: {
      _status: {
        equals: 'published',
      },
    },
    locale: locale || 'de',
    depth: 2, // Populate artist relationships and their related data
  })
}

/**
 * Get recordings by artist ID
 * Queries the artistRoles array field for matching artist relationships
 */
export const getRecordingsByArtist = async (payload: Payload, artistId: string, locale?: LocaleCode) => {
  return await payload.find({
    collection: 'recordings',
    where: {
      'artistRoles.artist': {
        equals: artistId,
      },
      _status: {
        equals: 'published',
      },
    },
    locale: locale || 'de',
    depth: 2, // Populate artist relationships and cover art
  })
}

/**
 * Get a single recording by ID
 */
export const getRecordingById = async (payload: Payload, id: string, locale?: LocaleCode) => {
  return await payload.findByID({
    collection: 'recordings',
    id,
    locale: locale || 'de',
    depth: 2,
  })
}
