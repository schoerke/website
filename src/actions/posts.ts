'use server'

import { getFilteredPosts } from '@/services/post'

/**
 * Server action to fetch posts filtered by category and/or artist.
 * Uses Payload Local API for better performance than REST API calls.
 *
 * @param options - Filter options
 * @param options.category - Filter by category (single string or array)
 * @param options.artistId - Filter by artist ID
 * @param options.search - Filter by search text (searches title field, minimum 3 characters)
 * @param options.limit - Maximum number of posts to return (default: 100)
 * @param options.locale - Locale code ('de' or 'en', default: 'de')
 * @returns Promise resolving to filtered posts with populated image relationships
 *
 * @example
 * // In a client component:
 * const posts = await fetchPosts({ category: 'news', artistId: '123', locale: 'en' })
 *
 * @example
 * // Search posts:
 * const posts = await fetchPosts({ search: 'concert', category: 'news', locale: 'en' })
 */
export async function fetchPosts(options: {
  category?: string | string[]
  artistId?: string
  search?: string
  limit?: number
  locale?: 'de' | 'en'
}) {
  return await getFilteredPosts({
    category: options.category,
    artistId: options.artistId,
    search: options.search,
    limit: options.limit || 100,
    locale: options.locale || 'de',
    publishedOnly: true,
  })
}
