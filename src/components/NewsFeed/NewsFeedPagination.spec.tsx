// @vitest-environment happy-dom
import { NextIntlTestProvider } from '@/tests/utils/NextIntlProvider'
import { render, screen } from '@testing-library/react'
import { useSearchParams } from 'next/navigation'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NewsFeedPagination, { generatePageNumbers } from './NewsFeedPagination'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}))

// Helper to wrap component in providers
const renderWithProviders = (ui: ReactElement) => {
  return render(<NextIntlTestProvider>{ui}</NextIntlTestProvider>)
}

describe('NewsFeedPagination', () => {
  describe('generatePageNumbers', () => {
    describe('small page counts (<=5 pages)', () => {
      it('should show all pages when total is 1', () => {
        expect(generatePageNumbers(1, 1)).toEqual([1])
      })

      it('should show all pages when total is 3', () => {
        expect(generatePageNumbers(1, 3)).toEqual([1, 2, 3])
      })

      it('should show all pages when total is 5', () => {
        expect(generatePageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5])
      })

      it('should show all pages regardless of current page', () => {
        expect(generatePageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5])
      })
    })

    describe('large page counts (>5 pages)', () => {
      describe('current page at start', () => {
        it('should show start pages without ellipsis before', () => {
          expect(generatePageNumbers(1, 10)).toEqual([1, 2, 'ellipsis', 10])
        })

        it('should show pages 1,2,3 when on page 2', () => {
          expect(generatePageNumbers(2, 10)).toEqual([1, 2, 3, 'ellipsis', 10])
        })

        it('should show pages 1,2,3,4 when on page 3', () => {
          expect(generatePageNumbers(3, 10)).toEqual([1, 2, 3, 4, 'ellipsis', 10])
        })
      })

      describe('current page in middle', () => {
        it('should show ellipsis on both sides', () => {
          expect(generatePageNumbers(5, 10)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10])
        })

        it('should show current page with neighbors', () => {
          expect(generatePageNumbers(6, 10)).toEqual([1, 'ellipsis', 5, 6, 7, 'ellipsis', 10])
        })

        it('should always show first and last page', () => {
          const result = generatePageNumbers(7, 15)
          expect(result[0]).toBe(1)
          expect(result[result.length - 1]).toBe(15)
          expect(result).toContain('ellipsis')
        })
      })

      describe('current page at end', () => {
        it('should show end pages without ellipsis after', () => {
          expect(generatePageNumbers(10, 10)).toEqual([1, 'ellipsis', 9, 10])
        })

        it('should show pages 8,9,10 when on page 9', () => {
          expect(generatePageNumbers(9, 10)).toEqual([1, 'ellipsis', 8, 9, 10])
        })

        it('should show pages 7,8,9,10 when on page 8', () => {
          expect(generatePageNumbers(8, 10)).toEqual([1, 'ellipsis', 7, 8, 9, 10])
        })
      })

      describe('edge cases', () => {
        it('should handle exactly 6 pages', () => {
          expect(generatePageNumbers(1, 6)).toEqual([1, 2, 'ellipsis', 6])
          expect(generatePageNumbers(3, 6)).toEqual([1, 2, 3, 4, 'ellipsis', 6])
          expect(generatePageNumbers(4, 6)).toEqual([1, 'ellipsis', 3, 4, 5, 6])
          expect(generatePageNumbers(6, 6)).toEqual([1, 'ellipsis', 5, 6])
        })

        it('should handle very large page counts', () => {
          const result = generatePageNumbers(50, 100)
          expect(result[0]).toBe(1)
          expect(result[result.length - 1]).toBe(100)
          expect(result).toContain(49)
          expect(result).toContain(50)
          expect(result).toContain(51)
        })
      })
    })
  })

  describe('component rendering', () => {
    beforeEach(() => {
      // Mock useSearchParams to return empty search params
      vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as ReturnType<typeof useSearchParams>)
    })

    describe('visibility', () => {
      it('should not render when totalPages is 0', () => {
        const { container } = renderWithProviders(
          <NewsFeedPagination currentPage={1} totalPages={0} limit={25} basePath="/news" />,
        )
        expect(container.firstChild).toBeNull()
      })

      it('should not render when totalPages is 1', () => {
        const { container } = renderWithProviders(
          <NewsFeedPagination currentPage={1} totalPages={1} limit={25} basePath="/news" />,
        )
        expect(container.firstChild).toBeNull()
      })

      it('should render when totalPages is 2', () => {
        renderWithProviders(<NewsFeedPagination currentPage={1} totalPages={2} limit={25} basePath="/news" />)
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })
    })

    describe('previous button', () => {
      it('should show disabled previous button on first page', () => {
        renderWithProviders(<NewsFeedPagination currentPage={1} totalPages={5} limit={25} basePath="/news" />)
        const prevButton = screen.getByRole('link', { name: /previous/i })
        expect(prevButton).toHaveAttribute('aria-disabled', 'true')
        expect(prevButton).toHaveAttribute('tabindex', '-1')
        expect(prevButton).toHaveClass('pointer-events-none', 'cursor-not-allowed', 'opacity-50')
      })

      it('should show enabled previous button on second page', () => {
        renderWithProviders(<NewsFeedPagination currentPage={2} totalPages={5} limit={25} basePath="/news" />)
        const prevButton = screen.getByRole('link', { name: /previous/i })
        expect(prevButton).not.toHaveAttribute('aria-disabled')
        expect(prevButton).toHaveAttribute('href', '/news?page=1&limit=25')
      })

      it('should show enabled previous button on last page', () => {
        renderWithProviders(<NewsFeedPagination currentPage={5} totalPages={5} limit={25} basePath="/news" />)
        const prevButton = screen.getByRole('link', { name: /previous/i })
        expect(prevButton).toHaveAttribute('href', '/news?page=4&limit=25')
      })
    })

    describe('next button', () => {
      it('should show enabled next button on first page', () => {
        renderWithProviders(<NewsFeedPagination currentPage={1} totalPages={5} limit={25} basePath="/news" />)
        const nextButton = screen.getByRole('link', { name: /next/i })
        expect(nextButton).not.toHaveAttribute('aria-disabled')
        expect(nextButton).toHaveAttribute('href', '/news?page=2&limit=25')
      })

      it('should show enabled next button on middle page', () => {
        renderWithProviders(<NewsFeedPagination currentPage={3} totalPages={5} limit={25} basePath="/news" />)
        const nextButton = screen.getByRole('link', { name: /next/i })
        expect(nextButton).toHaveAttribute('href', '/news?page=4&limit=25')
      })

      it('should show disabled next button on last page', () => {
        renderWithProviders(<NewsFeedPagination currentPage={5} totalPages={5} limit={25} basePath="/news" />)
        const nextButton = screen.getByRole('link', { name: /next/i })
        expect(nextButton).toHaveAttribute('aria-disabled', 'true')
        expect(nextButton).toHaveAttribute('tabindex', '-1')
        expect(nextButton).toHaveClass('pointer-events-none', 'cursor-not-allowed', 'opacity-50')
      })
    })

    describe('page number links', () => {
      it('should render all page numbers for small page count', () => {
        renderWithProviders(<NewsFeedPagination currentPage={2} totalPages={3} limit={25} basePath="/news" />)
        expect(screen.getByRole('link', { name: 'Go to page 1' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Go to page 2' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Go to page 3' })).toBeInTheDocument()
      })

      it('should mark current page as active', () => {
        renderWithProviders(<NewsFeedPagination currentPage={2} totalPages={5} limit={25} basePath="/news" />)
        const currentPageLink = screen.getByRole('link', { name: 'Go to page 2' })
        expect(currentPageLink).toHaveAttribute('aria-current', 'page')
      })

      it('should not mark other pages as active', () => {
        renderWithProviders(<NewsFeedPagination currentPage={2} totalPages={5} limit={25} basePath="/news" />)
        const page1Link = screen.getByRole('link', { name: 'Go to page 1' })
        expect(page1Link).not.toHaveAttribute('aria-current')
      })

      it('should render ellipsis for large page counts', () => {
        renderWithProviders(<NewsFeedPagination currentPage={5} totalPages={10} limit={25} basePath="/news" />)
        // PaginationEllipsis renders a span with "More pages" text
        expect(screen.getAllByText(/more pages/i)).toHaveLength(2)
      })

      it('should generate correct URLs for page links', () => {
        renderWithProviders(<NewsFeedPagination currentPage={1} totalPages={5} limit={25} basePath="/news" />)
        expect(screen.getByRole('link', { name: 'Go to page 1' })).toHaveAttribute('href', '/news?page=1&limit=25')
        expect(screen.getByRole('link', { name: 'Go to page 2' })).toHaveAttribute('href', '/news?page=2&limit=25')
      })
    })

    describe('URL parameter preservation', () => {
      it('should preserve existing search query parameter', () => {
        const searchParams = new URLSearchParams('search=test')
        vi.mocked(useSearchParams).mockReturnValue(searchParams as ReturnType<typeof useSearchParams>)

        renderWithProviders(<NewsFeedPagination currentPage={1} totalPages={3} limit={25} basePath="/news" />)

        const page2Link = screen.getByRole('link', { name: 'Go to page 2' })
        expect(page2Link).toHaveAttribute('href', '/news?search=test&page=2&limit=25')
      })

      it('should preserve multiple query parameters', () => {
        const searchParams = new URLSearchParams('search=test&category=news')
        vi.mocked(useSearchParams).mockReturnValue(searchParams as ReturnType<typeof useSearchParams>)

        renderWithProviders(<NewsFeedPagination currentPage={1} totalPages={3} limit={25} basePath="/news" />)

        const page2Link = screen.getByRole('link', { name: 'Go to page 2' })
        expect(page2Link.getAttribute('href')).toContain('search=test')
        expect(page2Link.getAttribute('href')).toContain('category=news')
        expect(page2Link.getAttribute('href')).toContain('page=2')
        expect(page2Link.getAttribute('href')).toContain('limit=25')
      })

      it('should use different limit values correctly', () => {
        renderWithProviders(<NewsFeedPagination currentPage={1} totalPages={3} limit={10} basePath="/news" />)

        const page2Link = screen.getByRole('link', { name: 'Go to page 2' })
        expect(page2Link).toHaveAttribute('href', '/news?page=2&limit=10')
      })

      it('should use different base paths correctly', () => {
        renderWithProviders(<NewsFeedPagination currentPage={1} totalPages={3} limit={25} basePath="/projects" />)

        const page2Link = screen.getByRole('link', { name: 'Go to page 2' })
        expect(page2Link.getAttribute('href')).toContain('/projects?')
      })
    })

    describe('accessibility', () => {
      it('should have proper ARIA labels on page links', () => {
        renderWithProviders(<NewsFeedPagination currentPage={1} totalPages={3} limit={25} basePath="/news" />)
        expect(screen.getByRole('link', { name: 'Go to page 1' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Go to page 2' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Go to page 3' })).toBeInTheDocument()
      })

      it('should mark current page with aria-current="page"', () => {
        renderWithProviders(<NewsFeedPagination currentPage={2} totalPages={3} limit={25} basePath="/news" />)
        const currentPage = screen.getByRole('link', { name: 'Go to page 2' })
        expect(currentPage).toHaveAttribute('aria-current', 'page')
      })

      it('should mark disabled buttons with aria-disabled and tabindex', () => {
        renderWithProviders(<NewsFeedPagination currentPage={1} totalPages={3} limit={25} basePath="/news" />)
        const prevButton = screen.getByRole('link', { name: /previous/i })
        expect(prevButton).toHaveAttribute('aria-disabled', 'true')
        expect(prevButton).toHaveAttribute('tabindex', '-1')
      })
    })
  })
})
