import { createMockEmployee, createMockPaginatedDocs } from '@/tests/utils/payloadMocks'
import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchEmployees, fetchEmployeesByIds } from './employees'

// Mock getPayload and services
vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return {
    ...actual,
    getPayload: vi.fn(),
  }
})

vi.mock('@/services/employee', () => ({
  getEmployees: vi.fn(),
}))

describe('Employee Actions', () => {
  let mockPayload: Payload

  beforeEach(async () => {
    vi.clearAllMocks()

    mockPayload = {
      find: vi.fn(),
    } as unknown as Payload

    const { getPayload } = await import('payload')
    vi.mocked(getPayload).mockResolvedValue(mockPayload)
  })

  describe('fetchEmployees', () => {
    it('should call getEmployees with default locale', async () => {
      const mockEmployees = [createMockEmployee(), createMockEmployee({ id: 2, name: 'Jane Smith' })]
      const { getEmployees } = await import('@/services/employee')
      vi.mocked(getEmployees).mockResolvedValue(createMockPaginatedDocs(mockEmployees))

      const result = await fetchEmployees()

      expect(getEmployees).toHaveBeenCalledWith('de')
      expect(result.docs).toEqual(mockEmployees)
    })

    it('should call getEmployees with specified locale', async () => {
      const mockEmployees = [createMockEmployee()]
      const { getEmployees } = await import('@/services/employee')
      vi.mocked(getEmployees).mockResolvedValue(createMockPaginatedDocs(mockEmployees))

      await fetchEmployees({ locale: 'en' })

      expect(getEmployees).toHaveBeenCalledWith('en')
    })

    it('should apply limit to results', async () => {
      const mockEmployees = [
        createMockEmployee({ id: 1 }),
        createMockEmployee({ id: 2 }),
        createMockEmployee({ id: 3 }),
        createMockEmployee({ id: 4 }),
        createMockEmployee({ id: 5 }),
      ]
      const { getEmployees } = await import('@/services/employee')
      vi.mocked(getEmployees).mockResolvedValue(createMockPaginatedDocs(mockEmployees))

      const result = await fetchEmployees({ limit: 3 })

      expect(result.docs).toHaveLength(3)
      expect(result.docs[0].id).toBe(1)
      expect(result.docs[2].id).toBe(3)
    })

    it('should use default limit of 100', async () => {
      const mockEmployees = Array.from({ length: 150 }, (_, i) =>
        createMockEmployee({ id: i + 1, name: `Employee ${i + 1}` }),
      )
      const { getEmployees } = await import('@/services/employee')
      vi.mocked(getEmployees).mockResolvedValue(createMockPaginatedDocs(mockEmployees))

      const result = await fetchEmployees()

      expect(result.docs).toHaveLength(100)
    })

    it('should return all employees when count is less than limit', async () => {
      const mockEmployees = [createMockEmployee(), createMockEmployee({ id: 2 })]
      const { getEmployees } = await import('@/services/employee')
      vi.mocked(getEmployees).mockResolvedValue(createMockPaginatedDocs(mockEmployees))

      const result = await fetchEmployees({ limit: 10 })

      expect(result.docs).toHaveLength(2)
      expect(result.docs).toEqual(mockEmployees)
    })

    it('should preserve pagination metadata while limiting docs', async () => {
      const mockEmployees = Array.from({ length: 10 }, (_, i) => createMockEmployee({ id: i + 1 }))
      const { getEmployees } = await import('@/services/employee')
      vi.mocked(getEmployees).mockResolvedValue(
        createMockPaginatedDocs(mockEmployees, {
          totalDocs: 10,
          totalPages: 1,
        }),
      )

      const result = await fetchEmployees({ limit: 5 })

      expect(result.docs).toHaveLength(5)
      expect(result.totalDocs).toBe(10) // Original count preserved
      expect(result.totalPages).toBe(1)
    })
  })

  describe('fetchEmployeesByIds', () => {
    it('should fetch employees by IDs with default options', async () => {
      const mockEmployees = [
        createMockEmployee({ id: 1, name: 'John Doe' }),
        createMockEmployee({ id: 2, name: 'Jane Smith' }),
      ]
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs(mockEmployees))

      const result = await fetchEmployeesByIds(['1', '2'])

      expect(result).toEqual(mockEmployees)
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'employees',
        where: {
          id: { in: ['1', '2'] },
        },
        locale: 'de',
        depth: 1,
        limit: 2,
      })
    })

    it('should fetch employees with specified locale', async () => {
      const mockEmployees = [createMockEmployee()]
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs(mockEmployees))

      await fetchEmployeesByIds(['1'], { locale: 'en' })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: 'en',
        }),
      )
    })

    it('should return empty array for empty IDs', async () => {
      const result = await fetchEmployeesByIds([])

      expect(result).toEqual([])
      expect(mockPayload.find).not.toHaveBeenCalled()
    })

    it('should use custom depth when specified', async () => {
      const mockEmployees = [createMockEmployee()]
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs(mockEmployees))

      await fetchEmployeesByIds(['1'], { depth: 2 })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          depth: 2,
        }),
      )
    })

    it('should use depth 1 by default to populate images', async () => {
      const mockEmployees = [createMockEmployee()]
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs(mockEmployees))

      await fetchEmployeesByIds(['1'])

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          depth: 1,
        }),
      )
    })

    it('should set limit to match number of IDs', async () => {
      const mockEmployees = [
        createMockEmployee({ id: 1 }),
        createMockEmployee({ id: 2 }),
        createMockEmployee({ id: 3 }),
      ]
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs(mockEmployees))

      await fetchEmployeesByIds(['1', '2', '3'])

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 3,
        }),
      )
    })

    it('should pass through service errors', async () => {
      const mockError = new Error('Database connection failed')
      vi.mocked(mockPayload.find).mockRejectedValue(mockError)

      await expect(fetchEmployeesByIds(['1', '2'])).rejects.toThrow('Database connection failed')
    })

    it('should return empty array when IDs array is null', async () => {
      const result = await fetchEmployeesByIds(null as unknown as string[])

      expect(result).toEqual([])
      expect(mockPayload.find).not.toHaveBeenCalled()
    })
  })
})
