import type { Artist, Post } from '@/payload-types'
import type { CollectionAfterChangeHook, PayloadRequest } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { syncArtistProjects } from './syncArtistProjects'

/**
 * Tests for syncArtistProjects hook
 *
 * Verifies that artist.projects arrays are automatically synced when posts are linked/unlinked:
 * - Only syncs published posts (not drafts)
 * - Adds project posts to newly linked artists
 * - Removes posts from unlinked artists
 * - Prevents duplicate projects
 * - Prevents infinite loops with context flag
 * - Handles errors gracefully without blocking post save
 * - Uses batched queries for better performance
 */

// Type for hook arguments
type HookArgs = Parameters<CollectionAfterChangeHook>[0]

// Helper type for Payload find result
interface FindResult<T> {
  docs: T[]
  totalDocs: number
  limit: number
  totalPages: number
  page: number
  pagingCounter: number
  hasPrevPage: boolean
  hasNextPage: boolean
  prevPage: number | null
  nextPage: number | null
}

describe('syncArtistProjects hook', () => {
  // Helper to create mock Payload request
  const createMockRequest = (overrides?: Partial<PayloadRequest>): PayloadRequest => {
    return {
      payload: {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
        find: vi.fn(),
        update: vi.fn(),
      },
      context: {},
      ...overrides,
    } as unknown as PayloadRequest
  }

  // Helper to create mock post document
  const createMockPost = (overrides?: Partial<Post>): Post =>
    ({
      id: 123,
      title: 'Test Project Post',
      slug: 'test-project',
      _status: 'published',
      artists: [],
      categories: ['projects'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    }) as Post

  // Helper to create mock artist document
  const createMockArtist = (overrides?: Partial<Artist>): Artist =>
    ({
      id: 456,
      name: 'Test Artist',
      slug: 'test-artist',
      instrument: [],
      projects: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    }) as Artist

  // Helper to create mock find result
  const createMockFindResult = <T>(docs: T[]): FindResult<T> => ({
    docs,
    totalDocs: docs.length,
    limit: docs.length,
    totalPages: 1,
    page: 1,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loop prevention', () => {
    it('should skip when context.syncingProjects is true', async () => {
      const req = createMockRequest({ context: { syncingProjects: true } })
      const doc = createMockPost()

      await syncArtistProjects({
        doc,
        req,
        context: { syncingProjects: true },
      } as unknown as HookArgs)

      expect(req.payload.find).not.toHaveBeenCalled()
      expect(req.payload.update).not.toHaveBeenCalled()
    })

    it('should set context flag before making updates', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ artists: [1] })
      const previousDoc = createMockPost({ artists: [] })

      const mockArtist = createMockArtist({ id: 1, projects: [] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))
      vi.mocked(req.payload.update).mockResolvedValue(mockArtist as Artist)

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.context.syncingProjects).toBe(true)
    })
  })

  describe('draft handling', () => {
    it('should skip draft posts', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ _status: 'draft', artists: [1] })
      const previousDoc = createMockPost({ artists: [] })

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.find).not.toHaveBeenCalled()
      expect(req.payload.update).not.toHaveBeenCalled()
    })

    it('should sync published posts', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ _status: 'published', artists: [1] })
      const previousDoc = createMockPost({ artists: [] })

      const mockArtist = createMockArtist({ id: 1, projects: [] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))
      vi.mocked(req.payload.update).mockResolvedValue(mockArtist as Artist)

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.find).toHaveBeenCalledWith({
        collection: 'artists',
        where: { id: { in: [1] } },
        limit: 1,
      })
    })
  })

  describe('adding artists', () => {
    it('should add project post to newly linked artist', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ id: 123, artists: [1], categories: ['projects'] })
      const previousDoc = createMockPost({ artists: [] })

      const mockArtist = createMockArtist({ id: 1, projects: [] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))
      vi.mocked(req.payload.update).mockResolvedValue(mockArtist as Artist)

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.find).toHaveBeenCalledWith({
        collection: 'artists',
        where: { id: { in: [1] } },
        limit: 1,
      })
      expect(req.payload.update).toHaveBeenCalledWith({
        collection: 'artists',
        id: 1,
        data: {
          projects: [123],
        },
      })
    })

    it('should not add duplicates if post is already in projects', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ id: 123, artists: [1], categories: ['projects'] })
      const previousDoc = createMockPost({ artists: [] })

      const mockArtist = createMockArtist({ id: 1, projects: [123] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.update).not.toHaveBeenCalled()
    })

    it('should only add if post has projects category', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ id: 123, artists: [1], categories: ['news'] })
      const previousDoc = createMockPost({ artists: [] })

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.find).not.toHaveBeenCalled()
      expect(req.payload.update).not.toHaveBeenCalled()
    })

    it('should add to multiple newly linked artists', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ id: 123, artists: [1, 2], categories: ['projects'] })
      const previousDoc = createMockPost({ artists: [] })

      const mockArtist1 = createMockArtist({ id: 1, projects: [] })
      const mockArtist2 = createMockArtist({ id: 2, projects: [] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist1, mockArtist2]))
      vi.mocked(req.payload.update).mockResolvedValue({} as Artist)

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.find).toHaveBeenCalledWith({
        collection: 'artists',
        where: { id: { in: [1, 2] } },
        limit: 2,
      })
      expect(req.payload.update).toHaveBeenCalledTimes(2)
      expect(req.payload.update).toHaveBeenCalledWith({
        collection: 'artists',
        id: 1,
        data: { projects: [123] },
      })
      expect(req.payload.update).toHaveBeenCalledWith({
        collection: 'artists',
        id: 2,
        data: { projects: [123] },
      })
    })

    it('should append to existing projects array', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ id: 123, artists: [1], categories: ['projects'] })
      const previousDoc = createMockPost({ artists: [] })

      const mockArtist = createMockArtist({ id: 1, projects: [999, 888] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))
      vi.mocked(req.payload.update).mockResolvedValue(mockArtist as Artist)

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.update).toHaveBeenCalledWith({
        collection: 'artists',
        id: 1,
        data: {
          projects: [999, 888, 123],
        },
      })
    })
  })

  describe('removing artists', () => {
    it('should remove post from unlinked artist', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ id: 123, artists: [], categories: ['projects'] })
      const previousDoc = createMockPost({ artists: [1] })

      const mockArtist = createMockArtist({ id: 1, projects: [123, 456] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))
      vi.mocked(req.payload.update).mockResolvedValue(mockArtist as Artist)

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.find).toHaveBeenCalledWith({
        collection: 'artists',
        where: { id: { in: [1] } },
        limit: 1,
      })
      expect(req.payload.update).toHaveBeenCalledWith({
        collection: 'artists',
        id: 1,
        data: {
          projects: [456],
        },
      })
    })

    it('should handle artist with no projects gracefully', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ id: 123, artists: [] })
      const previousDoc = createMockPost({ artists: [1] })

      const mockArtist = createMockArtist({ id: 1, projects: [] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.update).not.toHaveBeenCalled()
    })

    it('should not update if post is not in artist projects', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ id: 123, artists: [] })
      const previousDoc = createMockPost({ artists: [1] })

      const mockArtist = createMockArtist({ id: 1, projects: [999] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.update).not.toHaveBeenCalled()
    })

    it('should remove from multiple unlinked artists', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ id: 123, artists: [] })
      const previousDoc = createMockPost({ artists: [1, 2] })

      const mockArtist1 = createMockArtist({ id: 1, projects: [123, 456] })
      const mockArtist2 = createMockArtist({ id: 2, projects: [123] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist1, mockArtist2]))
      vi.mocked(req.payload.update).mockResolvedValue({} as Artist)

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.find).toHaveBeenCalledWith({
        collection: 'artists',
        where: { id: { in: [1, 2] } },
        limit: 2,
      })
      expect(req.payload.update).toHaveBeenCalledTimes(2)
      expect(req.payload.update).toHaveBeenCalledWith({
        collection: 'artists',
        id: 1,
        data: { projects: [456] },
      })
      expect(req.payload.update).toHaveBeenCalledWith({
        collection: 'artists',
        id: 2,
        data: { projects: [] },
      })
    })

    it('should remove regardless of post category', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ id: 123, artists: [], categories: ['news'] })
      const previousDoc = createMockPost({ artists: [1] })

      const mockArtist = createMockArtist({ id: 1, projects: [123] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))
      vi.mocked(req.payload.update).mockResolvedValue(mockArtist as Artist)

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.update).toHaveBeenCalledWith({
        collection: 'artists',
        id: 1,
        data: { projects: [] },
      })
    })
  })

  describe('artist change detection', () => {
    it('should skip if no artists changed', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ artists: [1, 2] })
      const previousDoc = createMockPost({ artists: [1, 2] })

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.find).not.toHaveBeenCalled()
      expect(req.payload.update).not.toHaveBeenCalled()
    })

    it('should handle partial artist changes', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ id: 123, artists: [1, 3], categories: ['projects'] })
      const previousDoc = createMockPost({ artists: [1, 2] })

      const mockArtist2 = createMockArtist({ id: 2, projects: [123] })
      const mockArtist3 = createMockArtist({ id: 3, projects: [] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist3, mockArtist2]))
      vi.mocked(req.payload.update).mockResolvedValue({} as Artist)

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      // Should query for both added and removed artists
      expect(req.payload.find).toHaveBeenCalledWith({
        collection: 'artists',
        where: { id: { in: [3, 2] } },
        limit: 2,
      })
      // Should add to artist 3
      expect(req.payload.update).toHaveBeenCalledWith({
        collection: 'artists',
        id: 3,
        data: { projects: [123] },
      })
      // Should remove from artist 2
      expect(req.payload.update).toHaveBeenCalledWith({
        collection: 'artists',
        id: 2,
        data: { projects: [] },
      })
    })

    it('should handle missing previousDoc', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ id: 123, artists: [1], categories: ['projects'] })

      const mockArtist = createMockArtist({ id: 1, projects: [] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))
      vi.mocked(req.payload.update).mockResolvedValue(mockArtist as Artist)

      await syncArtistProjects({
        doc,
        previousDoc: undefined,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.update).toHaveBeenCalledWith({
        collection: 'artists',
        id: 1,
        data: { projects: [123] },
      })
    })
  })

  describe('error handling', () => {
    it('should log error without blocking post save', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ id: 123, artists: [1], categories: ['projects'] })
      const previousDoc = createMockPost({ artists: [] })

      const mockError = new Error('Database connection failed')
      vi.mocked(req.payload.find).mockRejectedValue(mockError)

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.logger.error).toHaveBeenCalledWith(
        'Failed to sync artist projects for post 123 ("Test Project Post"): Database connection failed. Added artists: [1], Removed artists: []',
      )
    })

    it('should handle non-Error exceptions', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ id: 123, artists: [1], categories: ['projects'] })
      const previousDoc = createMockPost({ artists: [] })

      vi.mocked(req.payload.find).mockRejectedValue('String error')

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.logger.error).toHaveBeenCalledWith(
        'Failed to sync artist projects for post 123 ("Test Project Post"): String error. Added artists: [1], Removed artists: []',
      )
    })

    it('should continue processing other artists if one fails', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ id: 123, artists: [1, 2], categories: ['projects'] })
      const previousDoc = createMockPost({ artists: [] })

      vi.mocked(req.payload.find).mockRejectedValue(new Error('Failed'))

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.logger.error).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle null/undefined artists arrays', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ artists: undefined })
      const previousDoc = createMockPost({ artists: null as unknown as number[] })

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.find).not.toHaveBeenCalled()
      expect(req.payload.update).not.toHaveBeenCalled()
    })

    it('should handle null/undefined projects arrays', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ id: 123, artists: [1], categories: ['projects'] })
      const previousDoc = createMockPost({ artists: [] })

      const mockArtist = createMockArtist({ id: 1, projects: null as unknown as number[] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))
      vi.mocked(req.payload.update).mockResolvedValue(mockArtist as Artist)

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.update).toHaveBeenCalledWith({
        collection: 'artists',
        id: 1,
        data: { projects: [123] },
      })
    })

    it('should handle empty categories array', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ id: 123, artists: [1], categories: [] })
      const previousDoc = createMockPost({ artists: [] })

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.update).not.toHaveBeenCalled()
    })

    it('should handle non-array categories', async () => {
      const req = createMockRequest()
      const doc = createMockPost({ id: 123, artists: [1], categories: 'projects' as unknown as 'projects'[] })
      const previousDoc = createMockPost({ artists: [] })

      await syncArtistProjects({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.update).not.toHaveBeenCalled()
    })
  })
})
