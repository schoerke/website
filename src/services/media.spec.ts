import { createMockImage } from '@/tests/utils/payloadMocks'
import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_AVATAR_PATH, LOGO_ICON_PATH, LOGO_PATH, getDefaultAvatar, getLogo, getLogoIcon } from './media'
import { getImageByFilename } from './media.server'

// Mock getPayload at the module level
vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return {
    ...actual,
    getPayload: vi.fn(),
  }
})

describe('media service', () => {
  let mockPayload: Payload

  beforeEach(async () => {
    mockPayload = {
      find: vi.fn(),
    } as unknown as Payload

    const { getPayload } = await import('payload')
    vi.mocked(getPayload).mockResolvedValue(mockPayload)
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
      const mockImage = createMockImage({ filename: 'test-image.jpg', alt: 'Test Image' })

      vi.mocked(mockPayload.find).mockResolvedValueOnce({
        docs: [mockImage],
        totalDocs: 1,
        hasNextPage: false,
        hasPrevPage: false,
        limit: 1,
        nextPage: null,
        page: 1,
        pagingCounter: 1,
        prevPage: null,
        totalPages: 1,
      })

      const result = await getImageByFilename('test-image.jpg')

      expect(result).toEqual(mockImage)
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'images',
        where: { filename: { equals: 'test-image.jpg' } },
        limit: 1,
      })
    })

    it('should return null when image is not found', async () => {
      vi.mocked(mockPayload.find).mockResolvedValueOnce({
        docs: [],
        totalDocs: 0,
        hasNextPage: false,
        hasPrevPage: false,
        limit: 1,
        nextPage: null,
        page: 1,
        pagingCounter: 1,
        prevPage: null,
        totalPages: 0,
      })

      const result = await getImageByFilename('nonexistent.jpg')

      expect(result).toBeNull()
    })

    it('should return first doc when multiple results exist', async () => {
      const mockImage1 = createMockImage({ id: 1, filename: 'duplicate.jpg', alt: 'First Image' })
      const mockImage2 = createMockImage({ id: 2, filename: 'duplicate.jpg', alt: 'Second Image' })

      vi.mocked(mockPayload.find).mockResolvedValueOnce({
        docs: [mockImage1, mockImage2],
        totalDocs: 2,
        hasNextPage: false,
        hasPrevPage: false,
        limit: 1,
        nextPage: null,
        page: 1,
        pagingCounter: 1,
        prevPage: null,
        totalPages: 1,
      })

      const result = await getImageByFilename('duplicate.jpg')

      expect(result).toEqual(mockImage1)
      expect(result?.id).toBe(1)
    })

    it('should throw when the Local API call fails', async () => {
      vi.spyOn(console, 'error').mockImplementationOnce(() => {})
      vi.mocked(mockPayload.find).mockRejectedValueOnce(new Error('Database error'))

      await expect(getImageByFilename('test.jpg')).rejects.toThrow('Failed to fetch image: Database error')
    })
  })
})
