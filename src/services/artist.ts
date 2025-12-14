import type { Artist, Post } from '@/payload-types'
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
 * **Manual Project Population:**
 * This function uses depth:2 for initial population, then makes a second query to manually
 * populate the `artist.projects` array. This ensures:
 * - Projects are fully populated with their images (depth:2 level)
 * - Project ordering from the database is preserved
 * - Consistent behavior across Payload versions
 *
 * **Performance Impact:**
 * - Query 1: `artists.find()` with depth:2 (~50-100ms)
 * - Query 2: `posts.find()` for projects (~30-70ms)
 * - Total overhead: ~80-170ms per page load
 *
 * **Optimization Opportunity:**
 * The manual population may be unnecessary with current Payload versions. The second query
 * could potentially be eliminated if depth:2 properly populates relationship arrays.
 * Testing required to verify. See: `tmp/testDepthPopulation.ts`
 *
 * @see {@link docs/plans/2025-12-13-artist-projects-ordering-design.md}
 * @see {@link https://payloadcms.com/docs/queries/depth}
 *
 * @example
 * const artist = await getArtistBySlug('john-doe', 'en')
 * if (artist) {
 *   console.log(artist.name) // "John Doe"
 *   if (artist.projects) {
 *     // Projects are fully populated Post objects with images
 *     console.log(artist.projects[0].title)
 *     console.log(artist.projects[0].image.url) // Image is populated
 *   }
 * }
 */
export const getArtistBySlug = async (slug: string, locale?: LocaleCode) => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'artists',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2, // Populate image, contactPersons, and projects with their featured images
    locale: locale || 'de',
    fallbackLocale: 'de',
  })

  const artist = result.docs[0] as Artist & { projects?: (number | Post)[] }

  // Manually populate projects if they exist (depth doesn't always work for relationship arrays)
  if (artist?.projects && Array.isArray(artist.projects) && artist.projects.length > 0) {
    const projectIds = artist.projects
      .map((p: number | Post) => (typeof p === 'number' ? p : p.id))
      .filter((id): id is number => typeof id === 'number')

    if (projectIds.length > 0) {
      const projectsResult = await payload.find({
        collection: 'posts',
        where: { id: { in: projectIds } },
        depth: 1, // Populate images
        locale: locale || 'de',
        fallbackLocale: 'de',
      })

      // Maintain the order from artist.projects array
      const projectsMap = new Map(projectsResult.docs.map((p) => [p.id, p]))
      artist.projects = projectIds.map((id) => projectsMap.get(id)).filter((p): p is Post => p !== undefined)
    }
  }

  return artist
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
    depth: 1, // Populate image relationship
    locale: locale || 'de',
    fallbackLocale: 'de',
    limit: 0, // Fetch all artists (no limit)
  })
}
