import type { SearchDoc } from '@/services/search'

/**
 * Filters employees to show relevant email commands based on search context.
 *
 * Three filtering modes:
 * 1. Discovery mode - Query contains "email" or "mail" → show all employees
 * 2. Direct match - Employee name matches search query → show that employee
 * 3. Contextual - Employee is a contact person for a found artist → show contact persons
 *
 * @param query - Normalized search query (trimmed and lowercased)
 * @param allEmployees - All employees with email addresses
 * @param searchResults - Current search results (may contain artist contact persons)
 * @returns Filtered employees to show email commands for
 *
 * @example
 * ```typescript
 * // Discovery mode
 * filterEmailCommands('email', employees, []) // Returns all employees
 *
 * // Direct match
 * filterEmailCommands('wagner', employees, []) // Returns only Eva Wagner
 *
 * // Contextual
 * const pianoArtists = [{ relationTo: 'artists', contactPersons: [...] }]
 * filterEmailCommands('piano', employees, pianoArtists) // Returns contact persons
 * ```
 */
export function filterEmailCommands(
  query: string,
  allEmployees: Array<{ id: number; name: string; email: string }>,
  searchResults: SearchDoc[],
): Array<{ id: number; name: string; email: string }> {
  if (query.length < 3) return []

  const normalizedQuery = query.toLowerCase()

  // Collect contact person IDs from artist results
  const contactPersonIds = new Set<number>()
  searchResults
    .filter((doc) => doc.relationTo === 'artists' && doc.contactPersons)
    .forEach((doc) => {
      doc.contactPersons?.forEach((cp) => contactPersonIds.add(cp.id))
    })

  const isEmailSearch = normalizedQuery.includes('email') || normalizedQuery.includes('mail')

  return allEmployees.filter((employee) => {
    // Discovery mode: show all if searching for "email" or "mail"
    if (isEmailSearch) return true

    // Direct match: show if employee name matches search query
    if (employee.name.toLowerCase().includes(normalizedQuery)) return true

    // Contextual: show if employee is a contact person for a found artist
    if (contactPersonIds.has(employee.id)) return true

    return false
  })
}
