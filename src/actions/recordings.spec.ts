import { createMockPaginatedDocs, createMockRecording } from '@/tests/utils/payloadMocks'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchRecordingsByArtist } from './recordings'

// Mock the recording service
vi.mock('@/services/recording', () => ({
  getRecordingsByArtist: vi.fn(),
}))

describe('fetchRecordingsByArtist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call getRecordingsByArtist with artist ID and default locale', async () => {
    const mockRecordings = [createMockRecording()]
    const { getRecordingsByArtist } = await import('@/services/recording')
    vi.mocked(getRecordingsByArtist).mockResolvedValue(createMockPaginatedDocs(mockRecordings))

    const result = await fetchRecordingsByArtist('artist-123')

    expect(getRecordingsByArtist).toHaveBeenCalledWith('artist-123', 'de')
    expect(result.docs).toEqual(mockRecordings)
  })

  it('should call getRecordingsByArtist with specified locale', async () => {
    const mockRecordings = [createMockRecording()]
    const { getRecordingsByArtist } = await import('@/services/recording')
    vi.mocked(getRecordingsByArtist).mockResolvedValue(createMockPaginatedDocs(mockRecordings))

    const result = await fetchRecordingsByArtist('artist-456', 'en')

    expect(getRecordingsByArtist).toHaveBeenCalledWith('artist-456', 'en')
    expect(result.docs).toEqual(mockRecordings)
  })

  it('should return empty docs array when no recordings found', async () => {
    const { getRecordingsByArtist } = await import('@/services/recording')
    vi.mocked(getRecordingsByArtist).mockResolvedValue(createMockPaginatedDocs([]))

    const result = await fetchRecordingsByArtist('artist-789')

    expect(result.docs).toEqual([])
    expect(getRecordingsByArtist).toHaveBeenCalledWith('artist-789', 'de')
  })

  it('should return multiple recordings for the same artist', async () => {
    const mockRecordings = [
      createMockRecording({ id: 1, title: 'Recording 1' }),
      createMockRecording({ id: 2, title: 'Recording 2' }),
      createMockRecording({ id: 3, title: 'Recording 3' }),
    ]
    const { getRecordingsByArtist } = await import('@/services/recording')
    vi.mocked(getRecordingsByArtist).mockResolvedValue(createMockPaginatedDocs(mockRecordings))

    const result = await fetchRecordingsByArtist('artist-123')

    expect(result.docs).toHaveLength(3)
    expect(result.docs).toEqual(mockRecordings)
  })

  it('should pass through service errors', async () => {
    const { getRecordingsByArtist } = await import('@/services/recording')
    const mockError = new Error('Database connection failed')
    vi.mocked(getRecordingsByArtist).mockRejectedValue(mockError)

    await expect(fetchRecordingsByArtist('artist-123')).rejects.toThrow('Database connection failed')
  })
})
