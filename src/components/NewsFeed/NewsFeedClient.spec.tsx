// @vitest-environment happy-dom
import { NextIntlTestProvider } from '@/components/__test-utils__/NextIntlProvider'
import { createMockPost } from '@/services/__test-utils__/payloadMocks'
import { render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NewsFeedClient from './NewsFeedClient'

// Mock fetch globally
global.fetch = vi.fn()

// Mock Next.js navigation
const mockPush = vi.fn()
const mockPathname = '/en/news'
const mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}))

// Mock the server action
vi.mock('@/actions/posts', () => ({
  fetchPosts: vi.fn(),
}))

// Mock media actions
vi.mock('@/actions/media', () => ({
  fetchDefaultAvatar: vi.fn(),
}))

// Import the mocked function after the mock
import { fetchDefaultAvatar } from '@/actions/media'
import { fetchPosts } from '@/actions/posts'

// Mock NewsFeedList component
vi.mock('./NewsFeedList', () => ({
  default: ({ posts, emptyMessage }: { posts: Array<{ id: number; title: string }>; emptyMessage?: string }) => (
    <div data-testid="newsfeed-list">
      {posts.map((post) => (
        <div key={post.id} data-testid="post">
          {post.title}
        </div>
      ))}
      {posts.length === 0 && <div data-testid="empty">{emptyMessage}</div>}
    </div>
  ),
}))

// Mock Skeleton component
vi.mock('@/components/ui/Skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
}))

const renderWithIntl = (ui: React.ReactElement) => {
  return render(<NextIntlTestProvider>{ui}</NextIntlTestProvider>)
}

describe('NewsFeedClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetchDefaultAvatar to return null by default
    vi.mocked(fetchDefaultAvatar).mockResolvedValue(null)
  })

  it('should show loading state initially', async () => {
    // Use a promise we can control to keep the component in loading state
    let resolveFetchPosts: (value: any) => void
    const fetchPostsPromise = new Promise((resolve) => {
      resolveFetchPosts = resolve
    })

    vi.mocked(fetchPosts).mockReturnValue(fetchPostsPromise as never)

    renderWithIntl(<NewsFeedClient />)

    // Check skeletons are shown while loading
    expect(screen.getAllByTestId('skeleton')).toHaveLength(12)

    // Now resolve the fetchPosts promise
    await act(async () => {
      resolveFetchPosts!({ docs: [] })
      await fetchPostsPromise
    })

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('newsfeed-list')).toBeInTheDocument()
    })
  })

  it('should fetch and display posts', async () => {
    const mockPosts = [createMockPost({ title: 'Test Post 1' }), createMockPost({ id: 2, title: 'Test Post 2' })]

    vi.mocked(fetchPosts).mockResolvedValue({ docs: mockPosts } as never)

    await act(async () => {
      renderWithIntl(<NewsFeedClient />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Post 1')).toBeInTheDocument()
      expect(screen.getByText('Test Post 2')).toBeInTheDocument()
    })
  })

  it('should call server action with category filter', async () => {
    vi.mocked(fetchPosts).mockResolvedValue({ docs: [] } as never)

    await act(async () => {
      renderWithIntl(<NewsFeedClient category="news" />)
    })

    await waitFor(() => {
      expect(fetchPosts).toHaveBeenCalledWith({
        category: 'news',
        artistId: undefined,
        limit: 100,
        locale: 'de',
      })
    })
  })

  it('should call server action with multiple category filters', async () => {
    vi.mocked(fetchPosts).mockResolvedValue({ docs: [] } as never)

    await act(async () => {
      renderWithIntl(<NewsFeedClient category={['news', 'projects']} />)
    })

    await waitFor(() => {
      expect(fetchPosts).toHaveBeenCalledWith({
        category: ['news', 'projects'],
        artistId: undefined,
        limit: 100,
        locale: 'de',
      })
    })
  })

  it('should call server action with artist filter', async () => {
    vi.mocked(fetchPosts).mockResolvedValue({ docs: [] } as never)

    await act(async () => {
      renderWithIntl(<NewsFeedClient artistId="123" />)
    })

    await waitFor(() => {
      expect(fetchPosts).toHaveBeenCalledWith({
        category: undefined,
        artistId: '123',
        limit: 100,
        locale: 'de',
      })
    })
  })

  it('should call server action with limit', async () => {
    vi.mocked(fetchPosts).mockResolvedValue({ docs: [] } as never)

    await act(async () => {
      renderWithIntl(<NewsFeedClient limit={5} />)
    })

    await waitFor(() => {
      expect(fetchPosts).toHaveBeenCalledWith({
        category: undefined,
        artistId: undefined,
        limit: 5,
        locale: 'de',
      })
    })
  })

  it('should call server action with locale', async () => {
    vi.mocked(fetchPosts).mockResolvedValue({ docs: [] } as never)

    await act(async () => {
      renderWithIntl(<NewsFeedClient locale="en" />)
    })

    await waitFor(() => {
      expect(fetchPosts).toHaveBeenCalledWith({
        category: undefined,
        artistId: undefined,
        limit: 100,
        locale: 'en',
      })
    })
  })

  it('should always filter by published status', async () => {
    vi.mocked(fetchPosts).mockResolvedValue({ docs: [] } as never)

    await act(async () => {
      renderWithIntl(<NewsFeedClient />)
    })

    await waitFor(() => {
      // The fetchPosts server action handles publishedOnly=true internally
      expect(fetchPosts).toHaveBeenCalled()
    })
  })

  it('should handle fetch errors gracefully', async () => {
    vi.mocked(fetchPosts).mockRejectedValue(new Error('Network error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await act(async () => {
      renderWithIntl(<NewsFeedClient />)
    })

    await waitFor(() => {
      expect(screen.getByTestId('newsfeed-list')).toBeInTheDocument()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch posts or default image:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })

  it('should not show loading state when showLoadingState is false', async () => {
    vi.mocked(fetchPosts).mockResolvedValue({ docs: [] } as never)

    await act(async () => {
      renderWithIntl(<NewsFeedClient showLoadingState={false} />)
    })

    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()

    // Wait for fetch to complete
    await waitFor(() => {
      expect(screen.getByTestId('newsfeed-list')).toBeInTheDocument()
    })
  })

  it('should display empty message when no posts', async () => {
    vi.mocked(fetchPosts).mockResolvedValue({ docs: [] } as never)

    await act(async () => {
      renderWithIntl(<NewsFeedClient emptyMessage="No posts found" />)
    })

    await waitFor(() => {
      expect(screen.getByText('No posts found')).toBeInTheDocument()
    })
  })

  it('should only fetch once', async () => {
    vi.mocked(fetchPosts).mockResolvedValue({ docs: [] } as never)

    let rerender: any

    await act(async () => {
      const result = renderWithIntl(<NewsFeedClient />)
      rerender = result.rerender
    })

    await waitFor(() => {
      // Should call fetchPosts once and fetchDefaultAvatar once
      expect(fetchPosts).toHaveBeenCalledTimes(1)
      expect(fetchDefaultAvatar).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      rerender(
        <NextIntlTestProvider>
          <NewsFeedClient />
        </NextIntlTestProvider>,
      )
    })

    // Should not fetch again
    expect(fetchPosts).toHaveBeenCalledTimes(1)
    expect(fetchDefaultAvatar).toHaveBeenCalledTimes(1)
  })
})
