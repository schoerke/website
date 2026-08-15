import { createMockArtist, createMockPaginatedDocs, createMockRepertoire } from '@/tests/utils/payloadMocks'
import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getArtistBySlug, getArtistListData } from './artist'

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
        depth: 2,
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

    it('should populate repertoire preserving array order', async () => {
      const mockArtist = createMockArtist({ id: 7, repertoire: [30, 10, 20] })
      const repertoires = [
        createMockRepertoire({ id: 10 }),
        createMockRepertoire({ id: 20 }),
        createMockRepertoire({ id: 30 }),
      ]

      vi.mocked(mockPayload.find)
        .mockResolvedValueOnce(createMockPaginatedDocs([mockArtist]))
        .mockResolvedValueOnce(createMockPaginatedDocs(repertoires))

      const result = await getArtistBySlug('test-artist')

      // Second query: repertoire collection by IDs
      expect(mockPayload.find).toHaveBeenNthCalledWith(2, {
        collection: 'repertoire',
        where: { id: { in: [30, 10, 20] } },
        depth: 1,
        locale: 'de',
        fallbackLocale: 'de',
      })
      // Order preserved from artist.repertoire array, not query result order
      expect(result?.repertoire?.map((r) => (typeof r === 'object' && r !== null ? r.id : r))).toEqual([30, 10, 20])
    })

    it('should skip repertoire population when artist has none', async () => {
      const mockArtist = createMockArtist({ id: 7 })
      vi.mocked(mockPayload.find).mockResolvedValueOnce(createMockPaginatedDocs([mockArtist]))

      const result = await getArtistBySlug('test-artist')

      expect(mockPayload.find).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockArtist)
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
        depth: 1,
        locale: 'de',
        fallbackLocale: 'de',
        limit: 0,
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
        })
      )
    })
  })
})
