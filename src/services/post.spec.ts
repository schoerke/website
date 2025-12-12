import { createMockPaginatedDocs, createMockPost } from '@/tests/utils/payloadMocks'
import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAllHomepagePosts,
  getAllNewsPosts,
  getAllNewsPostsByArtist,
  getAllPosts,
  getAllProjectPosts,
  getAllProjectPostsByArtist,
  getFilteredPosts,
  getPaginatedPosts,
  getPostBySlug,
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
        limit: 0,
      })
    })

    it('should fetch posts with specified locale', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getAllPosts('en')

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        locale: 'en',
        limit: 0,
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
        limit: 0,
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
        limit: 0,
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
        limit: 0,
      })
    })
  })

  describe('getAllNewsPostsByArtist', () => {
    it('should fetch news posts filtered by artist ID', async () => {
      const newsPost = createMockPost({ categories: ['news'], artists: [1] as never })
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
        limit: 0,
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
      const projectPost = createMockPost({ categories: ['projects'], artists: [1] as never })
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
        limit: 0,
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
        depth: 1,
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
        depth: 1,
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
        depth: 1,
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
        depth: 1,
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
        depth: 1,
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
        depth: 1,
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

    it('should filter by search text when search is 3+ characters', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getFilteredPosts({ search: 'test search' })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            or: [
              {
                normalizedTitle: {
                  contains: expect.any(String),
                },
              },
            ],
          }),
        }),
      )
    })

    it('should not filter by search text when search is less than 3 characters', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getFilteredPosts({ search: 'ab' })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            or: expect.anything(),
          }),
        }),
      )
    })
  })

  describe('getPaginatedPosts', () => {
    it('should return pagination metadata', async () => {
      const mockPosts = [createMockPost(), createMockPost({ id: 2, title: 'Post 2' })]
      const mockResult = {
        docs: mockPosts,
        totalDocs: 50,
        limit: 25,
        totalPages: 2,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: true,
        prevPage: null,
        nextPage: 2,
      }
      vi.mocked(mockPayload.find).mockResolvedValue(mockResult)

      const result = await getPaginatedPosts({ category: 'news' })

      expect(result.docs).toEqual(mockPosts)
      expect(result.totalPages).toBe(2)
      expect(result.page).toBe(1)
      expect(result.hasNextPage).toBe(true)
      expect(result.hasPrevPage).toBe(false)
    })

    it('should use default page and limit', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getPaginatedPosts({ category: 'news' })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 25,
        }),
      )
    })

    it('should accept custom page and limit', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getPaginatedPosts({ category: 'news', page: 3, limit: 10 })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 3,
          limit: 10,
        }),
      )
    })

    it('should filter by category', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getPaginatedPosts({ category: 'projects', page: 1, limit: 25 })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categories: { contains: 'projects' },
          }),
        }),
      )
    })

    it('should filter by artistId', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getPaginatedPosts({ category: 'news', artistId: 'artist-123' })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            artists: { equals: 'artist-123' },
          }),
        }),
      )
    })

    it('should filter by published status when publishedOnly is true', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getPaginatedPosts({ category: 'news', publishedOnly: true })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            _status: { equals: 'published' },
          }),
        }),
      )
    })

    it('should not filter by published status when publishedOnly is false', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getPaginatedPosts({ category: 'news', publishedOnly: false })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            _status: expect.anything(),
          }),
        }),
      )
    })

    it('should use specified locale', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getPaginatedPosts({ category: 'news', locale: 'en' })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: 'en',
        }),
      )
    })

    it('should sort by createdAt descending', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getPaginatedPosts({ category: 'news' })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: '-createdAt',
        }),
      )
    })

    it('should filter by search text when search is 3+ characters', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getPaginatedPosts({ category: 'news', search: 'test search' })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            or: [
              {
                normalizedTitle: {
                  contains: expect.any(String),
                },
              },
            ],
          }),
        }),
      )
    })

    it('should not filter by search text when search is less than 3 characters', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getPaginatedPosts({ category: 'news', search: 'ab' })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            or: expect.anything(),
          }),
        }),
      )
    })
  })

  describe('getPostBySlug', () => {
    it('should fetch post by slug with default locale', async () => {
      const mockPost = createMockPost({ slug: 'test-post' })
      vi.mocked(mockPayload.find).mockResolvedValue({
        ...createMockPaginatedDocs([mockPost]),
        limit: 1,
      })

      const result = await getPostBySlug('test-post')

      expect(result).toEqual(mockPost)
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: {
          slug: { equals: 'test-post' },
        },
        limit: 1,
        locale: 'de',
        depth: 1,
      })
    })

    it('should fetch post by slug with specified locale', async () => {
      const mockPost = createMockPost({ slug: 'test-post' })
      vi.mocked(mockPayload.find).mockResolvedValue({
        ...createMockPaginatedDocs([mockPost]),
        limit: 1,
      })

      await getPostBySlug('test-post', 'en')

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: {
          slug: { equals: 'test-post' },
        },
        limit: 1,
        locale: 'en',
        depth: 1,
      })
    })

    it('should return null when post is not found', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue({
        ...createMockPaginatedDocs([]),
        limit: 1,
      })

      const result = await getPostBySlug('nonexistent-slug')

      expect(result).toBeNull()
    })

    it('should return first post when multiple matches exist', async () => {
      const mockPosts = [createMockPost({ id: 1, slug: 'test' }), createMockPost({ id: 2, slug: 'test' })]
      vi.mocked(mockPayload.find).mockResolvedValue({
        ...createMockPaginatedDocs(mockPosts),
        limit: 1,
      })

      const result = await getPostBySlug('test')

      expect(result).toEqual(mockPosts[0])
      expect(result?.id).toBe(1)
    })

    it('should populate artist relationships with depth: 1', async () => {
      const { createMockArtist } = await import('@/tests/utils/payloadMocks')
      const mockArtist = createMockArtist({ id: 123, name: 'John Doe', slug: 'john-doe' })
      const mockPost = createMockPost({
        slug: 'test-post',
        artists: [mockArtist], // Populated artist object, not just ID
      })
      vi.mocked(mockPayload.find).mockResolvedValue({
        ...createMockPaginatedDocs([mockPost]),
        limit: 1,
      })

      const result = await getPostBySlug('test-post')

      expect(result?.artists).toBeDefined()
      expect(Array.isArray(result?.artists)).toBe(true)
      expect(result?.artists?.[0]).toHaveProperty('name')
      expect(result?.artists?.[0]).toHaveProperty('slug')
      expect(typeof result?.artists?.[0]).toBe('object')
    })

    it('should populate image relationship with depth: 1', async () => {
      const { createMockImage } = await import('@/tests/utils/payloadMocks')
      const mockImage = createMockImage({ id: 1, url: '/api/images/file/test.jpg', alt: 'Test Image' })
      const mockPost = createMockPost({
        slug: 'test-post',
        image: mockImage, // Populated image object, not just ID
      })
      vi.mocked(mockPayload.find).mockResolvedValue({
        ...createMockPaginatedDocs([mockPost]),
        limit: 1,
      })

      const result = await getPostBySlug('test-post')

      expect(result?.image).toBeDefined()
      expect(typeof result?.image).toBe('object')
      expect(result?.image).toHaveProperty('url')
      expect(result?.image).toHaveProperty('alt')
    })
  })
})
