'use client'

import { Skeleton } from '@/components/ui/Skeleton'
import type { Media, Post } from '@/payload-types'
import { useEffect, useState } from 'react'
import NewsFeedList from './NewsFeedList'

interface NewsFeedClientProps {
  category?: string | string[]
  artistId?: string
  limit?: number
  locale?: string
  emptyMessage?: string
  showLoadingState?: boolean
}

const NewsFeedClient: React.FC<NewsFeedClientProps> = ({
  category,
  artistId,
  limit = 100,
  locale = 'de',
  emptyMessage = 'No posts found',
  showLoadingState = true,
}) => {
  const [posts, setPosts] = useState<Post[]>([])
  const [defaultImage, setDefaultImage] = useState<Media | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    if (!fetched && loading) {
      const params = new URLSearchParams()
      params.set('locale', locale)
      params.set('where[_status][equals]', 'published')

      if (limit) params.set('limit', limit.toString())

      if (category) {
        const categories = Array.isArray(category) ? category : [category]
        categories.forEach((cat) => {
          params.append('where[categories][contains]', cat)
        })
      }

      if (artistId) {
        params.set('where[artists][equals]', artistId)
      }

      // Fetch posts and default avatar in parallel
      Promise.all([
        fetch(`/api/posts?${params.toString()}`).then((res) => res.json()),
        fetch(`/api/media?where[filename][equals]=default-avatar.webp&limit=1`).then((res) => res.json()),
      ])
        .then(([postsData, mediaData]) => {
          setPosts(postsData.docs || [])
          setDefaultImage(mediaData.docs?.[0] || null)
          setLoading(false)
          setFetched(true)
        })
        .catch((err) => {
          console.error('Failed to fetch posts or default image:', err)
          setLoading(false)
          setFetched(true)
        })
    }
  }, [category, artistId, limit, locale, fetched, loading])

  if (loading && showLoadingState) {
    return (
      <div className="space-y-6">
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
    <NewsFeedList
      posts={posts}
      emptyMessage={emptyMessage}
      category={translationCategory as 'news' | 'projects'}
      defaultImage={defaultImage}
    />
  )
}

export default NewsFeedClient
