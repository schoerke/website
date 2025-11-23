import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockArtist, createMockPaginatedDocs } from './__test-utils__/payloadMocks'
import { getArtistById, getArtistBySlug, getArtistListData, getArtists } from './artist'

// Mock getPayload at the module level
vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return {
    ...actual,
    getPayload: vi.fn(),
  }
})

describe('Artist Service', () => {
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

  describe('getArtists', () => {
    it('should fetch all artists with default locale and fallback', async () => {
      const mockArtists = [createMockArtist(), createMockArtist({ id: 2, name: 'Another Artist' })]
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs(mockArtists))

      const result = await getArtists()

      expect(result.docs).toEqual(mockArtists)
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'artists',
        locale: 'de',
        fallbackLocale: 'de',
      })
    })

    it('should fetch artists with specified locale', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getArtists('en')

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'artists',
        locale: 'en',
        fallbackLocale: 'de',
      })
    })
  })

  describe('getArtistById', () => {
    it('should fetch artist by ID with fallback locale', async () => {
      const mockArtist = createMockArtist()
      vi.mocked(mockPayload.findByID).mockResolvedValue(mockArtist)

      const result = await getArtistById('1')

      expect(result).toEqual(mockArtist)
      expect(mockPayload.findByID).toHaveBeenCalledWith({
        collection: 'artists',
        id: '1',
        locale: 'de',
        fallbackLocale: 'de',
      })
    })

    it('should use specified locale', async () => {
      const mockArtist = createMockArtist()
      vi.mocked(mockPayload.findByID).mockResolvedValue(mockArtist)

      await getArtistById('1', 'en')

      expect(mockPayload.findByID).toHaveBeenCalledWith({
        collection: 'artists',
        id: '1',
        locale: 'en',
        fallbackLocale: 'de',
      })
    })
  })

  describe('getArtistBySlug', () => {
    it('should fetch artist by slug with fallback locale', async () => {
      const mockArtist = createMockArtist()
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([mockArtist]))

      const result = await getArtistBySlug('test-artist')

      expect(result).toEqual(mockArtist)
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'artists',
        where: { slug: { equals: 'test-artist' } },
        limit: 1,
        locale: 'de',
        fallbackLocale: 'de',
      })
    })

    it('should return first matching artist when multiple found', async () => {
      const mockArtist = createMockArtist()
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([mockArtist, createMockArtist({ id: 2 })]))

      const result = await getArtistBySlug('test-artist')

      expect(result).toEqual(mockArtist)
    })

    it('should return undefined when artist not found', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      const result = await getArtistBySlug('nonexistent-slug')

      expect(result).toBeUndefined()
    })
  })

  describe('getArtistListData', () => {
    it('should fetch only selected fields for list page', async () => {
      const mockArtist = createMockArtist()
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([mockArtist]))

      await getArtistListData()

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'artists',
        select: {
          name: true,
          image: true,
          instrument: true,
          id: true,
          slug: true,
        },
        locale: 'de',
        fallbackLocale: 'de',
      })
    })

    it('should optimize by selecting only necessary fields', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getArtistListData('en')

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            name: true,
            image: true,
            instrument: true,
            id: true,
            slug: true,
          }),
        }),
      )
    })
  })
})
