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
    // Reset all search params
    const keys = Array.from(mockSearchParams.keys())
    keys.forEach((key) => mockSearchParams.delete(key))
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
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch debounceMs={100} minChars={3} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/en/news?search=test&page=1', { scroll: false })
    })
  })

  it('should not trigger search with less than 3 characters', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch debounceMs={100} minChars={3} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'ab')

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/en/news', { scroll: false })
    })
  })

  it('should show warning message for 1-2 character input', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch debounceMs={100} minChars={3} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'ab')

    await waitFor(() => {
      expect(screen.getByText(/Enter at least 3 characters/i)).toBeInTheDocument()
    })
  })

  it('should add error border for invalid input length', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch debounceMs={100} minChars={3} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'ab')

    await waitFor(() => {
      expect(input).toHaveClass('border-b-primary-error')
      expect(input).toHaveClass('border-b-2')
    })
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('should hide warning when input reaches minimum characters', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch debounceMs={100} minChars={3} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'ab')

    await waitFor(() => {
      expect(screen.getByText(/Enter at least 3 characters/i)).toBeInTheDocument()
    })

    await user.type(input, 'c')

    await waitFor(() => {
      expect(screen.queryByText(/Enter at least 3 characters/i)).not.toBeInTheDocument()
    })
  })

  it('should show clear button when input has value', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch debounceMs={100} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')

    const clearButton = screen.getByLabelText('Clear search')
    expect(clearButton).toBeInTheDocument()
  })

  it('should clear input when clear button is clicked', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch debounceMs={100} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')

    await waitFor(() => {
      expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
    })

    const clearButton = screen.getByLabelText('Clear search')
    await user.click(clearButton)

    expect(input).toHaveValue('')
  })

  it('should clear input when ESC key is pressed', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch debounceMs={100} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')

    expect(input).toHaveValue('test')

    await user.type(input, '{Escape}')

    expect(input).toHaveValue('')
  })

  it('should reset to page 1 when searching', async () => {
    mockSearchParams.set('page', '3')
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch debounceMs={100} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')

    await waitFor(() => {
      const callArgs = mockPush.mock.calls[0]
      expect(callArgs[0]).toContain('page=1')
      expect(callArgs[0]).toContain('search=test')
    })
  })

  it('should preserve existing query params when searching', async () => {
    mockSearchParams.set('limit', '50')
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch debounceMs={100} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')

    await waitFor(() => {
      const callArgs = mockPush.mock.calls[0]
      expect(callArgs[0]).toContain('limit=50')
      expect(callArgs[0]).toContain('search=test')
    })
  })

  it('should trim whitespace from search input', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch debounceMs={100} />)

    const input = screen.getByRole('textbox')
    await user.type(input, '  test  ')

    await waitFor(() => {
      const callArgs = mockPush.mock.calls[0]
      expect(callArgs[0]).toContain('search=test')
      expect(callArgs[0]).toContain('page=1')
    })
  })

  it('should have proper ARIA labels', () => {
    renderWithIntl(<NewsFeedSearch placeholder="Search news" />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-label', 'Search news')
  })

  it('should have aria-describedby when showing warning', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch debounceMs={100} minChars={3} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'ab')

    await waitFor(() => {
      expect(input).toHaveAttribute('aria-describedby', 'search-hint')
    })
  })

  it('should initialize with URL search param value', () => {
    mockSearchParams.set('search', 'existing search')
    renderWithIntl(<NewsFeedSearch />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('existing search')
  })

  it('should support custom minChars configuration', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch minChars={5} debounceMs={100} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')

    await waitFor(() => {
      const callArgs = mockPush.mock.calls[0]
      expect(callArgs[0]).not.toContain('search=test')
    })
  })

  it('should support custom debounce configuration', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsFeedSearch debounceMs={200} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')

    // Should not trigger immediately
    expect(mockPush).not.toHaveBeenCalled()

    // Should trigger after debounce
    await waitFor(
      () => {
        const callArgs = mockPush.mock.calls[0]
        expect(callArgs[0]).toContain('search=test')
        expect(callArgs[0]).toContain('page=1')
      },
      { timeout: 300 },
    )
  })
})
