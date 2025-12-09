'use client'

import { fetchDefaultAvatar } from '@/actions/media'
import { fetchPosts } from '@/actions/posts'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Image as PayloadImage, Post } from '@/payload-types'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import NewsFeedList from './NewsFeedList'
import NewsFeedSearch from './NewsFeedSearch'

/**
 * Props for the NewsFeedClient component
 */
interface NewsFeedClientProps {
  /** Filter by category/categories (e.g., 'news', 'projects', or ['news', 'projects']) */
  category?: string | string[]
  /** Filter by artist ID */
  artistId?: string
  /** Number of posts to fetch (default: 100) */
  limit?: number
  /** Locale for content and translations (default: 'de') */
  locale?: string
  /** Message to display when no posts are found */
  emptyMessage?: string
  /** Show skeleton loading state (default: true) */
  showLoadingState?: boolean
  /** Show search input (default: true) */
  showSearch?: boolean
  /** Custom placeholder text for search input */
  searchPlaceholder?: string
}

/**
 * NewsFeed Client Component
 *
 * Client-side rendered news/project feed with dynamic search and filtering.
 * Uses server actions for data fetching with proper type safety.
 *
 * Features:
 * - Client-side data fetching with React hooks
 * - URL-based search query params
 * - Automatic refetch when search changes
 * - Skeleton loading states
 * - Default avatar fallback via server action
 * - Parallel data fetching (posts + default avatar)
 * - ARIA live regions for search feedback
 * - Responsive search input
 *
 * **Note:** This component fetches data on mount and when search changes.
 * For better performance and SEO, prefer {@link NewsFeedServer} when possible.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <NewsFeed.Client
 *   category="news"
 *   locale="en"
 * />
 *
 * // Artist-specific feed without search
 * <NewsFeed.Client
 *   artistId="artist-123"
 *   showSearch={false}
 *   limit={10}
 * />
 *
 * // Custom search placeholder
 * <NewsFeed.Client
 *   category="projects"
 *   searchPlaceholder="Search projects"
 *   showLoadingState={true}
 * />
 * ```
 *
 * @see {@link NewsFeedServer} for server-side alternative (preferred)
 * @see {@link NewsFeedSearch} for search input component
 * @see {@link fetchPosts} for the server action used for data fetching
 */
const NewsFeedClient: React.FC<NewsFeedClientProps> = ({
  category,
  artistId,
  limit = 100,
  locale = 'de',
  emptyMessage = 'No posts found',
  showLoadingState = true,
  showSearch = true,
  searchPlaceholder,
}) => {
  const searchParams = useSearchParams()
  const search = searchParams.get('search') || undefined
  const [posts, setPosts] = useState<Post[]>([])
  const [defaultImage, setDefaultImage] = useState<PayloadImage | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    if (!fetched && loading) {
      // Fetch posts and default avatar in parallel using server actions
      Promise.all([
        fetchPosts({
          category,
          artistId,
          search,
          limit,
          locale: locale as 'de' | 'en',
        }),
        fetchDefaultAvatar(),
      ])
        .then(([postsData, defaultAvatar]) => {
          setPosts(postsData.docs || [])
          setDefaultImage(defaultAvatar || null)
          setLoading(false)
          setFetched(true)
        })
        .catch((err) => {
          console.error('Failed to fetch posts or default image:', err)
          setLoading(false)
          setFetched(true)
        })
    }
  }, [category, artistId, search, limit, locale, fetched, loading])

  // Reset fetched state when search changes
  useEffect(() => {
    setFetched(false)
    setLoading(true)
  }, [search])

  if (loading && showLoadingState) {
    return (
      <div className="space-y-6">
        {/* ARIA live region for loading state */}
        {search && (
          <div aria-live="polite" className="sr-only">
            Searching...
          </div>
        )}
        {showSearch && (
          <div className="w-full md:max-w-2xl">
            <NewsFeedSearch placeholder={searchPlaceholder} />
          </div>
        )}
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-6">
            <Skeleton className="h-32 w-32 flex-shrink-0 rounded-lg" data-testid="skeleton" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-3/4" data-testid="skeleton" />
              <Skeleton className="h-4 w-1/4" data-testid="skeleton" />
              <Skeleton className="h-4 w-1/2" data-testid="skeleton" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Determine which category to use for translations
  const translationCategory = Array.isArray(category) ? category[0] : category || 'news'

  return (
    <div className="space-y-6">
      {showSearch && (
        <div className="w-full md:max-w-2xl">
          <NewsFeedSearch placeholder={searchPlaceholder} />
        </div>
      )}
      <NewsFeedList
        posts={posts}
        emptyMessage={emptyMessage}
        category={translationCategory as 'news' | 'projects'}
        defaultImage={defaultImage?.url || null}
      />
    </div>
  )
}

export default NewsFeedClient
