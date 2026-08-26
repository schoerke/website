import type { Image as PayloadImage } from '@/payload-types'
import { describe, expect, it } from 'vitest'
import { getImageUrl, getImageUrlForSize, getValidImageUrl, isImageObject, isValidUrl } from './image'

describe('Image Utilities', () => {
  describe('isImageObject', () => {
    it('should return true for objects with url property', () => {
      const image = { url: 'https://example.com/image.jpg' }
      expect(isImageObject(image)).toBe(true)
    })

    it('should return true for objects with sizes property', () => {
      const image = { sizes: { tablet: { url: 'https://example.com/tablet.jpg' } } }
      expect(isImageObject(image)).toBe(true)
    })

    it('should return false for null', () => {
      expect(isImageObject(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isImageObject(undefined)).toBe(false)
    })

    it('should return false for strings', () => {
      expect(isImageObject('not an image')).toBe(false)
    })

    it('should return false for numbers', () => {
      expect(isImageObject(123)).toBe(false)
    })

    it('should return false for empty objects', () => {
      expect(isImageObject({})).toBe(false)
    })
  })

  describe('getImageUrl', () => {
    it('should return original URL when sizes are present', () => {
      const image = {
        url: 'https://example.com/original.jpg',
        sizes: {
          thumbnail: {
            url: 'https://example.com/thumbnail.jpg',
            width: 400,
            height: 300,
            mimeType: 'image/jpeg',
            filesize: 20000,
            filename: 'thumbnail.jpg',
          },
        },
      } as PayloadImage

      expect(getImageUrl(image)).toBe('https://example.com/original.jpg')
    })

    it('should fallback to original URL when tablet size is not available', () => {
      const image = {
        url: 'https://example.com/original.jpg',
        sizes: {},
      } as PayloadImage

      expect(getImageUrl(image)).toBe('https://example.com/original.jpg')
    })

    it('should return null when no valid URL is available', () => {
      const image = {
        sizes: {},
      } as PayloadImage

      expect(getImageUrl(image)).toBeNull()
    })

    it('should return null when image has no sizes and no url', () => {
      const image = {} as PayloadImage

      expect(getImageUrl(image)).toBeNull()
    })
  })

  describe('isValidUrl', () => {
    it('should return true for valid URL strings', () => {
      expect(isValidUrl('https://example.com/image.jpg')).toBe(true)
      expect(isValidUrl('/api/images/file/logo.png')).toBe(true)
    })

    it('should return false for null', () => {
      expect(isValidUrl(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isValidUrl(undefined)).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isValidUrl('')).toBe(false)
    })

    it('should return false for string "null"', () => {
      expect(isValidUrl('null')).toBe(false)
    })

    it('should return false for URLs containing "/null"', () => {
      expect(isValidUrl('https://example.com/null/image.jpg')).toBe(false)
      expect(isValidUrl('/api/null')).toBe(false)
    })
  })

  describe('getValidImageUrl', () => {
    it('should return original URL when sizes are present', () => {
      const image = {
        url: 'https://example.com/original.jpg',
        sizes: {
          thumbnail: {
            url: 'https://example.com/thumbnail.jpg',
            width: 400,
            height: 300,
            mimeType: 'image/jpeg',
            filesize: 20000,
            filename: 'thumbnail.jpg',
          },
        },
      } as PayloadImage

      expect(getValidImageUrl(image)).toBe('https://example.com/original.jpg')
    })

    it('should return original URL when tablet size is not available', () => {
      const image = {
        url: 'https://example.com/original.jpg',
        sizes: {},
      } as PayloadImage

      expect(getValidImageUrl(image)).toBe('https://example.com/original.jpg')
    })

    it('should return null for null', () => {
      expect(getValidImageUrl(null)).toBeNull()
    })

    it('should return null for undefined', () => {
      expect(getValidImageUrl(undefined)).toBeNull()
    })

    it('should return null for number (ID)', () => {
      expect(getValidImageUrl(123)).toBeNull()
    })

    it('should return null when no valid URL exists', () => {
      const image = {
        sizes: {},
      } as PayloadImage

      expect(getValidImageUrl(image)).toBeNull()
    })

    it('should return null for invalid URLs', () => {
      const imageWithNull = {
        url: 'null',
        sizes: {},
      } as PayloadImage

      expect(getValidImageUrl(imageWithNull)).toBeNull()
    })

    it('should return null for URLs containing "/null"', () => {
      const imageWithNullPath = {
        url: 'https://example.com/null/image.jpg',
        sizes: {},
      } as PayloadImage

      expect(getValidImageUrl(imageWithNullPath)).toBeNull()
    })

    it('should return null for empty string URLs', () => {
      const imageWithEmptyUrl = {
        url: '',
        sizes: {},
      } as PayloadImage

      expect(getValidImageUrl(imageWithEmptyUrl)).toBeNull()
    })
  })

  describe('getImageUrl cache-busting (?v=updatedAt)', () => {
    it('should append ?v=updatedAt when updatedAt is present', () => {
      const image = {
        url: '/api/images/file/test.jpg',
        updatedAt: '2026-08-26T20:38:13.739Z',
      } as PayloadImage

      expect(getImageUrl(image)).toBe('/api/images/file/test.jpg?v=2026-08-26T20%3A38%3A13.739Z')
      expect(getValidImageUrl(image)).toBe('/api/images/file/test.jpg?v=2026-08-26T20%3A38%3A13.739Z')
    })

    it('should append with & when the URL already has a query string', () => {
      const image = {
        url: 'https://example.com/image.jpg?w=100',
        updatedAt: '2026-08-26T00:00:00.000Z',
      } as PayloadImage

      expect(getImageUrl(image)).toBe('https://example.com/image.jpg?w=100&v=2026-08-26T00%3A00%3A00.000Z')
    })

    it('should return URL unchanged when updatedAt is missing', () => {
      const image = {
        url: 'https://example.com/original.jpg',
      } as PayloadImage

      expect(getImageUrl(image)).toBe('https://example.com/original.jpg')
    })
  })

  describe('getImageUrlForSize', () => {
    it('should return the thumbnail URL with cache-busting version', () => {
      const image = {
        url: 'https://example.com/original.jpg',
        updatedAt: '2026-08-26T10:00:00.000Z',
        sizes: {
          thumbnail: {
            url: '/api/images/file/test-400x300.webp',
            width: 400,
            height: 300,
            mimeType: 'image/webp',
            filesize: 15000,
            filename: 'test-400x300.webp',
          },
        },
      } as PayloadImage

      expect(getImageUrlForSize(image, 'thumbnail')).toBe(
        '/api/images/file/test-400x300.webp?v=2026-08-26T10%3A00%3A00.000Z'
      )
    })

    it('should fall back to the original URL when the size is missing', () => {
      const image = {
        url: '/api/images/file/test.jpg',
        updatedAt: '2026-08-26T10:00:00.000Z',
        sizes: {},
      } as PayloadImage

      expect(getImageUrlForSize(image, 'thumbnail')).toBe('/api/images/file/test.jpg?v=2026-08-26T10%3A00%3A00.000Z')
    })

    it('should fall back to the original URL when the size URL is invalid', () => {
      const image = {
        url: '/api/images/file/test.jpg',
        updatedAt: '2026-08-26T10:00:00.000Z',
        sizes: {
          thumbnail: {
            url: 'null',
            width: 400,
            height: 300,
            mimeType: 'image/webp',
            filesize: 15000,
            filename: 'test-400x300.webp',
          },
        },
      } as PayloadImage

      expect(getImageUrlForSize(image, 'thumbnail')).toBe('/api/images/file/test.jpg?v=2026-08-26T10%3A00%3A00.000Z')
    })

    it('should return null for null image or invalid URLs', () => {
      expect(getImageUrlForSize(null, 'thumbnail')).toBeNull()
      expect(getImageUrlForSize(undefined, 'thumbnail')).toBeNull()

      const invalid = { url: 'null', updatedAt: '2026-08-26T10:00:00.000Z' } as PayloadImage
      expect(getImageUrlForSize(invalid, 'thumbnail')).toBeNull()
    })
  })
})
