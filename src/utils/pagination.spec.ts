import { describe, expect, it } from 'vitest'
import { PAGINATION_DEFAULTS, parsePaginationParams, shouldRedirectToLastPage } from './pagination'

describe('pagination utilities', () => {
  describe('PAGINATION_DEFAULTS', () => {
    it('should have correct default values', () => {
      expect(PAGINATION_DEFAULTS.page).toBe(1)
      expect(PAGINATION_DEFAULTS.limit).toBe(25)
      expect(PAGINATION_DEFAULTS.allowedLimits).toEqual([10, 25, 50])
    })
  })

  describe('parsePaginationParams', () => {
    describe('page parameter validation', () => {
      it('should parse valid page number', () => {
        const result = parsePaginationParams('5', '25')
        expect(result.page).toBe(5)
      })

      it('should default to 1 for missing page parameter', () => {
        const result = parsePaginationParams(undefined, '25')
        expect(result.page).toBe(1)
      })

      it('should default to 1 for empty page parameter', () => {
        const result = parsePaginationParams('', '25')
        expect(result.page).toBe(1)
      })

      it('should default to 1 for non-numeric page parameter', () => {
        const result = parsePaginationParams('abc', '25')
        expect(result.page).toBe(1)
      })

      it('should treat negative page number as 1', () => {
        const result = parsePaginationParams('-5', '25')
        expect(result.page).toBe(1)
      })

      it('should treat zero page number as 1', () => {
        const result = parsePaginationParams('0', '25')
        expect(result.page).toBe(1)
      })

      it('should handle very large page numbers', () => {
        const result = parsePaginationParams('999999', '25')
        expect(result.page).toBe(999999)
      })

      it('should handle decimal page numbers (rounds down)', () => {
        const result = parsePaginationParams('5.7', '25')
        expect(result.page).toBe(5)
      })
    })

    describe('limit parameter validation', () => {
      it('should parse valid limit from default allowed limits', () => {
        const result = parsePaginationParams('1', '50')
        expect(result.limit).toBe(50)
      })

      it('should accept 10 from default allowed limits', () => {
        const result = parsePaginationParams('1', '10')
        expect(result.limit).toBe(10)
      })

      it('should accept 25 from default allowed limits', () => {
        const result = parsePaginationParams('1', '25')
        expect(result.limit).toBe(25)
      })

      it('should default to 25 for missing limit parameter', () => {
        const result = parsePaginationParams('1', undefined)
        expect(result.limit).toBe(25)
      })

      it('should default to 25 for empty limit parameter', () => {
        const result = parsePaginationParams('1', '')
        expect(result.limit).toBe(25)
      })

      it('should default to 25 for non-numeric limit parameter', () => {
        const result = parsePaginationParams('1', 'abc')
        expect(result.limit).toBe(25)
      })

      it('should default to 25 for limit not in allowed limits', () => {
        const result = parsePaginationParams('1', '100')
        expect(result.limit).toBe(25)
      })

      it('should default to 25 for negative limit', () => {
        const result = parsePaginationParams('1', '-10')
        expect(result.limit).toBe(25)
      })

      it('should default to 25 for zero limit', () => {
        const result = parsePaginationParams('1', '0')
        expect(result.limit).toBe(25)
      })

      it('should handle decimal limits (rounds down, then validates)', () => {
        const result = parsePaginationParams('1', '10.9')
        expect(result.limit).toBe(10) // parseInt rounds to 10, which is allowed
      })
    })

    describe('custom allowed limits', () => {
      it('should use custom allowed limits', () => {
        const result = parsePaginationParams('1', '20', [5, 20, 100])
        expect(result.limit).toBe(20)
      })

      it('should default to 25 when limit not in custom allowed limits', () => {
        const result = parsePaginationParams('1', '30', [5, 20, 100])
        expect(result.limit).toBe(25)
      })

      it('should validate against custom limits correctly', () => {
        const result = parsePaginationParams('1', '5', [5, 15, 30])
        expect(result.limit).toBe(5)
      })
    })

    describe('combined parameters', () => {
      it('should handle both valid parameters', () => {
        const result = parsePaginationParams('3', '50')
        expect(result).toEqual({ page: 3, limit: 50 })
      })

      it('should handle both missing parameters', () => {
        const result = parsePaginationParams(undefined, undefined)
        expect(result).toEqual({ page: 1, limit: 25 })
      })

      it('should handle both invalid parameters', () => {
        const result = parsePaginationParams('invalid', 'invalid')
        expect(result).toEqual({ page: 1, limit: 25 })
      })

      it('should handle valid page with invalid limit', () => {
        const result = parsePaginationParams('5', '999')
        expect(result).toEqual({ page: 5, limit: 25 })
      })

      it('should handle invalid page with valid limit', () => {
        const result = parsePaginationParams('invalid', '10')
        expect(result).toEqual({ page: 1, limit: 10 })
      })
    })
  })

  describe('shouldRedirectToLastPage', () => {
    describe('redirect cases (should return true)', () => {
      it('should return true when current page exceeds total pages', () => {
        expect(shouldRedirectToLastPage(5, 3)).toBe(true)
      })

      it('should return true when current page is way beyond total pages', () => {
        expect(shouldRedirectToLastPage(100, 5)).toBe(true)
      })

      it('should return true when current page is one more than total pages', () => {
        expect(shouldRedirectToLastPage(4, 3)).toBe(true)
      })
    })

    describe('no redirect cases (should return false)', () => {
      it('should return false when current page is within bounds', () => {
        expect(shouldRedirectToLastPage(2, 5)).toBe(false)
      })

      it('should return false when current page equals total pages', () => {
        expect(shouldRedirectToLastPage(3, 3)).toBe(false)
      })

      it('should return false when current page is first page', () => {
        expect(shouldRedirectToLastPage(1, 5)).toBe(false)
      })

      it('should return false when there are no pages (empty results)', () => {
        expect(shouldRedirectToLastPage(1, 0)).toBe(false)
      })

      it('should return false when requesting page beyond empty results', () => {
        expect(shouldRedirectToLastPage(5, 0)).toBe(false)
      })

      it('should return false for negative total pages', () => {
        expect(shouldRedirectToLastPage(1, -1)).toBe(false)
      })
    })

    describe('edge cases', () => {
      it('should handle single page site', () => {
        expect(shouldRedirectToLastPage(1, 1)).toBe(false)
        expect(shouldRedirectToLastPage(2, 1)).toBe(true)
      })

      it('should handle very large page numbers', () => {
        expect(shouldRedirectToLastPage(999999, 10)).toBe(true)
      })

      it('should handle page 0 (invalid but possible)', () => {
        expect(shouldRedirectToLastPage(0, 5)).toBe(false)
      })
    })
  })
})
