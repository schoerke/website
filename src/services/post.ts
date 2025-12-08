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
    limit: 0, // Fetch all posts (no limit)
  })
}

/**
 * Retrieves all published posts in the 'news' category.
 *
 * @deprecated Use getPaginatedPosts() instead for better performance with large datasets
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
    limit: 0, // Fetch all news posts (no limit)
  })
}

/**
 * Retrieves all published posts in the 'projects' category.
 *
 * @deprecated Use getPaginatedPosts() instead for better performance with large datasets
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
    limit: 0, // Fetch all project posts (no limit)
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
    limit: 0, // Fetch all homepage posts (no limit)
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
    limit: 0, // Fetch all news posts for artist (no limit)
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
    limit: 0, // Fetch all project posts for artist (no limit)
  })
}
/**
 * Retrieves posts with flexible filtering options.
 * This is the recommended function for fetching posts with custom criteria.
 *
 * @param options - Query options
 * @param options.category - Filter by category (single string or array of strings)
 * @param options.artistId - Filter by artist ID
 * @param options.limit - Maximum number of posts to return (default: 100)
 * @param options.locale - Locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @param options.publishedOnly - Whether to only return published posts (default: true)
 * @returns A promise resolving to filtered posts
 *
 * @example
 * // Get news posts
 * const news = await getFilteredPosts({ category: 'news' })
 *
 * @example
 * // Get news posts for specific artist
 * const artistNews = await getFilteredPosts({
 *   category: 'news',
 *   artistId: '123',
 *   locale: 'en'
 * })
 *
 * @example
 * // Get multiple categories
 * const posts = await getFilteredPosts({
 *   category: ['news', 'home'],
 *   limit: 5
 * })
 */
export const getFilteredPosts = async (options: {
  category?: string | string[]
  artistId?: string
  limit?: number
  locale?: LocaleCode
  publishedOnly?: boolean
}) => {
  const payload = await getPayload({ config })

  const where: any = {}

  // Filter by published status (default: true)
  if (options.publishedOnly !== false) {
    where._status = { equals: 'published' }
  }

  // Filter by category
  if (options.category) {
    where.categories = Array.isArray(options.category) ? { in: options.category } : { contains: options.category }
  }

  // Filter by artist
  if (options.artistId) {
    where.artists = { equals: options.artistId }
  }

  return await payload.find({
    collection: 'posts',
    where,
    limit: options.limit || 100,
    locale: options.locale || 'de',
    sort: '-createdAt', // Most recent first
    depth: 1, // Populate image and other relationships
  })
}

/**
 * Retrieves paginated posts with flexible filtering options and full pagination metadata.
 * This is the recommended function for paginated post lists (e.g., news/projects pages).
 *
 * @param options - Query options
 * @param options.category - Filter by category (single string or array of strings)
 * @param options.artistId - Filter by artist ID
 * @param options.page - Page number (1-indexed, default: 1)
 * @param options.limit - Number of posts per page (default: 25)
 * @param options.locale - Locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @param options.publishedOnly - Whether to only return published posts (default: true)
 * @returns A promise resolving to paginated posts with metadata
 *
 * @example
 * // Get first page of news posts (25 per page)
 * const result = await getPaginatedPosts({ category: 'news' })
 * console.log(result.docs) // Array of 25 posts
 * console.log(result.totalPages) // Total number of pages
 * console.log(result.hasNextPage) // Boolean
 *
 * @example
 * // Get second page with 50 posts per page
 * const result = await getPaginatedPosts({
 *   category: 'news',
 *   page: 2,
 *   limit: 50,
 *   locale: 'en'
 * })
 *
 * @example
 * // Get posts for specific artist with pagination
 * const result = await getPaginatedPosts({
 *   category: 'projects',
 *   artistId: '123',
 *   page: 1,
 *   limit: 10
 * })
 */
export const getPaginatedPosts = async (options: {
  category?: string | string[]
  artistId?: string
  page?: number
  limit?: number
  locale?: LocaleCode
  publishedOnly?: boolean
}) => {
  const payload = await getPayload({ config })

  const where: any = {}

  // Filter by published status (default: true)
  if (options.publishedOnly !== false) {
    where._status = { equals: 'published' }
  }

  // Filter by category
  if (options.category) {
    where.categories = Array.isArray(options.category) ? { in: options.category } : { contains: options.category }
  }

  // Filter by artist
  if (options.artistId) {
    where.artists = { equals: options.artistId }
  }

  return await payload.find({
    collection: 'posts',
    where,
    page: options.page || 1,
    limit: options.limit || 25,
    locale: options.locale || 'de',
    sort: '-createdAt', // Most recent first
    depth: 1, // Populate image and other relationships
  })
}

/**
 * Retrieves a single post by its slug.
 *
 * @param slug - The post's URL slug
 * @param locale - Locale code ('de' or 'en'). Defaults to 'de'
 * @returns A promise resolving to the post, or null if not found
 *
 * @example
 * const post = await getPostBySlug('my-article', 'en')
 * if (post) {
 *   console.log(post.title)
 * }
 */
export const getPostBySlug = async (slug: string, locale: LocaleCode = 'de') => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'posts',
    where: {
      slug: { equals: slug },
    },
    limit: 1,
    locale,
  })

  return result.docs.length > 0 ? result.docs[0] : null
}
