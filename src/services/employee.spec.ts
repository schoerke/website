import { createMockEmployee, createMockPaginatedDocs } from '@/tests/utils/payloadMocks'
import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getEmployeeById, getEmployeeByName, getEmployees } from './employee'

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
        limit: 0,
      })
    })

    it('should fetch employees with specified locale', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getEmployees('en')

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'employees',
        locale: 'en',
        sort: 'order',
        limit: 0,
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
        collection: 'employees',
        id: '1',
        locale: 'de',
      })
    })

    it('should fetch employee by ID with specified locale', async () => {
      const mockEmployee = createMockEmployee()
      vi.mocked(mockPayload.findByID).mockResolvedValue(mockEmployee)

      await getEmployeeById('1', 'en')

      expect(mockPayload.findByID).toHaveBeenCalledWith({
        collection: 'employees',
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
})
