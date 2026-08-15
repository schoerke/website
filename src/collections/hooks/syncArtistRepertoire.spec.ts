import type { Artist, Repertoire } from '@/payload-types'
import type { CollectionAfterChangeHook, PayloadRequest } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { syncArtistRepertoire, syncArtistRepertoireOnDelete } from './syncArtistRepertoire'

type HookArgs = Parameters<CollectionAfterChangeHook>[0]

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

describe('syncArtistRepertoire hook', () => {
  const createMockRequest = (overrides?: Partial<PayloadRequest>): PayloadRequest =>
    ({
      payload: {
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        find: vi.fn(),
        update: vi.fn(),
      },
      context: {},
      ...overrides,
    }) as unknown as PayloadRequest

  const createMockRepertoire = (overrides?: Partial<Repertoire>): Repertoire =>
    ({
      id: 123,
      title: 'Solo Repertoire',
      artists: [],
      content: { root: { type: 'root', children: [], direction: null, format: '', indent: 0, version: 1 } },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    }) as Repertoire

  const createMockArtist = (overrides?: Partial<Artist>): Artist =>
    ({
      id: 456,
      name: 'Test Artist',
      slug: 'test-artist',
      instrument: [],
      repertoire: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    }) as Artist

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
    it('should skip when context.syncingRepertoire is true', async () => {
      const req = createMockRequest({ context: { syncingRepertoire: true } })
      const doc = createMockRepertoire()

      await syncArtistRepertoire({
        doc,
        req,
        context: { syncingRepertoire: true },
      } as unknown as HookArgs)

      expect(req.payload.find).not.toHaveBeenCalled()
      expect(req.payload.update).not.toHaveBeenCalled()
    })

    it('should set context flag before making updates', async () => {
      const req = createMockRequest()
      const doc = createMockRepertoire({ artists: [1] })
      const previousDoc = createMockRepertoire({ artists: [] })

      const mockArtist = createMockArtist({ id: 1, repertoire: [] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))
      vi.mocked(req.payload.update).mockResolvedValue(mockArtist as Artist)

      await syncArtistRepertoire({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.context.syncingRepertoire).toBe(true)
    })
  })

  describe('adding artists', () => {
    it('should append repertoire to newly linked artist', async () => {
      const req = createMockRequest()
      const doc = createMockRepertoire({ id: 123, artists: [1] })
      const previousDoc = createMockRepertoire({ artists: [] })

      const mockArtist = createMockArtist({ id: 1, repertoire: [] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))
      vi.mocked(req.payload.update).mockResolvedValue(mockArtist as Artist)

      await syncArtistRepertoire({
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
        data: { repertoire: [123] },
      })
    })

    it('should not add duplicates if repertoire is already present', async () => {
      const req = createMockRequest()
      const doc = createMockRepertoire({ id: 123, artists: [1] })
      const previousDoc = createMockRepertoire({ artists: [] })

      const mockArtist = createMockArtist({ id: 1, repertoire: [123] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))

      await syncArtistRepertoire({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.update).not.toHaveBeenCalled()
    })

    it('should append to existing repertoire array preserving order', async () => {
      const req = createMockRequest()
      const doc = createMockRepertoire({ id: 123, artists: [1] })
      const previousDoc = createMockRepertoire({ artists: [] })

      const mockArtist = createMockArtist({ id: 1, repertoire: [999, 888] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))
      vi.mocked(req.payload.update).mockResolvedValue(mockArtist as Artist)

      await syncArtistRepertoire({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.update).toHaveBeenCalledWith({
        collection: 'artists',
        id: 1,
        data: { repertoire: [999, 888, 123] },
      })
    })

    it('should add to multiple newly linked artists', async () => {
      const req = createMockRequest()
      const doc = createMockRepertoire({ id: 123, artists: [1, 2] })
      const previousDoc = createMockRepertoire({ artists: [] })

      const mockArtist1 = createMockArtist({ id: 1, repertoire: [] })
      const mockArtist2 = createMockArtist({ id: 2, repertoire: [] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist1, mockArtist2]))
      vi.mocked(req.payload.update).mockResolvedValue({} as Artist)

      await syncArtistRepertoire({
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
      expect(req.payload.update).toHaveBeenCalledWith({ collection: 'artists', id: 1, data: { repertoire: [123] } })
      expect(req.payload.update).toHaveBeenCalledWith({ collection: 'artists', id: 2, data: { repertoire: [123] } })
    })
  })

  describe('removing artists', () => {
    it('should remove repertoire from unlinked artist', async () => {
      const req = createMockRequest()
      const doc = createMockRepertoire({ id: 123, artists: [] })
      const previousDoc = createMockRepertoire({ artists: [1] })

      const mockArtist = createMockArtist({ id: 1, repertoire: [123, 456] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))
      vi.mocked(req.payload.update).mockResolvedValue(mockArtist as Artist)

      await syncArtistRepertoire({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.update).toHaveBeenCalledWith({
        collection: 'artists',
        id: 1,
        data: { repertoire: [456] },
      })
    })

    it('should handle artist with no repertoire gracefully', async () => {
      const req = createMockRequest()
      const doc = createMockRepertoire({ id: 123, artists: [] })
      const previousDoc = createMockRepertoire({ artists: [1] })

      const mockArtist = createMockArtist({ id: 1, repertoire: [] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))

      await syncArtistRepertoire({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.update).not.toHaveBeenCalled()
    })

    it('should not update if repertoire is not in artist array', async () => {
      const req = createMockRequest()
      const doc = createMockRepertoire({ id: 123, artists: [] })
      const previousDoc = createMockRepertoire({ artists: [1] })

      const mockArtist = createMockArtist({ id: 1, repertoire: [999] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))

      await syncArtistRepertoire({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.update).not.toHaveBeenCalled()
    })
  })

  describe('change detection', () => {
    it('should skip if no artists changed', async () => {
      const req = createMockRequest()
      const doc = createMockRepertoire({ artists: [1, 2] })
      const previousDoc = createMockRepertoire({ artists: [1, 2] })

      await syncArtistRepertoire({
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
      const doc = createMockRepertoire({ id: 123, artists: [1, 3] })
      const previousDoc = createMockRepertoire({ artists: [1, 2] })

      const mockArtist2 = createMockArtist({ id: 2, repertoire: [123] })
      const mockArtist3 = createMockArtist({ id: 3, repertoire: [] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist3, mockArtist2]))
      vi.mocked(req.payload.update).mockResolvedValue({} as Artist)

      await syncArtistRepertoire({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.find).toHaveBeenCalledWith({
        collection: 'artists',
        where: { id: { in: [3, 2] } },
        limit: 2,
      })
      expect(req.payload.update).toHaveBeenCalledWith({ collection: 'artists', id: 3, data: { repertoire: [123] } })
      expect(req.payload.update).toHaveBeenCalledWith({ collection: 'artists', id: 2, data: { repertoire: [] } })
    })

    it('should handle missing previousDoc', async () => {
      const req = createMockRequest()
      const doc = createMockRepertoire({ id: 123, artists: [1] })

      const mockArtist = createMockArtist({ id: 1, repertoire: [] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))
      vi.mocked(req.payload.update).mockResolvedValue(mockArtist as Artist)

      await syncArtistRepertoire({
        doc,
        previousDoc: undefined,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.update).toHaveBeenCalledWith({
        collection: 'artists',
        id: 1,
        data: { repertoire: [123] },
      })
    })
  })

  describe('error handling', () => {
    it('should log error without blocking repertoire save', async () => {
      const req = createMockRequest()
      const doc = createMockRepertoire({ id: 123, artists: [1] })
      const previousDoc = createMockRepertoire({ artists: [] })

      vi.mocked(req.payload.find).mockRejectedValue(new Error('Database connection failed'))

      await syncArtistRepertoire({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.logger.error).toHaveBeenCalledWith(
        'Failed to sync artist repertoire for repertoire 123 ("Solo Repertoire"): Database connection failed. Added artists: [1], Removed artists: []'
      )
    })
  })

  describe('edge cases', () => {
    it('should handle null/undefined artists arrays', async () => {
      const req = createMockRequest()
      const doc = createMockRepertoire({ artists: undefined })
      const previousDoc = createMockRepertoire({ artists: null as unknown as number[] })

      await syncArtistRepertoire({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.find).not.toHaveBeenCalled()
      expect(req.payload.update).not.toHaveBeenCalled()
    })

    it('should handle null/undefined repertoire arrays', async () => {
      const req = createMockRequest()
      const doc = createMockRepertoire({ id: 123, artists: [1] })
      const previousDoc = createMockRepertoire({ artists: [] })

      const mockArtist = createMockArtist({ id: 1, repertoire: null as unknown as number[] })
      vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([mockArtist]))
      vi.mocked(req.payload.update).mockResolvedValue(mockArtist as Artist)

      await syncArtistRepertoire({
        doc,
        previousDoc,
        req,
        context: {},
      } as HookArgs)

      expect(req.payload.update).toHaveBeenCalledWith({
        collection: 'artists',
        id: 1,
        data: { repertoire: [123] },
      })
    })
  })
})

describe('syncArtistRepertoireOnDelete hook', () => {
  const createMockRequest = (overrides?: Partial<PayloadRequest>): PayloadRequest =>
    ({
      payload: {
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        find: vi.fn(),
        update: vi.fn(),
      },
      context: {},
      ...overrides,
    }) as unknown as PayloadRequest

  const createMockArtist = (overrides?: Partial<Artist>): Artist =>
    ({
      id: 456,
      name: 'Test Artist',
      slug: 'test-artist',
      instrument: [],
      repertoire: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    }) as Artist

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

  it('should remove deleted repertoire from all artists that reference it', async () => {
    const req = createMockRequest()
    const artist1 = createMockArtist({ id: 1, repertoire: [123, 456] })
    const artist2 = createMockArtist({ id: 2, repertoire: [123] })
    vi.mocked(req.payload.find).mockResolvedValue(createMockFindResult([artist1, artist2]))
    vi.mocked(req.payload.update).mockResolvedValue({} as Artist)

    await syncArtistRepertoireOnDelete({ doc: { id: 123 }, req, context: {} } as never)

    expect(req.payload.find).toHaveBeenCalledWith({
      collection: 'artists',
      where: { repertoire: { contains: 123 } },
      limit: 1000,
    })
    expect(req.payload.update).toHaveBeenCalledTimes(2)
    expect(req.payload.update).toHaveBeenCalledWith({ collection: 'artists', id: 1, data: { repertoire: [456] } })
    expect(req.payload.update).toHaveBeenCalledWith({ collection: 'artists', id: 2, data: { repertoire: [] } })
  })

  it('should skip when context.syncingRepertoire is true', async () => {
    const req = createMockRequest({ context: { syncingRepertoire: true } })

    await syncArtistRepertoireOnDelete({ doc: { id: 123 }, req, context: { syncingRepertoire: true } } as never)

    expect(req.payload.find).not.toHaveBeenCalled()
    expect(req.payload.update).not.toHaveBeenCalled()
  })

  it('should log error without blocking repertoire delete', async () => {
    const req = createMockRequest()
    vi.mocked(req.payload.find).mockRejectedValue(new Error('Database connection failed'))

    await syncArtistRepertoireOnDelete({ doc: { id: 123 }, req, context: {} } as never)

    expect(req.payload.logger.error).toHaveBeenCalledWith(
      'Failed to remove repertoire 123 from artists: Database connection failed'
    )
  })
})
