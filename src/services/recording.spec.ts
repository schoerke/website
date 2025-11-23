import type { Recording } from '@/payload-types'
import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAllRecordings, getRecordingById, getRecordingsByArtist } from './recording'

// Mock getPayload at the module level
vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return {
    ...actual,
    getPayload: vi.fn(),
  }
})

describe('Recording Service', () => {
  let mockPayload: Payload

  const createMockRecording = (overrides: Partial<Recording> = {}): Recording =>
    ({
      id: 1,
      title: 'Test Recording',
      _status: 'published',
      artists: [1] as any,
      updatedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      ...overrides,
    }) as Recording

  beforeEach(async () => {
    mockPayload = {
      find: vi.fn(),
      findByID: vi.fn(),
    } as unknown as Payload

    // Mock getPayload to return our mock payload instance
    const { getPayload } = await import('payload')
    vi.mocked(getPayload).mockResolvedValue(mockPayload)
  })

  describe('getAllRecordings', () => {
    it('should fetch all published recordings with default locale and depth 2', async () => {
      const mockRecordings = [createMockRecording(), createMockRecording({ id: 2, title: 'Another Recording' })]
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: mockRecordings,
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

      const result = await getAllRecordings()

      expect(result.docs).toEqual(mockRecordings)
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'recordings',
        where: {
          _status: { equals: 'published' },
        },
        locale: 'de',
        depth: 2,
      })
    })

    it('should only return published recordings', async () => {
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

      await getAllRecordings()

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { _status: { equals: 'published' } },
        }),
      )
    })

    it('should populate relationships with depth 2', async () => {
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

      await getAllRecordings()

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          depth: 2,
        }),
      )
    })

    it('should use specified locale', async () => {
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

      await getAllRecordings('en')

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: 'en',
        }),
      )
    })
  })

  describe('getRecordingsByArtist', () => {
    it('should fetch published recordings by artist ID', async () => {
      const mockRecording = createMockRecording({ artists: [1] as any })
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [mockRecording],
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

      const result = await getRecordingsByArtist('1')

      expect(result.docs).toEqual([mockRecording])
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'recordings',
        where: {
          artists: { equals: '1' },
          _status: { equals: 'published' },
        },
        locale: 'de',
        depth: 2,
      })
    })

    it('should filter by artist ID and only published status', async () => {
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

      await getRecordingsByArtist('5')

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'recordings',
        where: {
          artists: { equals: '5' },
          _status: { equals: 'published' },
        },
        locale: 'de',
        depth: 2,
      })
    })

    it('should populate artist relationships and cover art with depth 2', async () => {
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

      await getRecordingsByArtist('1')

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          depth: 2,
        }),
      )
    })
  })

  describe('getRecordingById', () => {
    it('should fetch recording by ID with depth 2', async () => {
      const mockRecording = createMockRecording()
      vi.mocked(mockPayload.findByID).mockResolvedValue(mockRecording)

      const result = await getRecordingById('1')

      expect(result).toEqual(mockRecording)
      expect(mockPayload.findByID).toHaveBeenCalledWith({
        collection: 'recordings',
        id: '1',
        locale: 'de',
        depth: 2,
      })
    })

    it('should use specified locale', async () => {
      const mockRecording = createMockRecording()
      vi.mocked(mockPayload.findByID).mockResolvedValue(mockRecording)

      await getRecordingById('1', 'en')

      expect(mockPayload.findByID).toHaveBeenCalledWith({
        collection: 'recordings',
        id: '1',
        locale: 'en',
        depth: 2,
      })
    })

    it('should populate related data with depth 2', async () => {
      const mockRecording = createMockRecording()
      vi.mocked(mockPayload.findByID).mockResolvedValue(mockRecording)

      await getRecordingById('1')

      expect(mockPayload.findByID).toHaveBeenCalledWith(
        expect.objectContaining({
          depth: 2,
        }),
      )
    })
  })
})
