import type { Post } from '@/payload-types'
import { getDefaultAvatar } from '@/services/media'
import { getPaginatedPosts } from '@/services/post'
import NewsFeedList from './NewsFeedList'
import NewsFeedPagination from './NewsFeedPagination'
import NewsFeedSearch from './NewsFeedSearch'
import PostsPerPageSelector from './PostsPerPageSelector'

/**
 * Paginated result structure returned by Payload CMS
 */
interface PaginatedResult {
  docs: Post[]
  totalDocs: number
  limit: number
  totalPages: number
  page?: number
  pagingCounter: number
  hasPrevPage: boolean
  hasNextPage: boolean
  prevPage?: number | null
  nextPage?: number | null
}

/**
 * Props for the NewsFeedServer component
 */
interface NewsFeedServerProps {
  /** Pre-fetched paginated data (skips server fetch if provided) */
  preloadedData?: PaginatedResult
  /** Filter by category/categories (e.g., 'news', 'projects', or ['news', 'projects']) */
  category?: string | string[]
  /** Filter by artist ID */
  artistId?: string
  /** Search query string (minimum 3 characters) */
  search?: string
  /** Current page number (1-indexed, default: 1) */
  page?: number
  /** Number of posts per page (default: 25) */
  limit?: number
  /** Locale for content and translations (default: 'de') */
  locale?: 'de' | 'en'
  /** Message to display when no posts are found */
  emptyMessage?: string
  /** Show pagination controls (default: true) */
  showPagination?: boolean
  /** Show search input (default: true) */
  showSearch?: boolean
  /** Custom placeholder text for search input */
  searchPlaceholder?: string
  /** Base path for generating pagination URLs (e.g., '/news', '/projects') */
  basePath?: string
}

/**
 * NewsFeed Server Component
 *
 * Server-side rendered news/project feed with pagination, search, and filtering.
 * Uses Payload CMS Local API for optimal performance.
 *
 * Features:
 * - Server-side rendering with async data fetching
 * - Pagination with customizable posts per page
 * - Search functionality with debounced input
 * - Category and artist filtering
 * - Localized content and UI
 * - Responsive layout (search + posts per page controls)
 * - ARIA live regions for accessibility
 * - Default avatar fallback for posts without images
 *
 * @example
 * ```tsx
 * // Basic usage (fetches data server-side)
 * <NewsFeed.Server
 *   category="news"
 *   page={1}
 *   limit={25}
 *   locale="en"
 *   basePath="/en/news"
 * />
 *
 * // With pre-fetched data (no server fetch)
 * <NewsFeed.Server
 *   preloadedData={postsData}
 *   category="projects"
 *   search="concert"
 *   searchPlaceholder="Search projects"
 *   basePath="/en/projects"
 * />
 *
 * // Artist-specific feed (no search)
 * <NewsFeed.Server
 *   artistId="artist-123"
 *   showSearch={false}
 *   limit={10}
 *   basePath="/en/artists/till-fellner"
 * />
 * ```
 *
 * @see {@link NewsFeedClient} for client-side alternative
 * @see {@link NewsFeedSearch} for search input component
 * @see {@link NewsFeedPagination} for pagination controls
 */
const NewsFeedServer: React.FC<NewsFeedServerProps> = async ({
  preloadedData,
  category,
  artistId,
  search,
  page = 1,
  limit = 25,
  locale = 'de',
  emptyMessage = 'No posts found',
  showPagination = true,
  showSearch = true,
  searchPlaceholder,
  basePath = '/news',
}) => {
  // Use preloaded data if available, otherwise fetch
  const result =
    preloadedData ??
    (await getPaginatedPosts({
      category,
      artistId,
      search,
      page,
      limit,
      locale,
      publishedOnly: true,
    }))

  const defaultImagePath = getDefaultAvatar()

  // Determine which category to use for translations
  const translationCategory = Array.isArray(category) ? category[0] : category || 'news'

  return (
    <div className="space-y-8">
      {/* ARIA live region for search results announcement */}
      {search && (
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {result.totalDocs} {result.totalDocs === 1 ? 'result' : 'results'} found for &quot;{search}&quot;
        </div>
      )}

      {/* Search and posts per page controls (responsive layout) */}
      {(showSearch || (showPagination && result.totalPages > 1)) && (
        <div className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
          {/* Search input */}
          {showSearch && (
            <div className="w-full md:max-w-2xl md:flex-1">
              <NewsFeedSearch placeholder={searchPlaceholder} />
            </div>
          )}

          {/* Posts per page selector */}
          {showPagination && result.totalPages > 1 && (
            <div className="flex justify-end sm:justify-start">
              <PostsPerPageSelector currentLimit={limit} />
            </div>
          )}
        </div>
      )}

      {/* Posts list */}
      <NewsFeedList
        posts={result.docs}
        emptyMessage={emptyMessage}
        category={translationCategory as 'news' | 'projects'}
        defaultImage={defaultImagePath}
      />

      {/* Pagination controls (bottom) */}
      {showPagination && result.totalPages > 1 && (
        <NewsFeedPagination
          currentPage={result.page ?? page}
          totalPages={result.totalPages}
          limit={limit}
          basePath={basePath}
        />
      )}
    </div>
  )
}

export default NewsFeedServer
