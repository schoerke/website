import config from '@/payload.config'
import { getPayload } from 'payload'

type LocaleCode = 'de' | 'en' | 'all'

/**
 * Retrieves all artists from the database.
 *
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de' with 'de' fallback
 * @returns A promise resolving to all artists with full field data
 *
 * @example
 * const artists = await getArtists('en')
 * console.log(artists.docs) // Array of artist documents
 */
export const getArtists = async (locale?: LocaleCode) => {
  const payload = await getPayload({ config })
  return await payload.find({
    collection: 'artists',
    locale: locale || 'de',
    fallbackLocale: 'de',
  })
}

/**
 * Retrieves a single artist by their unique ID.
 *
 * @param id - The artist's unique identifier
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de' with 'de' fallback
 * @returns A promise resolving to the artist document, or throws if not found
 *
 * @example
 * const artist = await getArtistById('123', 'en')
 * console.log(artist.name) // "John Doe"
 */
export const getArtistById = async (id: string, locale?: LocaleCode) => {
  const payload = await getPayload({ config })
  return await payload.findByID({
    collection: 'artists',
    id: id,
    locale: locale || 'de',
    fallbackLocale: 'de',
  })
}

/**
 * Retrieves a single artist by their URL slug.
 *
 * @param slug - The artist's URL-friendly slug
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de' with 'de' fallback
 * @returns A promise resolving to the first matching artist document, or undefined if not found
 *
 * @example
 * const artist = await getArtistBySlug('john-doe', 'en')
 * if (artist) {
 *   console.log(artist.name) // "John Doe"
 * }
 */
export const getArtistBySlug = async (slug: string, locale?: LocaleCode) => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'artists',
    where: { slug: { equals: slug } },
    limit: 1,
    locale: locale || 'de',
    fallbackLocale: 'de',
  })
  return result.docs[0]
}

/**
 * Retrieves optimized artist data for list/grid views.
 * Only fetches essential fields (name, image, instrument, id, slug) to improve performance.
 *
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de' with 'de' fallback
 * @returns A promise resolving to artists with minimal field selection
 *
 * @example
 * const artistList = await getArtistListData('en')
 * artistList.docs.forEach(artist => {
 *   console.log(artist.name, artist.instrument) // Only selected fields available
 * })
 */
export const getArtistListData = async (locale?: LocaleCode) => {
  const payload = await getPayload({ config })
  return await payload.find({
    collection: 'artists',
    select: {
      name: true,
      image: true,
      instrument: true,
      id: true,
      slug: true,
    },
    locale: locale || 'de',
    fallbackLocale: 'de',
  })
}
