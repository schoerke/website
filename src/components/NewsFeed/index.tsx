import NewsFeedClient from './NewsFeedClient'
import NewsFeedList from './NewsFeedList'
import NewsFeedServer from './NewsFeedServer'

const NewsFeed = {
  Server: NewsFeedServer,
  Client: NewsFeedClient,
  List: NewsFeedList,
}

export { NewsFeed }
export default NewsFeed
