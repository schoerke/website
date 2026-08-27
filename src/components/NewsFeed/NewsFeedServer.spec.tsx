// @vitest-environment happy-dom
import { createMockPaginatedDocs, createMockPost } from '@/tests/utils/payloadMocks'
import { POST_LIST_IMAGES_POPULATE, POST_LIST_SELECT } from '@/constants/postList'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import NewsFeedServer from './NewsFeedServer'

// Mock the service layers
vi.mock('@/services/post', () => ({
  getPaginatedPosts: vi.fn(),
}))

// Mock NewsFeedList component
vi.mock('./NewsFeedList', () => ({
  default: ({ posts, emptyMessage }: { posts: Array<{ id: number }>; emptyMessage?: string }) => (
    <div data-testid="newsfeed-list">
      <span data-testid="post-count">{posts.length}</span>
      <span data-testid="empty-message">{emptyMessage}</span>
    </div>
  ),
}))

// Mock NewsFeedPagination component
vi.mock('./NewsFeedPagination', () => ({
  default: () => <div data-testid="pagination" />,
}))

// Mock PostsPerPageSelector component
vi.mock('./PostsPerPageSelector', () => ({
  default: () => <div data-testid="posts-per-page-selector" />,
}))

// Mock NewsFeedSearch component
vi.mock('./NewsFeedSearch', () => ({
  default: () => <div data-testid="newsfeed-search" />,
}))

describe('NewsFeedServer', () => {
  it('should fetch and render posts with default options', async () => {
    const { getPaginatedPosts } = await import('@/services/post')
    const mockPosts = [createMockPost(), createMockPost({ id: 2 })]

    vi.mocked(getPaginatedPosts).mockResolvedValue(createMockPaginatedDocs(mockPosts))

    const component = await NewsFeedServer({})

    render(component)

    expect(getPaginatedPosts).toHaveBeenCalledWith({
      category: undefined,
      artistId: undefined,
      page: 1,
      limit: 10,
      locale: 'de',
      publishedOnly: true,
      select: POST_LIST_SELECT,
      populate: POST_LIST_IMAGES_POPULATE,
    })

    expect(screen.getByTestId('post-count')).toHaveTextContent('2')
  })

  it('should filter by category', async () => {
    const { getPaginatedPosts } = await import('@/services/post')

    vi.mocked(getPaginatedPosts).mockResolvedValue(createMockPaginatedDocs([]))

    const component = await NewsFeedServer({ category: 'news' })

    render(component)

    expect(getPaginatedPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'news',
        artistId: undefined,
        page: 1,
        limit: 10,
        locale: 'de',
        publishedOnly: true,
        select: POST_LIST_SELECT,
        populate: POST_LIST_IMAGES_POPULATE,
      })
    )
  })

  it('should filter by multiple categories', async () => {
    const { getPaginatedPosts } = await import('@/services/post')

    vi.mocked(getPaginatedPosts).mockResolvedValue(createMockPaginatedDocs([]))

    const component = await NewsFeedServer({ category: ['news', 'projects'] })

    render(component)

    expect(getPaginatedPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        category: ['news', 'projects'],
      })
    )
  })

  it('should filter by artist ID', async () => {
    const { getPaginatedPosts } = await import('@/services/post')

    vi.mocked(getPaginatedPosts).mockResolvedValue(createMockPaginatedDocs([]))

    const component = await NewsFeedServer({ artistId: '123' })

    render(component)

    expect(getPaginatedPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        artistId: '123',
      })
    )
  })

  it('should respect page and limit options', async () => {
    const { getPaginatedPosts } = await import('@/services/post')

    vi.mocked(getPaginatedPosts).mockResolvedValue(createMockPaginatedDocs([]))

    const component = await NewsFeedServer({ page: 2, limit: 10 })

    render(component)

    expect(getPaginatedPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 10,
      })
    )
  })

  it('should respect locale option', async () => {
    const { getPaginatedPosts } = await import('@/services/post')

    vi.mocked(getPaginatedPosts).mockResolvedValue(createMockPaginatedDocs([]))

    const component = await NewsFeedServer({ locale: 'en' })

    render(component)

    expect(getPaginatedPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'en',
      })
    )
  })

  it('should pass emptyMessage to NewsFeedList', async () => {
    const { getPaginatedPosts } = await import('@/services/post')

    vi.mocked(getPaginatedPosts).mockResolvedValue(createMockPaginatedDocs([]))

    const component = await NewsFeedServer({ emptyMessage: 'Custom empty message' })

    render(component)

    expect(screen.getByTestId('empty-message')).toHaveTextContent('Custom empty message')
  })

  it('should always fetch only published posts', async () => {
    const { getPaginatedPosts } = await import('@/services/post')

    vi.mocked(getPaginatedPosts).mockResolvedValue(createMockPaginatedDocs([]))

    const component = await NewsFeedServer({})

    render(component)

    expect(getPaginatedPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        publishedOnly: true,
      })
    )
  })

  it('should show pagination when totalPages > 1 and showPagination is true', async () => {
    const { getPaginatedPosts } = await import('@/services/post')

    const mockResult = {
      ...createMockPaginatedDocs([createMockPost()]),
      totalPages: 3,
      page: 1,
    }

    vi.mocked(getPaginatedPosts).mockResolvedValue(mockResult)

    const component = await NewsFeedServer({ showPagination: true })

    render(component)

    expect(screen.getByTestId('pagination')).toBeInTheDocument()
    expect(screen.getByTestId('posts-per-page-selector')).toBeInTheDocument()
  })

  it('should hide pagination when totalPages is 1', async () => {
    const { getPaginatedPosts } = await import('@/services/post')

    const mockResult = {
      ...createMockPaginatedDocs([createMockPost()]),
      totalPages: 1,
      page: 1,
    }

    vi.mocked(getPaginatedPosts).mockResolvedValue(mockResult)

    const component = await NewsFeedServer({ showPagination: true })

    render(component)

    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument()
    expect(screen.queryByTestId('posts-per-page-selector')).not.toBeInTheDocument()
  })

  it('should hide pagination when showPagination is false', async () => {
    const { getPaginatedPosts } = await import('@/services/post')

    const mockResult = {
      ...createMockPaginatedDocs([createMockPost()]),
      totalPages: 3,
      page: 1,
    }

    vi.mocked(getPaginatedPosts).mockResolvedValue(mockResult)

    const component = await NewsFeedServer({ showPagination: false })

    render(component)

    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument()
    expect(screen.queryByTestId('posts-per-page-selector')).not.toBeInTheDocument()
  })
})
