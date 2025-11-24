// @vitest-environment happy-dom
import { NextIntlTestProvider } from '@/components/__test-utils__/NextIntlProvider'
import { createMockPost } from '@/services/__test-utils__/payloadMocks'
import { render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NewsFeedClient from './NewsFeedClient'

// Mock fetch globally
global.fetch = vi.fn()

// Mock NewsFeedList component
vi.mock('./NewsFeedList', () => ({
  default: ({ posts, emptyMessage }: any) => (
    <div data-testid="newsfeed-list">
      {posts.map((post: any) => (
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
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
}))

const renderWithIntl = (ui: React.ReactElement) => {
  return render(<NextIntlTestProvider>{ui}</NextIntlTestProvider>)
}

describe('NewsFeedClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state initially', async () => {
    // Use a promise we can control to keep the component in loading state
    let resolveFetch: (value: any) => void
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve
    })

    vi.mocked(global.fetch).mockReturnValue(fetchPromise as any)

    renderWithIntl(<NewsFeedClient />)

    // Check skeletons are shown while loading
    expect(screen.getAllByTestId('skeleton')).toHaveLength(12)

    // Now resolve the fetch
    await act(async () => {
      resolveFetch!({
        json: async () => ({ docs: [] }),
      })
      await fetchPromise
    })

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('newsfeed-list')).toBeInTheDocument()
    })
  })

  it('should fetch and display posts', async () => {
    const mockPosts = [createMockPost({ title: 'Test Post 1' }), createMockPost({ id: 2, title: 'Test Post 2' })]

    vi.mocked(global.fetch).mockResolvedValue({
      json: async () => ({ docs: mockPosts }),
    } as Response)

    await act(async () => {
      renderWithIntl(<NewsFeedClient />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Post 1')).toBeInTheDocument()
      expect(screen.getByText('Test Post 2')).toBeInTheDocument()
    })
  })

  it('should build API URL with category filter', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: async () => ({ docs: [] }),
    } as Response)

    await act(async () => {
      renderWithIntl(<NewsFeedClient category="news" />)
    })

    await waitFor(() => {
      // Check that fetch was called with posts API
      const postsCall = vi.mocked(global.fetch).mock.calls.find((call) => call[0].toString().includes('/api/posts'))
      expect(postsCall).toBeDefined()
      const url = postsCall![0] as string
      // URL encoding: where[categories][contains] becomes where%5Bcategories%5D%5Bcontains%5D
      expect(decodeURIComponent(url)).toContain('where[categories][contains]=news')
    })
  })

  it('should build API URL with multiple category filters', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: async () => ({ docs: [] }),
    } as Response)

    await act(async () => {
      renderWithIntl(<NewsFeedClient category={['news', 'projects']} />)
    })

    await waitFor(() => {
      const postsCall = vi.mocked(global.fetch).mock.calls.find((call) => call[0].toString().includes('/api/posts'))
      expect(postsCall).toBeDefined()
      const url = decodeURIComponent(postsCall![0] as string)
      expect(url).toContain('where[categories][contains]=news')
      expect(url).toContain('where[categories][contains]=projects')
    })
  })

  it('should build API URL with artist filter', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: async () => ({ docs: [] }),
    } as Response)

    await act(async () => {
      renderWithIntl(<NewsFeedClient artistId="123" />)
    })

    await waitFor(() => {
      const postsCall = vi.mocked(global.fetch).mock.calls.find((call) => call[0].toString().includes('/api/posts'))
      expect(postsCall).toBeDefined()
      const url = decodeURIComponent(postsCall![0] as string)
      expect(url).toContain('where[artists][equals]=123')
    })
  })

  it('should build API URL with limit', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: async () => ({ docs: [] }),
    } as Response)

    await act(async () => {
      renderWithIntl(<NewsFeedClient limit={5} />)
    })

    await waitFor(() => {
      const postsCall = vi.mocked(global.fetch).mock.calls.find((call) => call[0].toString().includes('/api/posts'))
      expect(postsCall).toBeDefined()
      expect(postsCall![0].toString()).toContain('limit=5')
    })
  })

  it('should build API URL with locale', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: async () => ({ docs: [] }),
    } as Response)

    await act(async () => {
      renderWithIntl(<NewsFeedClient locale="en" />)
    })

    await waitFor(() => {
      const postsCall = vi.mocked(global.fetch).mock.calls.find((call) => call[0].toString().includes('/api/posts'))
      expect(postsCall).toBeDefined()
      expect(postsCall![0].toString()).toContain('locale=en')
    })
  })

  it('should always filter by published status', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: async () => ({ docs: [] }),
    } as Response)

    await act(async () => {
      renderWithIntl(<NewsFeedClient />)
    })

    await waitFor(() => {
      const postsCall = vi.mocked(global.fetch).mock.calls.find((call) => call[0].toString().includes('/api/posts'))
      expect(postsCall).toBeDefined()
      const url = decodeURIComponent(postsCall![0] as string)
      expect(url).toContain('where[_status][equals]=published')
    })
  })

  it('should handle fetch errors gracefully', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))
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
    vi.mocked(global.fetch).mockResolvedValue({
      json: async () => ({ docs: [] }),
    } as Response)

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
    vi.mocked(global.fetch).mockResolvedValue({
      json: async () => ({ docs: [] }),
    } as Response)

    await act(async () => {
      renderWithIntl(<NewsFeedClient emptyMessage="No posts found" />)
    })

    await waitFor(() => {
      expect(screen.getByText('No posts found')).toBeInTheDocument()
    })
  })

  it('should only fetch once', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: async () => ({ docs: [] }),
    } as Response)

    let rerender: any

    await act(async () => {
      const result = renderWithIntl(<NewsFeedClient />)
      rerender = result.rerender
    })

    await waitFor(() => {
      // Should call fetch twice (posts + default avatar)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    await act(async () => {
      rerender(
        <NextIntlTestProvider>
          <NewsFeedClient />
        </NextIntlTestProvider>,
      )
    })

    // Should not fetch again
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})
