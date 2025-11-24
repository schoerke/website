import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockPaginatedDocs, createMockPost } from './__test-utils__/payloadMocks'
import {
  getAllHomepagePosts,
  getAllNewsPosts,
  getAllNewsPostsByArtist,
  getAllPosts,
  getAllProjectPosts,
  getAllProjectPostsByArtist,
  getFilteredPosts,
} from './post'

// Mock getPayload at the module level
vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return {
    ...actual,
    getPayload: vi.fn(),
  }
})

describe('Post Service', () => {
  let mockPayload: Payload

  beforeEach(async () => {
    mockPayload = {
      find: vi.fn(),
    } as unknown as Payload

    // Mock getPayload to return our mock payload instance
    const { getPayload } = await import('payload')
    vi.mocked(getPayload).mockResolvedValue(mockPayload)
  })

  describe('getAllPosts', () => {
    it('should fetch all posts with default locale', async () => {
      const mockPosts = [createMockPost(), createMockPost({ id: 2, title: 'Another Post' })]
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs(mockPosts))

      const result = await getAllPosts()

      expect(result.docs).toEqual(mockPosts)
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        locale: 'de',
      })
    })

    it('should fetch posts with specified locale', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getAllPosts('en')

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        locale: 'en',
      })
    })
  })

  describe('getAllNewsPosts', () => {
    it('should fetch only published news posts', async () => {
      const newsPost = createMockPost({ categories: ['news'] })
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([newsPost]))

      const result = await getAllNewsPosts()

      expect(result.docs[0].categories).toContain('news')
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: {
          categories: { equals: 'news' },
          published: { equals: true },
        },
        locale: 'de',
      })
    })
  })

  describe('getAllProjectPosts', () => {
    it('should fetch only published project posts', async () => {
      const projectPost = createMockPost({ categories: ['projects'] })
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([projectPost]))

      await getAllProjectPosts()

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: {
          categories: { equals: 'projects' },
          published: { equals: true },
        },
        locale: 'de',
      })
    })
  })

  describe('getAllHomepagePosts', () => {
    it('should fetch only published homepage posts', async () => {
      const homePost = createMockPost({ categories: ['home'] })
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([homePost]))

      await getAllHomepagePosts()

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: {
          categories: { equals: 'home' },
          published: { equals: true },
        },
        locale: 'de',
      })
    })
  })

  describe('getAllNewsPostsByArtist', () => {
    it('should fetch news posts filtered by artist ID', async () => {
      const newsPost = createMockPost({ categories: ['news'], artists: [1] as any })
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([newsPost]))

      await getAllNewsPostsByArtist('1')

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: {
          categories: { contains: 'news' },
          artists: { equals: '1' },
          published: { equals: true },
        },
        locale: 'de',
      })
    })

    it('should use contains for categories to match partial arrays', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getAllNewsPostsByArtist('1')

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categories: { contains: 'news' },
          }),
        }),
      )
    })
  })

  describe('getAllProjectPostsByArtist', () => {
    it('should fetch project posts filtered by artist ID', async () => {
      const projectPost = createMockPost({ categories: ['projects'], artists: [1] as any })
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([projectPost]))

      await getAllProjectPostsByArtist('1')

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: {
          categories: { contains: 'projects' },
          artists: { equals: '1' },
          published: { equals: true },
        },
        locale: 'de',
      })
    })

    it('should only return published posts', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getAllProjectPostsByArtist('1')

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            published: { equals: true },
          }),
        }),
      )
    })
  })
  describe('getFilteredPosts', () => {
    it('should fetch published posts by default', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getFilteredPosts({})

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: { _status: { equals: 'published' } },
        limit: 100,
        locale: 'de',
        sort: '-createdAt',
      })
    })

    it('should filter by single category', async () => {
      const newsPost = createMockPost({ categories: ['news'] })
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([newsPost]))

      await getFilteredPosts({ category: 'news' })

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: {
          _status: { equals: 'published' },
          categories: { contains: 'news' },
        },
        limit: 100,
        locale: 'de',
        sort: '-createdAt',
      })
    })

    it('should filter by multiple categories', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getFilteredPosts({ category: ['news', 'projects'] })

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: {
          _status: { equals: 'published' },
          categories: { in: ['news', 'projects'] },
        },
        limit: 100,
        locale: 'de',
        sort: '-createdAt',
      })
    })

    it('should filter by artist ID', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getFilteredPosts({ artistId: '123' })

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: {
          _status: { equals: 'published' },
          artists: { equals: '123' },
        },
        limit: 100,
        locale: 'de',
        sort: '-createdAt',
      })
    })

    it('should combine category and artist filters', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getFilteredPosts({ category: 'news', artistId: '123' })

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: {
          _status: { equals: 'published' },
          categories: { contains: 'news' },
          artists: { equals: '123' },
        },
        limit: 100,
        locale: 'de',
        sort: '-createdAt',
      })
    })

    it('should respect custom limit', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getFilteredPosts({ limit: 5 })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
        }),
      )
    })

    it('should respect custom locale', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getFilteredPosts({ locale: 'en' })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: 'en',
        }),
      )
    })

    it('should include unpublished posts when publishedOnly is false', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getFilteredPosts({ publishedOnly: false })

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: {},
        limit: 100,
        locale: 'de',
        sort: '-createdAt',
      })
    })

    it('should sort by createdAt descending', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getFilteredPosts({})

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: '-createdAt',
        }),
      )
    })
  })
})
