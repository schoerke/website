import { createMockArtist, createMockPaginatedDocs, createMockRepertoire } from '@/tests/utils/payloadMocks'
import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getArtistBySlug, getArtistListData, getArtistSlugs } from './artist'

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
    const ARTIST_SELECT = {
      name: true,
      slug: true,
      image: true,
      biography: true,
      quote: true,
      contactPersons: true,
      homepageURL: true,
      externalCalendarURL: true,
      facebookURL: true,
      instagramURL: true,
      twitterURL: true,
      youtubeURL: true,
      spotifyURL: true,
      downloads: true,
      videoLinks: true,
      galleryImages: true,
      projects: true,
      repertoire: true,
    }

    const IMAGES_POPULATE = {
      filename: true,
      url: true,
      alt: true,
      credit: true,
      width: true,
      height: true,
      focalX: true,
      focalY: true,
      updatedAt: true,
    }

    const ARTIST_POPULATE = {
      images: IMAGES_POPULATE,
      employees: { name: true, title: true, email: true, phone: true, mobile: true },
      repertoire: { title: true, content: true },
      posts: { title: true, slug: true, image: true, content: true },
      documents: { filename: true, url: true, updatedAt: true },
    }

    it('should fetch artist by slug with slim select and populate', async () => {
      const mockArtist = createMockArtist()
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([mockArtist]))

      const result = await getArtistBySlug('test-artist')

      expect(result).toEqual(mockArtist)
      expect(mockPayload.find).toHaveBeenCalledTimes(1)
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'artists',
        where: { slug: { equals: 'test-artist' } },
        limit: 1,
        depth: 2,
        locale: 'de',
        fallbackLocale: 'de',
        select: ARTIST_SELECT,
        populate: ARTIST_POPULATE,
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

    it('should preserve repertoire array order from the single populated query', async () => {
      const mockArtist = createMockArtist({
        id: 7,
        repertoire: [
          createMockRepertoire({ id: 30 }),
          createMockRepertoire({ id: 10 }),
          createMockRepertoire({ id: 20 }),
        ],
      })
      vi.mocked(mockPayload.find).mockResolvedValueOnce(createMockPaginatedDocs([mockArtist]))

      const result = await getArtistBySlug('test-artist')

      expect(mockPayload.find).toHaveBeenCalledTimes(1)
      expect(result?.repertoire?.map((r) => (typeof r === 'object' && r !== null ? r.id : r))).toEqual([30, 10, 20])
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
        populate: {
          images: {
            url: true,
            alt: true,
            width: true,
            height: true,
            focalX: true,
            focalY: true,
            updatedAt: true,
            filename: true,
          },
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

  describe('getArtistSlugs', () => {
    it('should fetch only the slug field for all artists', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(
        createMockPaginatedDocs([createMockArtist({ slug: 'marc-gruber' }), createMockArtist({ slug: 'olga-scheps' })])
      )

      const result = await getArtistSlugs()

      expect(result).toEqual(['marc-gruber', 'olga-scheps'])
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'artists',
        select: { slug: true },
        limit: 0,
        locale: 'de',
        fallbackLocale: 'de',
      })
    })

    it('should return empty array when no artists exist', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      const result = await getArtistSlugs()

      expect(result).toEqual([])
    })
  })
})
