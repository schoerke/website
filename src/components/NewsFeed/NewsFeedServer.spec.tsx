// @vitest-environment happy-dom
import { createMockMedia, createMockPaginatedDocs, createMockPost } from '@/services/__test-utils__/payloadMocks'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import NewsFeedServer from './NewsFeedServer'

// Mock the service layers
vi.mock('@/services/post', () => ({
  getPaginatedPosts: vi.fn(),
}))

vi.mock('@/services/media', () => ({
  getDefaultAvatar: vi.fn(),
}))

// Mock NewsFeedList component
vi.mock('./NewsFeedList', () => ({
  default: ({ posts, emptyMessage }: any) => (
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

describe('NewsFeedServer', () => {
  it('should fetch and render posts with default options', async () => {
    const { getPaginatedPosts } = await import('@/services/post')
    const { getDefaultAvatar } = await import('@/services/media')
    const mockPosts = [createMockPost(), createMockPost({ id: 2 })]
    const mockAvatar = createMockMedia({ filename: 'default-avatar.webp' })

    vi.mocked(getPaginatedPosts).mockResolvedValue(createMockPaginatedDocs(mockPosts))
    vi.mocked(getDefaultAvatar).mockResolvedValue(mockAvatar as any)

    const component = await NewsFeedServer({})

    render(component)

    expect(getPaginatedPosts).toHaveBeenCalledWith({
      category: undefined,
      artistId: undefined,
      page: 1,
      limit: 25,
      locale: 'de',
      publishedOnly: true,
    })

    expect(screen.getByTestId('post-count')).toHaveTextContent('2')
  })

  it('should filter by category', async () => {
    const { getPaginatedPosts } = await import('@/services/post')
    const { getDefaultAvatar } = await import('@/services/media')

    vi.mocked(getPaginatedPosts).mockResolvedValue(createMockPaginatedDocs([]))
    vi.mocked(getDefaultAvatar).mockReturnValue('/api/images/file/default-avatar.webp')

    const component = await NewsFeedServer({ category: 'news' })

    render(component)

    expect(getPaginatedPosts).toHaveBeenCalledWith({
      category: 'news',
      artistId: undefined,
      page: 1,
      limit: 25,
      locale: 'de',
      publishedOnly: true,
    })
  })

  it('should filter by multiple categories', async () => {
    const { getPaginatedPosts } = await import('@/services/post')
    const { getDefaultAvatar } = await import('@/services/media')

    vi.mocked(getPaginatedPosts).mockResolvedValue(createMockPaginatedDocs([]))
    vi.mocked(getDefaultAvatar).mockReturnValue('/api/images/file/default-avatar.webp')

    const component = await NewsFeedServer({ category: ['news', 'projects'] })

    render(component)

    expect(getPaginatedPosts).toHaveBeenCalledWith({
      category: ['news', 'projects'],
      artistId: undefined,
      page: 1,
      limit: 25,
      locale: 'de',
      publishedOnly: true,
    })
  })

  it('should filter by artist ID', async () => {
    const { getPaginatedPosts } = await import('@/services/post')
    const { getDefaultAvatar } = await import('@/services/media')

    vi.mocked(getPaginatedPosts).mockResolvedValue(createMockPaginatedDocs([]))
    vi.mocked(getDefaultAvatar).mockReturnValue('/api/images/file/default-avatar.webp')

    const component = await NewsFeedServer({ artistId: '123' })

    render(component)

    expect(getPaginatedPosts).toHaveBeenCalledWith({
      category: undefined,
      artistId: '123',
      page: 1,
      limit: 25,
      locale: 'de',
      publishedOnly: true,
    })
  })

  it('should respect page and limit options', async () => {
    const { getPaginatedPosts } = await import('@/services/post')
    const { getDefaultAvatar } = await import('@/services/media')

    vi.mocked(getPaginatedPosts).mockResolvedValue(createMockPaginatedDocs([]))
    vi.mocked(getDefaultAvatar).mockReturnValue('/api/images/file/default-avatar.webp')

    const component = await NewsFeedServer({ page: 2, limit: 10 })

    render(component)

    expect(getPaginatedPosts).toHaveBeenCalledWith({
      category: undefined,
      artistId: undefined,
      page: 2,
      limit: 10,
      locale: 'de',
      publishedOnly: true,
    })
  })

  it('should respect locale option', async () => {
    const { getPaginatedPosts } = await import('@/services/post')
    const { getDefaultAvatar } = await import('@/services/media')

    vi.mocked(getPaginatedPosts).mockResolvedValue(createMockPaginatedDocs([]))
    vi.mocked(getDefaultAvatar).mockReturnValue('/api/images/file/default-avatar.webp')

    const component = await NewsFeedServer({ locale: 'en' })

    render(component)

    expect(getPaginatedPosts).toHaveBeenCalledWith({
      category: undefined,
      artistId: undefined,
      page: 1,
      limit: 25,
      locale: 'en',
      publishedOnly: true,
    })
  })

  it('should pass emptyMessage to NewsFeedList', async () => {
    const { getPaginatedPosts } = await import('@/services/post')
    const { getDefaultAvatar } = await import('@/services/media')

    vi.mocked(getPaginatedPosts).mockResolvedValue(createMockPaginatedDocs([]))
    vi.mocked(getDefaultAvatar).mockReturnValue('/api/images/file/default-avatar.webp')

    const component = await NewsFeedServer({ emptyMessage: 'Custom empty message' })

    render(component)

    expect(screen.getByTestId('empty-message')).toHaveTextContent('Custom empty message')
  })

  it('should always fetch only published posts', async () => {
    const { getPaginatedPosts } = await import('@/services/post')
    const { getDefaultAvatar } = await import('@/services/media')

    vi.mocked(getPaginatedPosts).mockResolvedValue(createMockPaginatedDocs([]))
    vi.mocked(getDefaultAvatar).mockReturnValue('/api/images/file/default-avatar.webp')

    const component = await NewsFeedServer({})

    render(component)

    expect(getPaginatedPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        publishedOnly: true,
      }),
    )
  })

  it('should show pagination when totalPages > 1 and showPagination is true', async () => {
    const { getPaginatedPosts } = await import('@/services/post')
    const { getDefaultAvatar } = await import('@/services/media')

    const mockResult = {
      ...createMockPaginatedDocs([createMockPost()]),
      totalPages: 3,
      page: 1,
    }

    vi.mocked(getPaginatedPosts).mockResolvedValue(mockResult)
    vi.mocked(getDefaultAvatar).mockReturnValue('/api/images/file/default-avatar.webp')

    const component = await NewsFeedServer({ showPagination: true })

    render(component)

    expect(screen.getByTestId('pagination')).toBeInTheDocument()
    expect(screen.getByTestId('posts-per-page-selector')).toBeInTheDocument()
  })

  it('should hide pagination when totalPages is 1', async () => {
    const { getPaginatedPosts } = await import('@/services/post')
    const { getDefaultAvatar } = await import('@/services/media')

    const mockResult = {
      ...createMockPaginatedDocs([createMockPost()]),
      totalPages: 1,
      page: 1,
    }

    vi.mocked(getPaginatedPosts).mockResolvedValue(mockResult)
    vi.mocked(getDefaultAvatar).mockReturnValue('/api/images/file/default-avatar.webp')

    const component = await NewsFeedServer({ showPagination: true })

    render(component)

    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument()
    expect(screen.queryByTestId('posts-per-page-selector')).not.toBeInTheDocument()
  })

  it('should hide pagination when showPagination is false', async () => {
    const { getPaginatedPosts } = await import('@/services/post')
    const { getDefaultAvatar } = await import('@/services/media')

    const mockResult = {
      ...createMockPaginatedDocs([createMockPost()]),
      totalPages: 3,
      page: 1,
    }

    vi.mocked(getPaginatedPosts).mockResolvedValue(mockResult)
    vi.mocked(getDefaultAvatar).mockReturnValue('/api/images/file/default-avatar.webp')

    const component = await NewsFeedServer({ showPagination: false })

    render(component)

    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument()
    expect(screen.queryByTestId('posts-per-page-selector')).not.toBeInTheDocument()
  })
})
