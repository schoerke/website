// @vitest-environment happy-dom
import { createMockMedia, createMockPaginatedDocs, createMockPost } from '@/services/__test-utils__/payloadMocks'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import NewsFeedServer from './NewsFeedServer'

// Mock the service layers
vi.mock('@/services/post', () => ({
  getFilteredPosts: vi.fn(),
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

describe('NewsFeedServer', () => {
  it('should fetch and render posts with default options', async () => {
    const { getFilteredPosts } = await import('@/services/post')
    const { getDefaultAvatar } = await import('@/services/media')
    const mockPosts = [createMockPost(), createMockPost({ id: 2 })]
    const mockAvatar = createMockMedia({ filename: 'default-avatar.webp' })

    vi.mocked(getFilteredPosts).mockResolvedValue(createMockPaginatedDocs(mockPosts))
    vi.mocked(getDefaultAvatar).mockResolvedValue(mockAvatar as any)

    const component = await NewsFeedServer({})

    render(component)

    expect(getFilteredPosts).toHaveBeenCalledWith({
      category: undefined,
      artistId: undefined,
      limit: undefined,
      locale: 'de',
      publishedOnly: true,
    })

    expect(screen.getByTestId('post-count')).toHaveTextContent('2')
  })

  it('should filter by category', async () => {
    const { getFilteredPosts } = await import('@/services/post')
    const { getDefaultAvatar } = await import('@/services/media')

    vi.mocked(getFilteredPosts).mockResolvedValue(createMockPaginatedDocs([]))
    vi.mocked(getDefaultAvatar).mockResolvedValue(null)

    const component = await NewsFeedServer({ category: 'news' })

    render(component)

    expect(getFilteredPosts).toHaveBeenCalledWith({
      category: 'news',
      artistId: undefined,
      limit: undefined,
      locale: 'de',
      publishedOnly: true,
    })
  })

  it('should filter by multiple categories', async () => {
    const { getFilteredPosts } = await import('@/services/post')
    const { getDefaultAvatar } = await import('@/services/media')

    vi.mocked(getFilteredPosts).mockResolvedValue(createMockPaginatedDocs([]))
    vi.mocked(getDefaultAvatar).mockResolvedValue(null)

    const component = await NewsFeedServer({ category: ['news', 'projects'] })

    render(component)

    expect(getFilteredPosts).toHaveBeenCalledWith({
      category: ['news', 'projects'],
      artistId: undefined,
      limit: undefined,
      locale: 'de',
      publishedOnly: true,
    })
  })

  it('should filter by artist ID', async () => {
    const { getFilteredPosts } = await import('@/services/post')
    const { getDefaultAvatar } = await import('@/services/media')

    vi.mocked(getFilteredPosts).mockResolvedValue(createMockPaginatedDocs([]))
    vi.mocked(getDefaultAvatar).mockResolvedValue(null)

    const component = await NewsFeedServer({ artistId: '123' })

    render(component)

    expect(getFilteredPosts).toHaveBeenCalledWith({
      category: undefined,
      artistId: '123',
      limit: undefined,
      locale: 'de',
      publishedOnly: true,
    })
  })

  it('should respect limit option', async () => {
    const { getFilteredPosts } = await import('@/services/post')
    const { getDefaultAvatar } = await import('@/services/media')

    vi.mocked(getFilteredPosts).mockResolvedValue(createMockPaginatedDocs([]))
    vi.mocked(getDefaultAvatar).mockResolvedValue(null)

    const component = await NewsFeedServer({ limit: 5 })

    render(component)

    expect(getFilteredPosts).toHaveBeenCalledWith({
      category: undefined,
      artistId: undefined,
      limit: 5,
      locale: 'de',
      publishedOnly: true,
    })
  })

  it('should respect locale option', async () => {
    const { getFilteredPosts } = await import('@/services/post')
    const { getDefaultAvatar } = await import('@/services/media')

    vi.mocked(getFilteredPosts).mockResolvedValue(createMockPaginatedDocs([]))
    vi.mocked(getDefaultAvatar).mockResolvedValue(null)

    const component = await NewsFeedServer({ locale: 'en' })

    render(component)

    expect(getFilteredPosts).toHaveBeenCalledWith({
      category: undefined,
      artistId: undefined,
      limit: undefined,
      locale: 'en',
      publishedOnly: true,
    })
  })

  it('should pass emptyMessage to NewsFeedList', async () => {
    const { getFilteredPosts } = await import('@/services/post')
    const { getDefaultAvatar } = await import('@/services/media')

    vi.mocked(getFilteredPosts).mockResolvedValue(createMockPaginatedDocs([]))
    vi.mocked(getDefaultAvatar).mockResolvedValue(null)

    const component = await NewsFeedServer({ emptyMessage: 'Custom empty message' })

    render(component)

    expect(screen.getByTestId('empty-message')).toHaveTextContent('Custom empty message')
  })

  it('should always fetch only published posts', async () => {
    const { getFilteredPosts } = await import('@/services/post')
    const { getDefaultAvatar } = await import('@/services/media')

    vi.mocked(getFilteredPosts).mockResolvedValue(createMockPaginatedDocs([]))
    vi.mocked(getDefaultAvatar).mockResolvedValue(null)

    const component = await NewsFeedServer({})

    render(component)

    expect(getFilteredPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        publishedOnly: true,
      }),
    )
  })
})
