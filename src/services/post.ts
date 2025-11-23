import config from '@/payload.config'
import { getPayload } from 'payload'

type LocaleCode = 'de' | 'en' | 'all'

/**
 * Retrieves all posts from the database without any filtering.
 *
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @returns A promise resolving to all posts (published and unpublished)
 *
 * @example
 * const allPosts = await getAllPosts('en')
 * console.log(allPosts.docs) // Array of all post documents
 */
export const getAllPosts = async (locale?: LocaleCode) => {
  const payload = await getPayload({ config })
  return await payload.find({
    collection: 'posts',
    locale: locale || 'de',
  })
}

/**
 * Retrieves all published posts in the 'news' category.
 *
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @returns A promise resolving to published news posts
 *
 * @example
 * const newsPosts = await getAllNewsPosts('en')
 * console.log(newsPosts.docs) // Array of published news posts
 */
export const getAllNewsPosts = async (locale?: LocaleCode) => {
  const payload = await getPayload({ config })
  return await payload.find({
    collection: 'posts',
    where: {
      categories: {
        equals: 'news',
      },
      published: {
        equals: true,
      },
    },
    locale: locale || 'de',
  })
}

/**
 * Retrieves all published posts in the 'projects' category.
 *
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @returns A promise resolving to published project posts
 *
 * @example
 * const projectPosts = await getAllProjectPosts('en')
 * console.log(projectPosts.docs) // Array of published project posts
 */
export const getAllProjectPosts = async (locale?: LocaleCode) => {
  const payload = await getPayload({ config })
  return await payload.find({
    collection: 'posts',
    where: {
      categories: {
        equals: 'projects',
      },
      published: {
        equals: true,
      },
    },
    locale: locale || 'de',
  })
}

/**
 * Retrieves all published posts in the 'home' category.
 * These posts are typically featured on the homepage.
 *
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @returns A promise resolving to published homepage posts
 *
 * @example
 * const homePosts = await getAllHomepagePosts('en')
 * console.log(homePosts.docs) // Array of published homepage posts
 */
export const getAllHomepagePosts = async (locale?: LocaleCode) => {
  const payload = await getPayload({ config })
  return await payload.find({
    collection: 'posts',
    where: {
      categories: {
        equals: 'home',
      },
      published: {
        equals: true,
      },
    },
    locale: locale || 'de',
  })
}

/**
 * Retrieves all published news posts associated with a specific artist.
 *
 * @param artistId - The artist's unique identifier
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @returns A promise resolving to published news posts for the specified artist
 *
 * @example
 * const artistNews = await getAllNewsPostsByArtist('123', 'en')
 * console.log(artistNews.docs) // Array of news posts featuring this artist
 */
export const getAllNewsPostsByArtist = async (artistId: string, locale?: LocaleCode) => {
  const payload = await getPayload({ config })
  return await payload.find({
    collection: 'posts',
    where: {
      categories: {
        contains: 'news',
      },
      artists: {
        equals: artistId,
      },
      published: {
        equals: true,
      },
    },
    locale: locale || 'de',
  })
}

/**
 * Retrieves all published project posts associated with a specific artist.
 *
 * @param artistId - The artist's unique identifier
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @returns A promise resolving to published project posts for the specified artist
 *
 * @example
 * const artistProjects = await getAllProjectPostsByArtist('123', 'en')
 * console.log(artistProjects.docs) // Array of project posts featuring this artist
 */
export const getAllProjectPostsByArtist = async (artistId: string, locale?: LocaleCode) => {
  const payload = await getPayload({ config })
  return await payload.find({
    collection: 'posts',
    where: {
      categories: {
        contains: 'projects',
      },
      artists: {
        equals: artistId,
      },
      published: {
        equals: true,
      },
    },
    locale: locale || 'de',
  })
}
