import type { Post } from '@/payload-types'
import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAllHomepagePosts,
  getAllNewsPosts,
  getAllNewsPostsByArtist,
  getAllPosts,
  getAllProjectPosts,
  getAllProjectPostsByArtist,
} from '../post'

describe('Post Service', () => {
  let mockPayload: Payload

  const createMockPost = (overrides: Partial<Post> = {}): Post =>
    ({
      id: 1,
      title: 'Test Post',
      slug: 'test-post',
      categories: ['news'],
      published: true,
      updatedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      ...overrides,
    }) as Post

  beforeEach(() => {
    mockPayload = {
      find: vi.fn(),
    } as unknown as Payload
  })

  describe('getAllPosts', () => {
    it('should fetch all posts with default locale', async () => {
      const mockPosts = [createMockPost(), createMockPost({ id: 2, title: 'Another Post' })]
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: mockPosts,
        totalDocs: 2,
        limit: 10,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      const result = await getAllPosts(mockPayload)

      expect(result.docs).toEqual(mockPosts)
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        locale: 'de',
      })
    })

    it('should fetch posts with specified locale', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [],
        totalDocs: 0,
        limit: 10,
        totalPages: 0,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      await getAllPosts(mockPayload, 'en')

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        locale: 'en',
      })
    })
  })

  describe('getAllNewsPosts', () => {
    it('should fetch only published news posts', async () => {
      const newsPost = createMockPost({ categories: ['news'] })
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [newsPost],
        totalDocs: 1,
        limit: 10,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      const result = await getAllNewsPosts(mockPayload)

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
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [projectPost],
        totalDocs: 1,
        limit: 10,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      await getAllProjectPosts(mockPayload)

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
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [homePost],
        totalDocs: 1,
        limit: 10,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      await getAllHomepagePosts(mockPayload)

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
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [newsPost],
        totalDocs: 1,
        limit: 10,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      await getAllNewsPostsByArtist(mockPayload, '1')

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
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [],
        totalDocs: 0,
        limit: 10,
        totalPages: 0,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      await getAllNewsPostsByArtist(mockPayload, '1')

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
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [projectPost],
        totalDocs: 1,
        limit: 10,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      await getAllProjectPostsByArtist(mockPayload, '1')

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
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [],
        totalDocs: 0,
        limit: 10,
        totalPages: 0,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      await getAllProjectPostsByArtist(mockPayload, '1')

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            published: { equals: true },
          }),
        }),
      )
    })
  })
})
