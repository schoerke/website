import type { Payload } from 'payload'

type LocaleCode = 'de' | 'en' | 'all'

/**
 * Retrieves all posts from the database without any filtering.
 *
 * @param payload - The Payload CMS instance
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @returns A promise resolving to all posts (published and unpublished)
 *
 * @example
 * const allPosts = await getAllPosts(payload, 'en')
 * console.log(allPosts.docs) // Array of all post documents
 */
export const getAllPosts = async (payload: Payload, locale?: LocaleCode) => {
  return await payload.find({
    collection: 'posts',
    locale: locale || 'de',
  })
}

/**
 * Retrieves all published posts in the 'news' category.
 *
 * @param payload - The Payload CMS instance
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @returns A promise resolving to published news posts
 *
 * @example
 * const newsPosts = await getAllNewsPosts(payload, 'en')
 * console.log(newsPosts.docs) // Array of published news posts
 */
export const getAllNewsPosts = async (payload: Payload, locale?: LocaleCode) => {
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
 * @param payload - The Payload CMS instance
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @returns A promise resolving to published project posts
 *
 * @example
 * const projectPosts = await getAllProjectPosts(payload, 'en')
 * console.log(projectPosts.docs) // Array of published project posts
 */
export const getAllProjectPosts = async (payload: Payload, locale?: LocaleCode) => {
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
 * @param payload - The Payload CMS instance
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @returns A promise resolving to published homepage posts
 *
 * @example
 * const homePosts = await getAllHomepagePosts(payload, 'en')
 * console.log(homePosts.docs) // Array of published homepage posts
 */
export const getAllHomepagePosts = async (payload: Payload, locale?: LocaleCode) => {
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
 * @param payload - The Payload CMS instance
 * @param artistId - The artist's unique identifier
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @returns A promise resolving to published news posts for the specified artist
 *
 * @example
 * const artistNews = await getAllNewsPostsByArtist(payload, '123', 'en')
 * console.log(artistNews.docs) // Array of news posts featuring this artist
 */
export const getAllNewsPostsByArtist = async (payload: Payload, artistId: string, locale?: LocaleCode) => {
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
 * @param payload - The Payload CMS instance
 * @param artistId - The artist's unique identifier
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @returns A promise resolving to published project posts for the specified artist
 *
 * @example
 * const artistProjects = await getAllProjectPostsByArtist(payload, '123', 'en')
 * console.log(artistProjects.docs) // Array of project posts featuring this artist
 */
export const getAllProjectPostsByArtist = async (payload: Payload, artistId: string, locale?: LocaleCode) => {
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
