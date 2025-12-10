import type { Image as PayloadImage } from '@/payload-types'
import { DEFAULT_AVATAR_PATH } from '@/services/media'
import { describe, expect, it } from 'vitest'
import { getImageUrl, getValidImageUrl, isImageObject, isValidUrl } from './image'

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
    it('should prefer tablet size URL when available', () => {
      const image = {
        url: 'https://example.com/original.jpg',
        sizes: {
          tablet: {
            url: 'https://example.com/tablet.jpg',
            width: 800,
            height: 600,
            mimeType: 'image/jpeg',
            filesize: 50000,
            filename: 'tablet.jpg',
          },
        },
      } as PayloadImage

      expect(getImageUrl(image)).toBe('https://example.com/tablet.jpg')
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
    it('should return tablet URL for valid PayloadImage', () => {
      const image = {
        url: 'https://example.com/original.jpg',
        sizes: {
          tablet: {
            url: 'https://example.com/tablet.jpg',
            width: 800,
            height: 600,
            mimeType: 'image/jpeg',
            filesize: 50000,
            filename: 'tablet.jpg',
          },
        },
      } as PayloadImage

      expect(getValidImageUrl(image)).toBe('https://example.com/tablet.jpg')
    })

    it('should return original URL when tablet size is not available', () => {
      const image = {
        url: 'https://example.com/original.jpg',
        sizes: {},
      } as PayloadImage

      expect(getValidImageUrl(image)).toBe('https://example.com/original.jpg')
    })

    it('should return DEFAULT_AVATAR_PATH for null', () => {
      expect(getValidImageUrl(null)).toBe(DEFAULT_AVATAR_PATH)
    })

    it('should return DEFAULT_AVATAR_PATH for undefined', () => {
      expect(getValidImageUrl(undefined)).toBe(DEFAULT_AVATAR_PATH)
    })

    it('should return DEFAULT_AVATAR_PATH for number (ID)', () => {
      expect(getValidImageUrl(123)).toBe(DEFAULT_AVATAR_PATH)
    })

    it('should return DEFAULT_AVATAR_PATH when no valid URL exists', () => {
      const image = {
        sizes: {},
      } as PayloadImage

      expect(getValidImageUrl(image)).toBe(DEFAULT_AVATAR_PATH)
    })

    it('should return DEFAULT_AVATAR_PATH for invalid URLs', () => {
      const imageWithNull = {
        url: 'null',
        sizes: {},
      } as PayloadImage

      expect(getValidImageUrl(imageWithNull)).toBe(DEFAULT_AVATAR_PATH)
    })

    it('should return DEFAULT_AVATAR_PATH for URLs containing "/null"', () => {
      const imageWithNullPath = {
        url: 'https://example.com/null/image.jpg',
        sizes: {},
      } as PayloadImage

      expect(getValidImageUrl(imageWithNullPath)).toBe(DEFAULT_AVATAR_PATH)
    })
  })
})
