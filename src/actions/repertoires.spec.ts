import { createMockPaginatedDocs, createMockRepertoire } from '@/services/__test-utils__/payloadMocks'
import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchRepertoiresByArtist } from './repertoires'

// Mock getPayload at the module level
vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return {
    ...actual,
    getPayload: vi.fn(),
  }
})

describe('fetchRepertoiresByArtist', () => {
  let mockPayload: Payload

  beforeEach(async () => {
    mockPayload = {
      find: vi.fn(),
    } as unknown as Payload

    // Mock getPayload to return our mock payload instance
    const { getPayload } = await import('payload')
    vi.mocked(getPayload).mockResolvedValue(mockPayload)
  })

  it('should fetch repertoires for artist with default locale', async () => {
    const mockRepertoires = [
      createMockRepertoire({ id: 1, title: 'Beethoven Symphony No. 9' }),
      createMockRepertoire({ id: 2, title: 'Mozart Requiem' }),
    ]
    vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs(mockRepertoires))

    const result = await fetchRepertoiresByArtist('artist-123')

    expect(result.docs).toEqual(mockRepertoires)
    expect(mockPayload.find).toHaveBeenCalledWith({
      collection: 'repertoire',
      where: {
        artists: { equals: 'artist-123' },
      },
      locale: 'de',
      limit: 1000,
    })
  })

  it('should fetch repertoires with specified locale', async () => {
    const mockRepertoires = [createMockRepertoire({ id: 1, title: 'Bach Cello Suites' })]
    vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs(mockRepertoires))

    const result = await fetchRepertoiresByArtist('artist-456', 'en')

    expect(result.docs).toEqual(mockRepertoires)
    expect(mockPayload.find).toHaveBeenCalledWith({
      collection: 'repertoire',
      where: {
        artists: { equals: 'artist-456' },
      },
      locale: 'en',
      limit: 1000,
    })
  })

  it('should return empty docs array when no repertoires found', async () => {
    vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

    const result = await fetchRepertoiresByArtist('artist-789')

    expect(result.docs).toEqual([])
    expect(mockPayload.find).toHaveBeenCalledWith({
      collection: 'repertoire',
      where: {
        artists: { equals: 'artist-789' },
      },
      locale: 'de',
      limit: 1000,
    })
  })

  it('should filter by artist ID in where clause', async () => {
    vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

    await fetchRepertoiresByArtist('specific-artist-id')

    expect(mockPayload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          artists: { equals: 'specific-artist-id' },
        },
      }),
    )
  })

  it('should use limit of 1000', async () => {
    vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

    await fetchRepertoiresByArtist('artist-123')

    expect(mockPayload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 1000,
      }),
    )
  })

  it('should pass through service errors', async () => {
    const mockError = new Error('Database connection failed')
    vi.mocked(mockPayload.find).mockRejectedValue(mockError)

    await expect(fetchRepertoiresByArtist('artist-123')).rejects.toThrow('Database connection failed')
  })

  it('should return multiple repertoires for the same artist', async () => {
    const mockRepertoires = [
      createMockRepertoire({ id: 1, title: 'Repertoire 1' }),
      createMockRepertoire({ id: 2, title: 'Repertoire 2' }),
      createMockRepertoire({ id: 3, title: 'Repertoire 3' }),
      createMockRepertoire({ id: 4, title: 'Repertoire 4' }),
    ]
    vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs(mockRepertoires))

    const result = await fetchRepertoiresByArtist('artist-123')

    expect(result.docs).toHaveLength(4)
    expect(result.docs).toEqual(mockRepertoires)
  })
})
