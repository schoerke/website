import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockMedia, createMockPaginatedDocs } from './__test-utils__/payloadMocks'
import { getDefaultAvatar, getLogo, getLogoIcon, getMediaByAlt, getMediaByFilename, getMediaById } from './media'

// Mock getPayload at the module level
vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return {
    ...actual,
    getPayload: vi.fn(),
  }
})

describe('Media Service', () => {
  let mockPayload: Payload

  beforeEach(async () => {
    mockPayload = {
      find: vi.fn(),
      findByID: vi.fn(),
    } as unknown as Payload

    // Mock getPayload to return our mock payload instance
    const { getPayload } = await import('payload')
    vi.mocked(getPayload).mockResolvedValue(mockPayload)
  })

  describe('getMediaByFilename', () => {
    it('should return media item when found', async () => {
      const mockMedia = createMockMedia()
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([mockMedia]))

      const result = await getMediaByFilename('logo.png')

      expect(result).toEqual(mockMedia)
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'media',
        where: { filename: { equals: 'logo.png' } },
        limit: 1,
      })
    })

    it('should return null when media not found', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      const result = await getMediaByFilename('nonexistent.png')

      expect(result).toBeNull()
    })

    it('should handle different file types', async () => {
      const webpMedia = createMockMedia({ filename: 'avatar.webp', mimeType: 'image/webp' })
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([webpMedia]))

      const result = await getMediaByFilename('avatar.webp')

      expect(result).toEqual(webpMedia)
    })
  })

  describe('getMediaById', () => {
    it('should return media item when found', async () => {
      const mockMedia = createMockMedia()
      vi.mocked(mockPayload.findByID).mockResolvedValue(mockMedia)

      const result = await getMediaById('1')

      expect(result).toEqual(mockMedia)
      expect(mockPayload.findByID).toHaveBeenCalledWith({
        collection: 'media',
        id: '1',
      })
    })

    it('should return null when media not found', async () => {
      vi.mocked(mockPayload.findByID).mockRejectedValue(new Error('Not found'))

      const result = await getMediaById('nonexistent-id')

      expect(result).toBeNull()
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(mockPayload.findByID).mockRejectedValue(new Error('Database connection failed'))

      const result = await getMediaById('1')

      expect(result).toBeNull()
    })
  })

  describe('getMediaByAlt', () => {
    it('should return media item when found by alt text', async () => {
      const mockMedia = createMockMedia()
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([mockMedia]))

      const result = await getMediaByAlt('Test Logo')

      expect(result).toEqual(mockMedia)
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'media',
        where: { alt: { equals: 'Test Logo' } },
        limit: 1,
      })
    })

    it('should return null when no media matches alt text', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      const result = await getMediaByAlt('Nonexistent Alt Text')

      expect(result).toBeNull()
    })

    it('should handle employee photo lookup', async () => {
      const employeePhoto = createMockMedia({ alt: 'John Doe', filename: 'john-doe.jpg' })
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([employeePhoto]))

      const result = await getMediaByAlt('John Doe')

      expect(result).toEqual(employeePhoto)
    })
  })

  describe('Convenience helpers', () => {
    describe('getLogo', () => {
      it('should fetch logo.png', async () => {
        const logo = createMockMedia({ filename: 'logo.png' })
        vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([logo]))

        const result = await getLogo()

        expect(result?.filename).toBe('logo.png')
        expect(mockPayload.find).toHaveBeenCalledWith({
          collection: 'media',
          where: { filename: { equals: 'logo.png' } },
          limit: 1,
        })
      })

      it('should return null when logo not found', async () => {
        vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

        const result = await getLogo()

        expect(result).toBeNull()
      })
    })

    describe('getLogoIcon', () => {
      it('should fetch logo_icon.png', async () => {
        const logoIcon = createMockMedia({ filename: 'logo_icon.png' })
        vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([logoIcon]))

        const result = await getLogoIcon()

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
        vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([avatar]))

        const result = await getDefaultAvatar()

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
