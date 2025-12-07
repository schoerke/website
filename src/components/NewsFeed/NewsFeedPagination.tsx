'use client'

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

/**
 * Props for the NewsFeedPagination component
 */
interface NewsFeedPaginationProps {
  /** Current active page number (1-indexed) */
  currentPage: number
  /** Total number of pages available */
  totalPages: number
  /** Number of posts per page */
  limit: number
  /** Base path for generating pagination URLs (e.g., '/news' or '/projects') */
  basePath: string
}

/**
 * Generates an array of page numbers to display in pagination, with ellipsis for gaps.
 * Always shows first page, last page, current page, and nearby pages.
 *
 * @param currentPage - The current active page number
 * @param totalPages - Total number of pages
 * @returns Array of page numbers or 'ellipsis' strings
 *
 * @example
 * ```ts
 * generatePageNumbers(5, 10) // [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]
 * generatePageNumbers(1, 3)  // [1, 2, 3]
 * ```
 */
function generatePageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = []
  const showPages = 5 // Maximum page numbers to show

  if (totalPages <= showPages) {
    // Show all pages if total is small
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    // Complex logic: always show first, last, current, and nearby pages
    pages.push(1)

    if (currentPage > 3) {
      pages.push('ellipsis')
    }

    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i)
    }

    if (currentPage < totalPages - 2) {
      pages.push('ellipsis')
    }

    pages.push(totalPages)
  }

  return pages
}

/**
 * NewsFeed Pagination Component
 *
 * Displays pagination controls for navigating through news/project posts.
 * Shows page numbers with ellipsis for large page counts, plus previous/next buttons.
 * Automatically hides when there's only one page.
 *
 * Features:
 * - Smart page number display with ellipsis
 * - Disabled state for first/last pages
 * - ARIA labels for accessibility
 * - URL-based navigation (preserves limit parameter)
 *
 * @example
 * ```tsx
 * <NewsFeedPagination
 *   currentPage={2}
 *   totalPages={10}
 *   limit={25}
 *   basePath="/news"
 * />
 * ```
 */
const NewsFeedPagination: React.FC<NewsFeedPaginationProps> = ({ currentPage, totalPages, limit, basePath }) => {
  if (totalPages <= 1) return null

  const createPageUrl = (page: number): string => `${basePath}?page=${page}&limit=${limit}`
  const pageNumbers = generatePageNumbers(currentPage, totalPages)

  return (
    <Pagination>
      <PaginationContent>
        {/* Previous button */}
        <PaginationItem>
          {currentPage > 1 ? (
            <PaginationPrevious href={createPageUrl(currentPage - 1)} />
          ) : (
            <PaginationPrevious
              href="#"
              aria-disabled="true"
              tabIndex={-1}
              onClick={(e) => e.preventDefault()}
              className="pointer-events-none cursor-not-allowed opacity-50"
            />
          )}
        </PaginationItem>

        {/* Page numbers */}
        {pageNumbers.map((page, idx) => (
          <PaginationItem key={idx}>
            {page === 'ellipsis' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href={createPageUrl(page)}
                isActive={page === currentPage}
                aria-label={`Go to page ${page}`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        {/* Next button */}
        <PaginationItem>
          {currentPage < totalPages ? (
            <PaginationNext href={createPageUrl(currentPage + 1)} />
          ) : (
            <PaginationNext
              href="#"
              aria-disabled="true"
              tabIndex={-1}
              onClick={(e) => e.preventDefault()}
              className="pointer-events-none cursor-not-allowed opacity-50"
            />
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

export default NewsFeedPagination
