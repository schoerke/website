// @vitest-environment happy-dom
import { NextIntlTestProvider } from '@/components/__test-utils__/NextIntlProvider'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NewsFeedSearch from './NewsFeedSearch'

// Mock Next.js navigation
const mockPush = vi.fn()
const mockPathname = '/en/news'
const mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}))

const renderWithIntl = (ui: React.ReactElement) => {
  return render(<NextIntlTestProvider>{ui}</NextIntlTestProvider>)
}

describe('NewsFeedSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams.delete('search')
  })

  it('should render search input with placeholder', () => {
    renderWithIntl(<NewsFeedSearch placeholder="Search news" />)
    expect(screen.getByPlaceholderText('Search news')).toBeInTheDocument()
  })

  it('should render with default placeholder from translations', () => {
    renderWithIntl(<NewsFeedSearch />)
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument()
  })

  it('should show search icon', () => {
    renderWithIntl(<NewsFeedSearch />)
    const searchIcon = document.querySelector('svg')
    expect(searchIcon).toBeInTheDocument()
  })

  it('should update input value when typing', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')

    expect(input).toHaveValue('test')
  })

  it('should debounce search and not update URL immediately', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch debounceMs={500} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')

    // Should not update immediately
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should update URL after debounce delay with minimum 3 characters', async () => {
    vi.useFakeTimers()
    const user = userEvent.setup({ delay: null })
    renderWithIntl(<NewsFeedSearch debounceMs={500} minChars={3} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')

    // Fast-forward time
    vi.advanceTimersByTime(500)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/en/news?search=test&page=1', { scroll: false })
    })

    vi.useRealTimers()
  })

  it('should not trigger search with less than 3 characters', async () => {
    vi.useFakeTimers()
    const user = userEvent.setup({ delay: null })
    renderWithIntl(<NewsFeedSearch debounceMs={500} minChars={3} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'ab')

    vi.advanceTimersByTime(500)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/en/news', { scroll: false })
    })

    vi.useRealTimers()
  })

  it('should show warning message for 1-2 character input', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch minChars={3} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'ab')

    expect(screen.getByText(/Enter at least 3 characters/i)).toBeInTheDocument()
  })

  it('should add amber border for invalid input length', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch minChars={3} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'ab')

    expect(input).toHaveClass('border-amber-500')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('should hide warning when input reaches minimum characters', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch minChars={3} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'ab')

    expect(screen.getByText(/Enter at least 3 characters/i)).toBeInTheDocument()

    await user.type(input, 'c')

    expect(screen.queryByText(/Enter at least 3 characters/i)).not.toBeInTheDocument()
  })

  it('should show clear button when input has value', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')

    const clearButton = screen.getByLabelText('Clear search')
    expect(clearButton).toBeInTheDocument()
  })

  it('should clear input when clear button is clicked', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')

    const clearButton = screen.getByLabelText('Clear search')
    await user.click(clearButton)

    expect(input).toHaveValue('')
  })

  it('should clear input when ESC key is pressed', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')

    expect(input).toHaveValue('test')

    await user.type(input, '{Escape}')

    expect(input).toHaveValue('')
  })

  it('should reset to page 1 when searching', async () => {
    vi.useFakeTimers()
    mockSearchParams.set('page', '3')
    const user = userEvent.setup({ delay: null })
    renderWithIntl(<NewsFeedSearch debounceMs={500} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')

    vi.advanceTimersByTime(500)

    await waitFor(() => {
      const callArgs = mockPush.mock.calls[0]
      expect(callArgs[0]).toContain('page=1')
      expect(callArgs[0]).toContain('search=test')
    })

    vi.useRealTimers()
  })

  it('should preserve existing query params when searching', async () => {
    vi.useFakeTimers()
    mockSearchParams.set('limit', '50')
    const user = userEvent.setup({ delay: null })
    renderWithIntl(<NewsFeedSearch debounceMs={500} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')

    vi.advanceTimersByTime(500)

    await waitFor(() => {
      const callArgs = mockPush.mock.calls[0]
      expect(callArgs[0]).toContain('limit=50')
      expect(callArgs[0]).toContain('search=test')
    })

    vi.useRealTimers()
  })

  it('should trim whitespace from search input', async () => {
    vi.useFakeTimers()
    const user = userEvent.setup({ delay: null })
    renderWithIntl(<NewsFeedSearch debounceMs={500} />)

    const input = screen.getByRole('textbox')
    await user.type(input, '  test  ')

    vi.advanceTimersByTime(500)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/en/news?search=test&page=1', { scroll: false })
    })

    vi.useRealTimers()
  })

  it('should have proper ARIA labels', () => {
    renderWithIntl(<NewsFeedSearch placeholder="Search news" />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-label', 'Search news')
  })

  it('should have aria-describedby when showing warning', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch minChars={3} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'ab')

    expect(input).toHaveAttribute('aria-describedby', 'search-hint')
  })

  it('should initialize with URL search param value', () => {
    mockSearchParams.set('search', 'existing search')
    renderWithIntl(<NewsFeedSearch />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('existing search')
  })

  it('should support custom minChars configuration', async () => {
    vi.useFakeTimers()
    const user = userEvent.setup({ delay: null })
    renderWithIntl(<NewsFeedSearch minChars={5} debounceMs={500} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')

    vi.advanceTimersByTime(500)

    // Should not trigger search (only 4 chars)
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/en/news', { scroll: false })
    })

    vi.useRealTimers()
  })

  it('should support custom debounce configuration', async () => {
    vi.useFakeTimers()
    const user = userEvent.setup({ delay: null })
    renderWithIntl(<NewsFeedSearch debounceMs={1000} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')

    // Should not trigger after 500ms
    vi.advanceTimersByTime(500)
    expect(mockPush).not.toHaveBeenCalled()

    // Should trigger after 1000ms
    vi.advanceTimersByTime(500)
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/en/news?search=test&page=1', { scroll: false })
    })

    vi.useRealTimers()
  })
})
