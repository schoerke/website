import { createMockPaginatedDocs, createMockRecording } from '@/tests/utils/payloadMocks'
import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAllRecordings,
  getRecordingById,
  getRecordingCountByArtist,
  getRecordingVersionByArtist,
  getRecordingsByArtist,
} from './recording'

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
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs(mockRecordings))

      const result = await getAllRecordings()

      expect(result.docs).toEqual(mockRecordings)
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'recordings',
        where: {
          _status: { equals: 'published' },
        },
        locale: 'de',
        depth: 2,
        limit: 0,
      })
    })

    it('should only return published recordings', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getAllRecordings()

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { _status: { equals: 'published' } },
        })
      )
    })

    it('should populate relationships with depth 2', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getAllRecordings()

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          depth: 2,
        })
      )
    })

    it('should use specified locale', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getAllRecordings('en')

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: 'en',
        })
      )
    })
  })

  describe('getRecordingsByArtist', () => {
    const RECORDING_SELECT = {
      title: true,
      description: true,
      recordingYear: true,
      recordingLabel: true,
      catalogNumber: true,
      coverArt: true,
      spotifyURL: true,
      appleMusicURL: true,
      roles: true,
      createdAt: true,
    }

    it('should fetch published recordings by artist ID with slim select (no artists)', async () => {
      const mockRecording = createMockRecording({ artists: [1] as never })
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([mockRecording]))

      const result = await getRecordingsByArtist('1')

      expect(result.docs).toEqual([mockRecording])
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'recordings',
        where: {
          artists: { contains: '1' },
          _status: { equals: 'published' },
        },
        locale: 'de',
        depth: 1,
        limit: 0,
        select: RECORDING_SELECT,
      })
    })

    it('should filter by artist ID and only published status', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getRecordingsByArtist('5')

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'recordings',
        where: {
          artists: { contains: '5' },
          _status: { equals: 'published' },
        },
        locale: 'de',
        depth: 1,
        limit: 0,
        select: RECORDING_SELECT,
      })
    })

    it('should slim relationships with depth 1 and select, excluding the artists field', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getRecordingsByArtist('1')

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          depth: 1,
          select: RECORDING_SELECT,
        })
      )
      expect(vi.mocked(mockPayload.find).mock.calls[0][0]).not.toHaveProperty('populate')
    })
  })

  describe('getRecordingCountByArtist', () => {
    it('should return the count of published recordings for an artist', async () => {
      mockPayload.count = vi.fn().mockResolvedValue({ totalDocs: 5 })

      const result = await getRecordingCountByArtist(42, 'en')

      expect(result).toBe(5)
      expect(mockPayload.count).toHaveBeenCalledWith({
        collection: 'recordings',
        where: {
          artists: { contains: '42' },
          _status: { equals: 'published' },
        },
        locale: 'en',
      })
    })

    it('should return 0 when no published recordings exist for the artist', async () => {
      mockPayload.count = vi.fn().mockResolvedValue({ totalDocs: 0 })

      const result = await getRecordingCountByArtist(99, 'de')

      expect(result).toBe(0)
    })

    it('should use default locale de when not specified', async () => {
      mockPayload.count = vi.fn().mockResolvedValue({ totalDocs: 3 })

      await getRecordingCountByArtist(1)

      expect(mockPayload.count).toHaveBeenCalledWith(expect.objectContaining({ locale: 'de' }))
    })
  })

  describe('getRecordingVersionByArtist', () => {
    it('returns the newest published recording update for the artist', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(
        createMockPaginatedDocs([createMockRecording({ updatedAt: '2026-09-04T12:00:00.000Z' })])
      )

      const result = await getRecordingVersionByArtist(42, 'en')

      expect(result).toBe('2026-09-04T12:00:00.000Z')
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'recordings',
        where: {
          artists: { contains: '42' },
          _status: { equals: 'published' },
        },
        locale: 'en',
        sort: '-updatedAt',
        limit: 1,
        select: { updatedAt: true },
      })
    })

    it('returns null when the artist has no published recordings', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await expect(getRecordingVersionByArtist(42)).resolves.toBeNull()
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
        })
      )
    })
  })
})
