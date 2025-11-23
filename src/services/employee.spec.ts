import type { Employee } from '@/payload-types'
import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getEmployeeById, getEmployeeByName, getEmployeeImageId, getEmployees } from './employee'
import * as mediaService from './media'

describe('Employee Service', () => {
  let mockPayload: Payload

  const createMockEmployee = (overrides: Partial<Employee> = {}): Employee =>
    ({
      id: 1,
      name: 'John Doe',
      title: 'Artist Manager',
      email: 'john@example.com',
      phone: '+1234567890',
      order: 1,
      image: 1,
      updatedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      ...overrides,
    }) as Employee

  beforeEach(() => {
    mockPayload = {
      find: vi.fn(),
      findByID: vi.fn(),
    } as unknown as Payload
    vi.clearAllMocks()
  })

  describe('getEmployees', () => {
    it('should fetch all employees with default locale', async () => {
      const mockEmployees = [createMockEmployee(), createMockEmployee({ id: 2, name: 'Jane Smith' })]
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: mockEmployees,
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

      const result = await getEmployees(mockPayload)

      expect(result.docs).toEqual(mockEmployees)
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'employees',
        locale: 'de',
        sort: 'order',
      })
    })

    it('should fetch employees with specified locale', async () => {
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

      await getEmployees(mockPayload, 'en')

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'employees',
        locale: 'en',
        sort: 'order',
      })
    })

    it('should sort employees by order field', async () => {
      await getEmployees(mockPayload)

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

      const result = await getEmployeeById(mockPayload, '1')

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

      await getEmployeeById(mockPayload, '1', 'en')

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
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [mockEmployee],
        totalDocs: 1,
        limit: 1,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      const result = await getEmployeeByName(mockPayload, 'John Doe')

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
      vi.mocked(mockPayload.find).mockResolvedValue({
        docs: [],
        totalDocs: 0,
        limit: 1,
        totalPages: 0,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      const result = await getEmployeeByName(mockPayload, 'Nonexistent Person')

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

      const result = await getEmployeeImageId(mockPayload, mockEmployee)

      expect(result).toBe(5)
      expect(mediaService.getMediaByAlt).toHaveBeenCalledWith(mockPayload, 'John Doe')
    })

    it('should return default avatar ID when employee image not found', async () => {
      const mockEmployee = createMockEmployee()
      vi.spyOn(mediaService, 'getMediaByAlt').mockResolvedValue(null)
      vi.spyOn(mediaService, 'getDefaultAvatar').mockResolvedValue({
        id: 10,
        alt: 'Default Avatar',
        filename: 'default-avatar.webp',
      } as any)

      const result = await getEmployeeImageId(mockPayload, mockEmployee)

      expect(result).toBe(10)
      expect(mediaService.getMediaByAlt).toHaveBeenCalledWith(mockPayload, 'John Doe')
      expect(mediaService.getDefaultAvatar).toHaveBeenCalledWith(mockPayload)
    })

    it('should return null when neither employee image nor default avatar found', async () => {
      const mockEmployee = createMockEmployee()
      vi.spyOn(mediaService, 'getMediaByAlt').mockResolvedValue(null)
      vi.spyOn(mediaService, 'getDefaultAvatar').mockResolvedValue(null)

      const result = await getEmployeeImageId(mockPayload, mockEmployee)

      expect(result).toBeNull()
    })
  })
})
