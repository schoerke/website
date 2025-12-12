import { createMockImage, createMockPaginatedDocs } from '@/tests/utils/payloadMocks'
import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchDefaultAvatar } from './media'

// Mock getPayload at the module level
vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return {
    ...actual,
    getPayload: vi.fn(),
  }
})

describe('fetchDefaultAvatar', () => {
  let mockPayload: Payload

  beforeEach(async () => {
    vi.clearAllMocks()

    mockPayload = {
      find: vi.fn(),
    } as unknown as Payload

    const { getPayload } = await import('payload')
    vi.mocked(getPayload).mockResolvedValue(mockPayload)
  })

  it('should fetch default avatar by filename', async () => {
    const mockAvatar = createMockImage({ filename: 'default-avatar.webp', alt: 'Default Avatar' })
    vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([mockAvatar]))

    const result = await fetchDefaultAvatar()

    expect(result).toEqual(mockAvatar)
    expect(mockPayload.find).toHaveBeenCalledWith({
      collection: 'images',
      where: {
        filename: { equals: 'default-avatar.webp' },
      },
      limit: 1,
    })
  })

  it('should return null when default avatar not found', async () => {
    vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

    const result = await fetchDefaultAvatar()

    expect(result).toBeNull()
  })

  it('should query images collection', async () => {
    vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

    await fetchDefaultAvatar()

    expect(mockPayload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'images',
      }),
    )
  })

  it('should use limit of 1', async () => {
    vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

    await fetchDefaultAvatar()

    expect(mockPayload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 1,
      }),
    )
  })

  it('should return first doc when multiple matches found', async () => {
    const mockAvatars = [
      createMockImage({ id: 1, filename: 'default-avatar.webp' }),
      createMockImage({ id: 2, filename: 'default-avatar.webp' }),
    ]
    vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs(mockAvatars))

    const result = await fetchDefaultAvatar()

    expect(result).toEqual(mockAvatars[0])
    expect(result?.id).toBe(1)
  })

  it('should pass through service errors', async () => {
    const mockError = new Error('Database connection failed')
    vi.mocked(mockPayload.find).mockRejectedValue(mockError)

    await expect(fetchDefaultAvatar()).rejects.toThrow('Database connection failed')
  })

  it('should query by exact filename match', async () => {
    vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

    await fetchDefaultAvatar()

    expect(mockPayload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          filename: { equals: 'default-avatar.webp' },
        },
      }),
    )
  })
})
