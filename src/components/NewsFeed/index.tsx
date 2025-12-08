import NewsFeedClient from './NewsFeedClient'
import NewsFeedList from './NewsFeedList'
import NewsFeedPagination from './NewsFeedPagination'
import NewsFeedServer from './NewsFeedServer'
import NewsFeedSkeleton from './NewsFeedSkeleton'
import PostsPerPageSelector from './PostsPerPageSelector'

const NewsFeed = {
  Server: NewsFeedServer,
  Client: NewsFeedClient,
  List: NewsFeedList,
  Pagination: NewsFeedPagination,
  PostsPerPageSelector: PostsPerPageSelector,
  Skeleton: NewsFeedSkeleton,
}

export { NewsFeed }
export default NewsFeed
