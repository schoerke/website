import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockEmployee, createMockPaginatedDocs } from './__test-utils__/payloadMocks'
import { getEmployeeById, getEmployeeByName, getEmployeeImageId, getEmployees } from './employee'
import * as mediaService from './media'

// Mock getPayload at the module level
vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return {
    ...actual,
    getPayload: vi.fn(),
  }
})

describe('Employee Service', () => {
  let mockPayload: Payload

  beforeEach(async () => {
    mockPayload = {
      find: vi.fn(),
      findByID: vi.fn(),
    } as unknown as Payload

    // Mock getPayload to return our mock payload instance
    const { getPayload } = await import('payload')
    vi.mocked(getPayload).mockResolvedValue(mockPayload)

    vi.clearAllMocks()
  })

  describe('getEmployees', () => {
    it('should fetch all employees with default locale', async () => {
      const mockEmployees = [createMockEmployee(), createMockEmployee({ id: 2, name: 'Jane Smith' })]
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs(mockEmployees))

      const result = await getEmployees()

      expect(result.docs).toEqual(mockEmployees)
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'employees',
        locale: 'de',
        sort: 'order',
      })
    })

    it('should fetch employees with specified locale', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getEmployees('en')

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'employees',
        locale: 'en',
        sort: 'order',
      })
    })

    it('should sort employees by order field', async () => {
      await getEmployees()

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: 'order',
        }),
      )
    })
  })

  describe('getEmployeeById', () => {
    it('should fetch employee by ID with default locale', async () => {
      const mockEmployee = createMockEmployee()
      vi.mocked(mockPayload.findByID).mockResolvedValue(mockEmployee)

      const result = await getEmployeeById('1')

      expect(result).toEqual(mockEmployee)
      expect(mockPayload.findByID).toHaveBeenCalledWith({
        collection: 'artists', // Note: This is intentionally 'artists' in the implementation
        id: '1',
        locale: 'de',
      })
    })

    it('should fetch employee by ID with specified locale', async () => {
      const mockEmployee = createMockEmployee()
      vi.mocked(mockPayload.findByID).mockResolvedValue(mockEmployee)

      await getEmployeeById('1', 'en')

      expect(mockPayload.findByID).toHaveBeenCalledWith({
        collection: 'artists',
        id: '1',
        locale: 'en',
      })
    })
  })

  describe('getEmployeeByName', () => {
    it('should fetch employee by name with default locale', async () => {
      const mockEmployee = createMockEmployee()
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([mockEmployee]))

      const result = await getEmployeeByName('John Doe')

      expect(result.docs[0]).toEqual(mockEmployee)
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'employees',
        where: {
          name: { equals: 'John Doe' },
        },
        limit: 1,
        locale: 'de',
      })
    })

    it('should return empty result when employee not found', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      const result = await getEmployeeByName('Nonexistent Person')

      expect(result.docs).toHaveLength(0)
    })
  })

  describe('getEmployeeImageId', () => {
    it('should return employee image ID when found by alt text', async () => {
      const mockEmployee = createMockEmployee()
      vi.spyOn(mediaService, 'getMediaByAlt').mockResolvedValue({
        id: 5,
        alt: 'John Doe',
        filename: 'john-doe.jpg',
      } as any)

      const result = await getEmployeeImageId(mockEmployee)

      expect(result).toBe(5)
      expect(mediaService.getMediaByAlt).toHaveBeenCalledWith('John Doe')
    })

    it('should return default avatar ID when employee image not found', async () => {
      const mockEmployee = createMockEmployee()
      vi.spyOn(mediaService, 'getMediaByAlt').mockResolvedValue(null)
      vi.spyOn(mediaService, 'getDefaultAvatar').mockResolvedValue({
        id: 10,
        alt: 'Default Avatar',
        filename: 'default-avatar.webp',
      } as any)

      const result = await getEmployeeImageId(mockEmployee)

      expect(result).toBe(10)
      expect(mediaService.getMediaByAlt).toHaveBeenCalledWith('John Doe')
      expect(mediaService.getDefaultAvatar).toHaveBeenCalledWith()
    })

    it('should return null when neither employee image nor default avatar found', async () => {
      const mockEmployee = createMockEmployee()
      vi.spyOn(mediaService, 'getMediaByAlt').mockResolvedValue(null)
      vi.spyOn(mediaService, 'getDefaultAvatar').mockResolvedValue(null)

      const result = await getEmployeeImageId(mockEmployee)

      expect(result).toBeNull()
    })
  })
})
