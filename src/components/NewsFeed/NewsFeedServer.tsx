import { getDefaultAvatar } from '@/services/media'
import { getFilteredPosts } from '@/services/post'
import NewsFeedList from './NewsFeedList'

interface NewsFeedServerProps {
  category?: string | string[]
  artistId?: string
  limit?: number
  locale?: string
  emptyMessage?: string
}

const NewsFeedServer: React.FC<NewsFeedServerProps> = async ({
  category,
  artistId,
  limit,
  locale = 'de',
  emptyMessage = 'No posts found',
}) => {
  const [result, defaultImage] = await Promise.all([
    getFilteredPosts({
      category,
      artistId,
      limit,
      locale: locale as 'de' | 'en',
      publishedOnly: true,
    }),
    getDefaultAvatar(),
  ])

  // Determine which category to use for translations
  const translationCategory = Array.isArray(category) ? category[0] : category || 'news'

  return (
    <NewsFeedList
      posts={result.docs}
      emptyMessage={emptyMessage}
      category={translationCategory as 'news' | 'projects'}
      defaultImage={defaultImage}
    />
  )
}

export default NewsFeedServer
