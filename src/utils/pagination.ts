/**
 * Pagination utilities for validating and parsing pagination parameters
 */

/**
 * Default pagination options
 */
export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 25,
  allowedLimits: [10, 25, 50],
} as const

/**
 * Result of parsing pagination parameters
 */
export interface PaginationParams {
  /** Validated page number (minimum 1) */
  page: number
  /** Validated limit (must be in allowedLimits) */
  limit: number
}

/**
 * Parses and validates pagination query parameters
 *
 * @param pageParam - Raw page parameter from URL (string or undefined)
 * @param limitParam - Raw limit parameter from URL (string or undefined)
 * @param allowedLimits - Array of allowed limit values. Defaults to [10, 25, 50]
 * @returns Validated pagination parameters
 *
 * @example
 * ```ts
 * const { page, limit } = parsePaginationParams('2', '25')
 * // Returns: { page: 2, limit: 25 }
 *
 * const { page, limit } = parsePaginationParams('invalid', '100')
 * // Returns: { page: 1, limit: 25 } (falls back to defaults)
 * ```
 */
export function parsePaginationParams(
  pageParam?: string,
  limitParam?: string,
  allowedLimits: readonly number[] = PAGINATION_DEFAULTS.allowedLimits,
): PaginationParams {
  // Parse and validate page number (minimum 1)
  const page = Math.max(1, parseInt(pageParam || '', 10) || PAGINATION_DEFAULTS.page)

  // Parse and validate limit (must be in allowedLimits)
  const parsedLimit = parseInt(limitParam || '', 10)
  const limit = allowedLimits.includes(parsedLimit) ? parsedLimit : PAGINATION_DEFAULTS.limit

  return { page, limit }
}

/**
 * Checks if a page number exceeds the total available pages
 *
 * @param currentPage - The requested page number
 * @param totalPages - Total number of pages available
 * @returns True if the page number is out of bounds and a redirect is needed
 *
 * @example
 * ```ts
 * shouldRedirectToLastPage(5, 3) // true (page 5 doesn't exist)
 * shouldRedirectToLastPage(2, 5) // false (page 2 is valid)
 * shouldRedirectToLastPage(1, 0) // false (empty results, no redirect)
 * ```
 */
export function shouldRedirectToLastPage(currentPage: number, totalPages: number): boolean {
  return totalPages > 0 && currentPage > totalPages
}
