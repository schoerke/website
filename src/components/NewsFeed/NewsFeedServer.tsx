import type { Post } from '@/payload-types'
import { getDefaultAvatar } from '@/services/media'
import { getPaginatedPosts } from '@/services/post'
import NewsFeedList from './NewsFeedList'
import NewsFeedPagination from './NewsFeedPagination'
import PostsPerPageSelector from './PostsPerPageSelector'

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

interface NewsFeedServerProps {
  preloadedData?: PaginatedResult
  category?: string | string[]
  artistId?: string
  page?: number
  limit?: number
  locale?: 'de' | 'en'
  emptyMessage?: string
  showPagination?: boolean
  basePath?: string
}

const NewsFeedServer: React.FC<NewsFeedServerProps> = async ({
  preloadedData,
  category,
  artistId,
  page = 1,
  limit = 25,
  locale = 'de',
  emptyMessage = 'No posts found',
  showPagination = true,
  basePath = '/news',
}) => {
  // Use preloaded data if available, otherwise fetch
  const result =
    preloadedData ??
    (await getPaginatedPosts({
      category,
      artistId,
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
      {/* Posts per page selector (top) */}
      {showPagination && result.totalPages > 1 && (
        <div className="flex justify-end">
          <PostsPerPageSelector currentLimit={limit} />
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
