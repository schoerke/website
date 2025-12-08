'use server'

import { getEmployees } from '@/services/employee'

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
