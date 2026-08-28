import type { Artist } from '@/payload-types'
import config from '@/payload.config'
import { getPayload } from 'payload'

type LocaleCode = 'de' | 'en' | 'all'

/**
 * Retrieves a single artist by their URL slug.
 *
 * @param slug - The artist's URL-friendly slug
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de' with 'de' fallback
 * @returns A promise resolving to the first matching artist document, or undefined if not found
 *
 * @remarks
 * **Single-query population:**
 * This function uses depth:2 with a `populate` override for every relationship collection,
 * so projects, repertoire, contact persons, images, and downloads come back fully populated
 * and slimmed in ONE round trip. The `posts` populate override is REQUIRED because the posts
 * collection configures `defaultPopulate: {}` — without the override, `artist.projects` returns
 * bare `{ id }` objects regardless of depth.
 *
 * **Ordering:** Payload populates relationship arrays in stored order (rels table `order` ASC),
 * so repertoire/projects order is preserved by the query itself — no manual re-fetch needed.
 *
 * **Performance:** one `artists.find()` (~50-100ms), slimmed payloads only.
 *
 * @see {@link docs/patterns/payload.md} for the select/populate-on-uploads `filename` gotcha
 *
 * @example
 * const artist = await getArtistBySlug('john-doe', 'en')
 * if (artist) {
 *   console.log(artist.name) // "John Doe"
 *   if (artist.projects) {
 *     console.log(artist.projects[0].title)
 *     console.log(artist.projects[0].image?.url) // Slim image doc
 *   }
 * }
 */
export const getArtistBySlug = async (slug: string, locale?: LocaleCode) => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'artists',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2, // Populate all relationships below
    locale: locale || 'de',
    fallbackLocale: 'de',
    select: {
      name: true,
      slug: true,
      image: true,
      biography: true,
      quote: true,
      quoteSource: true,
      contactPersons: true,
      homepageURL: true,
      externalCalendarURL: true,
      facebookURL: true,
      instagramURL: true,
      twitterURL: true,
      youtubeURL: true,
      spotifyURL: true,
      downloads: true,
      videoLinks: true,
      galleryImages: true,
      projects: true,
      repertoire: true,
    },
    populate: {
      images: {
        filename: true,
        url: true,
        alt: true,
        credit: true,
        width: true,
        height: true,
        focalX: true,
        focalY: true,
        updatedAt: true,
      },
      employees: { name: true, title: true, email: true, phone: true, mobile: true },
      repertoire: { title: true, content: true },
      posts: { title: true, slug: true, image: true, content: true },
      documents: { filename: true, url: true, updatedAt: true },
    },
  })

  return result.docs[0] as Artist | undefined
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
    populate: {
      images: {
        url: true,
        alt: true,
        width: true,
        height: true,
        focalX: true,
        focalY: true,
        updatedAt: true,
        filename: true,
      },
    },
    depth: 1, // Populate image relationship
    locale: locale || 'de',
    fallbackLocale: 'de',
    limit: 0, // Fetch all artists (no limit)
  })
}

/**
 * Retrieves all artist slugs for static route generation.
 * Slugs are NOT localized — the same slug is used for both DE and EN.
 *
 * @returns A promise resolving to the array of artist slugs
 *
 * @example
 * const slugs = await getArtistSlugs()
 * // ['marc-gruber', 'olga-scheps']
 */
export const getArtistSlugs = async (): Promise<string[]> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'artists',
    select: { slug: true },
    locale: 'de',
    fallbackLocale: 'de',
    limit: 0,
  })
  return result.docs.map((doc) => doc.slug).filter((slug): slug is string => typeof slug === 'string' && slug !== '')
}
