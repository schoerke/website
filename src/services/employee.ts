import config from '@/payload.config'
import { getPayload } from 'payload'
import type { Employee } from '../payload-types'
import { getDefaultAvatar, getMediaByAlt } from './media'

type LocaleCode = 'de' | 'en' | 'all'

/**
 * Retrieves all employees from the database, sorted by their order field.
 *
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @returns A promise resolving to all employees sorted by the 'order' field
 *
 * @example
 * const employees = await getEmployees('en')
 * console.log(employees.docs) // Array of employee documents in display order
 */
export const getEmployees = async (locale?: LocaleCode) => {
  const payload = await getPayload({ config })
  return await payload.find({
    collection: 'employees',
    locale: locale || 'de',
    sort: 'order',
  })
}

/**
 * Retrieves a single employee by their unique ID.
 *
 * @param id - The employee's unique identifier
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @returns A promise resolving to the employee document, or throws if not found
 *
 * @example
 * const employee = await getEmployeeById('123', 'en')
 * console.log(employee.name) // "Jane Smith"
 */
export const getEmployeeById = async (id: string, locale?: LocaleCode) => {
  const payload = await getPayload({ config })
  return await payload.findByID({
    collection: 'artists',
    id: id,
    locale: locale || 'de',
  })
}

/**
 * Retrieves a single employee by their exact name.
 *
 * @param name - The employee's full name (exact match)
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de'
 * @returns A promise resolving to a result object with docs array (max 1 item)
 *
 * @example
 * const result = await getEmployeeByName('Jane Smith', 'en')
 * const employee = result.docs[0] // First matching employee or undefined
 */
export const getEmployeeByName = async (name: string, locale?: LocaleCode) => {
  const payload = await getPayload({ config })
  return await payload.find({
    collection: 'employees',
    where: {
      name: { equals: name },
    },
    limit: 1,
    locale: locale || 'de',
  })
}

/**
 * Retrieves the appropriate image ID for an employee.
 * First attempts to find media with alt text matching the employee's name,
 * then falls back to the default avatar if no match is found.
 *
 * @param employee - The employee document
 * @returns A promise resolving to the media ID string, or null if no image is available
 *
 * @example
 * const employee = await getEmployeeById('123')
 * const imageId = await getEmployeeImageId(employee)
 * if (imageId) {
 *   console.log(`Image ID: ${imageId}`)
 * }
 */
export async function getEmployeeImageId(employee: Employee) {
  // Try to find existing media first
  const employeeImage = await getMediaByAlt(employee.name)

  if (employeeImage) {
    return employeeImage.id
  }

  // Otherwise use a default image
  const defaultAvatar = await getDefaultAvatar()

  if (defaultAvatar) {
    return defaultAvatar.id
  }

  return null
}
