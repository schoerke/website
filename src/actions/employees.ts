'use server'

import type { Employee } from '@/payload-types'
import config from '@/payload.config'
import { getEmployees } from '@/services/employee'
import { getPayload } from 'payload'

/**
 * Server action to fetch all employees.
 * Uses Payload Local API for better performance than REST API calls.
 *
 * @param options - Fetch options
 * @param options.locale - Locale code ('de' or 'en', default: 'de')
 * @param options.limit - Maximum number of employees to return (default: 100)
 * @returns Promise resolving to employee list with email addresses
 *
 * @example
 * // In a client component:
 * const result = await fetchEmployees({ locale: 'en', limit: 100 })
 * const employees = result.docs
 */
export async function fetchEmployees(options?: { locale?: 'de' | 'en'; limit?: number }) {
  const result = await getEmployees(options?.locale || 'de')

  // Apply limit if specified (service uses limit: 0 = no limit)
  const limit = options?.limit || 100
  const limitedDocs = result.docs.slice(0, limit)

  return {
    ...result,
    docs: limitedDocs,
  }
}

/**
 * Server action to fetch multiple employees by their IDs.
 * Uses Payload Local API for better performance than REST API calls.
 *
 * @param ids - Array of employee IDs to fetch
 * @param options - Optional configuration (locale, depth)
 * @returns Promise resolving to array of employees with populated image relationships
 *
 * @example
 * ```tsx
 * // In a client component
 * const employees = await fetchEmployeesByIds(['123', '456'], { locale: 'en' })
 * console.log(employees) // Array of Employee objects with images populated
 * ```
 */
export async function fetchEmployeesByIds(
  ids: string[],
  options?: {
    locale?: 'de' | 'en'
    depth?: number
  },
): Promise<Employee[]> {
  if (!ids || ids.length === 0) return []

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'employees',
    where: {
      id: {
        in: ids,
      },
    },
    locale: options?.locale || 'de',
    depth: options?.depth ?? 1, // Populate first level of relationships (images)
    limit: ids.length,
  })

  return result.docs
}
