import type { Media } from '@/payload-types'
import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDefaultAvatar, getLogo, getLogoIcon, getMediaByAlt, getMediaByFilename, getMediaById } from '../media'

describe('Media Service', () => {
  let mockPayload: Payload

  const createMockMedia = (overrides: Partial<Media> = {}): Media =>
    ({
      id: 1,
      filename: 'logo.png',
      alt: 'Test Logo',
      url: 'https://example.com/logo.png',
      mimeType: 'image/png',
      filesize: 1024,
      width: 100,
      height: 100,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      ...overrides,
    }) as Media

  beforeEach(() => {
    mockPayload = {
      find: vi.fn(),
      findByID: vi.fn(),
    } as unknown as Payload
  })

  describe('getMediaByFilename', () => {
    it('should return media item when found', async () => {
      const mockMedia = createMockMedia()
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [mockMedia],
        totalDocs: 1,
        limit: 1,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      const result = await getMediaByFilename(mockPayload, 'logo.png')

      expect(result).toEqual(mockMedia)
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'media',
        where: { filename: { equals: 'logo.png' } },
        limit: 1,
      })
    })

    it('should return null when media not found', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [],
        totalDocs: 0,
        limit: 1,
        totalPages: 0,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      const result = await getMediaByFilename(mockPayload, 'nonexistent.png')

      expect(result).toBeNull()
    })

    it('should handle different file types', async () => {
      const webpMedia = createMockMedia({ filename: 'avatar.webp', mimeType: 'image/webp' })
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [webpMedia],
        totalDocs: 1,
        limit: 1,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      const result = await getMediaByFilename(mockPayload, 'avatar.webp')

      expect(result).toEqual(webpMedia)
    })
  })

  describe('getMediaById', () => {
    it('should return media item when found', async () => {
      const mockMedia = createMockMedia()
      vi.mocked(mockPayload.findByID).mockResolvedValue(mockMedia)

      const result = await getMediaById(mockPayload, '1')

      expect(result).toEqual(mockMedia)
      expect(mockPayload.findByID).toHaveBeenCalledWith({
        collection: 'media',
        id: '1',
      })
    })

    it('should return null when media not found', async () => {
      vi.mocked(mockPayload.findByID).mockRejectedValue(new Error('Not found'))

      const result = await getMediaById(mockPayload, 'nonexistent-id')

      expect(result).toBeNull()
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(mockPayload.findByID).mockRejectedValue(new Error('Database connection failed'))

      const result = await getMediaById(mockPayload, '1')

      expect(result).toBeNull()
    })
  })

  describe('getMediaByAlt', () => {
    it('should return media item when found by alt text', async () => {
      const mockMedia = createMockMedia()
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [mockMedia],
        totalDocs: 1,
        limit: 1,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      const result = await getMediaByAlt(mockPayload, 'Test Logo')

      expect(result).toEqual(mockMedia)
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'media',
        where: { alt: { equals: 'Test Logo' } },
        limit: 1,
      })
    })

    it('should return null when no media matches alt text', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [],
        totalDocs: 0,
        limit: 1,
        totalPages: 0,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      const result = await getMediaByAlt(mockPayload, 'Nonexistent Alt Text')

      expect(result).toBeNull()
    })

    it('should handle employee photo lookup', async () => {
      const employeePhoto = createMockMedia({ alt: 'John Doe', filename: 'john-doe.jpg' })
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [employeePhoto],
        totalDocs: 1,
        limit: 1,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      const result = await getMediaByAlt(mockPayload, 'John Doe')

      expect(result).toEqual(employeePhoto)
    })
  })

  describe('Convenience helpers', () => {
    describe('getLogo', () => {
      it('should fetch logo.png', async () => {
        const logo = createMockMedia({ filename: 'logo.png' })
        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [logo],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getLogo(mockPayload)

        expect(result?.filename).toBe('logo.png')
        expect(mockPayload.find).toHaveBeenCalledWith({
          collection: 'media',
          where: { filename: { equals: 'logo.png' } },
          limit: 1,
        })
      })

      it('should return null when logo not found', async () => {
        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [],
          totalDocs: 0,
          limit: 1,
          totalPages: 0,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getLogo(mockPayload)

        expect(result).toBeNull()
      })
    })

    describe('getLogoIcon', () => {
      it('should fetch logo_icon.png', async () => {
        const logoIcon = createMockMedia({ filename: 'logo_icon.png' })
        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [logoIcon],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getLogoIcon(mockPayload)

        expect(result?.filename).toBe('logo_icon.png')
        expect(mockPayload.find).toHaveBeenCalledWith({
          collection: 'media',
          where: { filename: { equals: 'logo_icon.png' } },
          limit: 1,
        })
      })
    })

    describe('getDefaultAvatar', () => {
      it('should fetch default-avatar.webp', async () => {
        const avatar = createMockMedia({ filename: 'default-avatar.webp', mimeType: 'image/webp' })
        vi.mocked(mockPayload.find).mockResolvedValue({
          docs: [avatar],
          totalDocs: 1,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

        const result = await getDefaultAvatar(mockPayload)

        expect(result?.filename).toBe('default-avatar.webp')
        expect(result?.mimeType).toBe('image/webp')
        expect(mockPayload.find).toHaveBeenCalledWith({
          collection: 'media',
          where: { filename: { equals: 'default-avatar.webp' } },
          limit: 1,
        })
      })
    })
  })
})
