import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_AVATAR_PATH,
  LOGO_ICON_PATH,
  LOGO_PATH,
  getDefaultAvatar,
  getImageByFilename,
  getLogo,
  getLogoIcon,
} from './media'

// Mock global fetch
global.fetch = vi.fn()

describe('media service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('constants', () => {
    it('should export correct LOGO_PATH', () => {
      expect(LOGO_PATH).toBe('/api/images/file/logo.png')
    })

    it('should export correct LOGO_ICON_PATH', () => {
      expect(LOGO_ICON_PATH).toBe('/api/images/file/logo_icon.png')
    })

    it('should export correct DEFAULT_AVATAR_PATH', () => {
      expect(DEFAULT_AVATAR_PATH).toBe('/api/images/file/default-avatar.webp')
    })
  })

  describe('deprecated helper functions', () => {
    it('getLogo should return LOGO_PATH', () => {
      expect(getLogo()).toBe(LOGO_PATH)
      expect(getLogo()).toBe('/api/images/file/logo.png')
    })

    it('getLogoIcon should return LOGO_ICON_PATH', () => {
      expect(getLogoIcon()).toBe(LOGO_ICON_PATH)
      expect(getLogoIcon()).toBe('/api/images/file/logo_icon.png')
    })

    it('getDefaultAvatar should return DEFAULT_AVATAR_PATH', () => {
      expect(getDefaultAvatar()).toBe(DEFAULT_AVATAR_PATH)
      expect(getDefaultAvatar()).toBe('/api/images/file/default-avatar.webp')
    })
  })

  describe('getImageByFilename', () => {
    it('should fetch image by filename and return first result', async () => {
      const mockImage = {
        id: 'img-123',
        filename: 'test-image.jpg',
        url: 'https://example.com/test-image.jpg',
        alt: 'Test Image',
      }

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          docs: [mockImage],
          totalDocs: 1,
        }),
      } as Response)

      const result = await getImageByFilename('test-image.jpg')

      expect(result).toEqual(mockImage)
      expect(mockFetch).toHaveBeenCalledWith('/api/images?where[filename][equals]=test-image.jpg&limit=1')
    })

    it('should return null when image is not found', async () => {
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          docs: [],
          totalDocs: 0,
        }),
      } as Response)

      const result = await getImageByFilename('nonexistent.jpg')

      expect(result).toBeNull()
      expect(mockFetch).toHaveBeenCalledWith('/api/images?where[filename][equals]=nonexistent.jpg&limit=1')
    })

    it('should return null when docs array is undefined', async () => {
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          totalDocs: 0,
        }),
      } as Response)

      const result = await getImageByFilename('test.jpg')

      expect(result).toBeNull()
    })

    it('should use NEXT_PUBLIC_SERVER_URL if set', async () => {
      const originalEnv = process.env.NEXT_PUBLIC_SERVER_URL
      process.env.NEXT_PUBLIC_SERVER_URL = 'https://example.com'

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          docs: [],
          totalDocs: 0,
        }),
      } as Response)

      await getImageByFilename('test.jpg')

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/api/images?where[filename][equals]=test.jpg&limit=1')

      // Restore original env immediately
      if (originalEnv === undefined) {
        delete process.env.NEXT_PUBLIC_SERVER_URL
      } else {
        process.env.NEXT_PUBLIC_SERVER_URL = originalEnv
      }
    })

    it('should handle filenames with special characters', async () => {
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          docs: [],
          totalDocs: 0,
        }),
      } as Response)

      await getImageByFilename('image with spaces.jpg')

      expect(mockFetch).toHaveBeenCalledWith('/api/images?where[filename][equals]=image with spaces.jpg&limit=1')
    })

    it('should return first doc when multiple results exist', async () => {
      const mockImages = [
        {
          id: 'img-1',
          filename: 'duplicate.jpg',
          url: 'https://example.com/duplicate-1.jpg',
          alt: 'First Image',
        },
        {
          id: 'img-2',
          filename: 'duplicate.jpg',
          url: 'https://example.com/duplicate-2.jpg',
          alt: 'Second Image',
        },
      ]

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          docs: mockImages,
          totalDocs: 2,
        }),
      } as Response)

      const result = await getImageByFilename('duplicate.jpg')

      expect(result).toEqual(mockImages[0])
      expect(result?.id).toBe('img-1')
    })

    it('should handle fetch errors gracefully', async () => {
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(getImageByFilename('test.jpg')).rejects.toThrow('Network error')
    })

    it('should handle JSON parsing errors gracefully', async () => {
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      } as unknown as Response)

      await expect(getImageByFilename('test.jpg')).rejects.toThrow('Invalid JSON')
    })
  })
})
