import { normalizeText } from '@/utils/search/normalizeText'

/**
 * Search Service
 *
 * Provides a unified interface for searching content across the application.
 * Handles API requests, caching, fallback to static JSON, and client-side fuzzy search.
 *
 * Features:
 * - Session-based caching (in-memory Map)
 * - Request deduplication via AbortController
 * - Automatic fallback to static JSON when API fails
 * - Client-side fuzzy search on static data
 * - Diacritic-insensitive search (e.g., "Poltera" matches "Poltéra")
 *
 * @example
 * ```typescript
 * import { searchContent } from '@/services/search'
 *
 * const results = await searchContent('Bach', 'de')
 * ```
 */

export interface SearchDoc {
  id: string
  title: string
  relationTo: string
  relationId: string
  slug?: string
  priority: number
  contactPersons?: Array<{ id: number; name: string; email: string }>
}

export interface SearchResults {
  results: {
    artists: SearchDoc[]
    employees: SearchDoc[]
    pages: SearchDoc[]
    repertoire: SearchDoc[]
  }
  source: 'api' | 'backup'
  error?: string
}

interface SearchIndex {
  version: string
  locale: string
  updated: string
  docs: Array<{
    displayTitle: string
    slug: string
    relationTo: string
  }>
}

// Session cache: Map<`${locale}:${query}`, SearchResults>
const searchCache = new Map<string, SearchResults>()

// Abort controllers for in-flight requests
const abortControllers = new Map<string, AbortController>()

/**
 * Search content across all indexed collections
 *
 * @param query - Search query string (3-100 chars)
 * @param locale - Locale to search in ('de' or 'en')
 * @returns Search results grouped by collection type
 */
export async function searchContent(query: string, locale: 'de' | 'en'): Promise<SearchResults> {
  // Validate and sanitize query
  const sanitizedQuery = query.trim()

  if (sanitizedQuery.length < 3) {
    return {
      results: {
        artists: [],
        employees: [],
        pages: [],
        repertoire: [],
      },
      source: 'api',
      error: 'Query too short (minimum 3 characters)',
    }
  }

  if (sanitizedQuery.length > 100) {
    return {
      results: {
        artists: [],
        employees: [],
        pages: [],
        repertoire: [],
      },
      source: 'api',
      error: 'Query too long (maximum 100 characters)',
    }
  }

  // Check cache
  const cacheKey = `${locale}:${sanitizedQuery.toLowerCase()}`
  const cached = searchCache.get(cacheKey)
  if (cached) {
    return cached
  }

  // Abort any pending request for this locale
  const abortKey = locale
  const existingController = abortControllers.get(abortKey)
  if (existingController) {
    existingController.abort()
  }

  // Create new abort controller for this request
  const controller = new AbortController()
  abortControllers.set(abortKey, controller)

  try {
    // Try API first with 2000ms timeout (more generous for dev environment)
    const apiPromise = searchViaAPI(sanitizedQuery, locale, controller.signal)
    const timeoutPromise = new Promise<SearchResults>((_, reject) => {
      const timeoutId = setTimeout(() => {
        controller.abort() // Abort the fetch when timeout occurs
        reject(new Error('API timeout after 2000ms'))
      }, 2000)
      // Store timeout ID so we can clear it if API succeeds
      ;(apiPromise as any).timeoutId = timeoutId
    })

    const apiResults = await Promise.race([apiPromise, timeoutPromise])

    // API succeeded - clear the timeout
    clearTimeout((apiPromise as any).timeoutId)

    // Cache and return
    searchCache.set(cacheKey, apiResults)
    abortControllers.delete(abortKey)
    return apiResults
  } catch (error) {
    // If API fails or times out, fallback to static JSON
    console.warn('API search failed, falling back to static JSON:', error)

    try {
      const backupResults = await searchViaStaticJSON(sanitizedQuery, locale)

      // Cache and return
      searchCache.set(cacheKey, backupResults)
      abortControllers.delete(abortKey)
      return backupResults
    } catch (backupError) {
      console.error('Static JSON fallback also failed:', backupError)

      // Total failure - return empty results with error
      const emptyResults: SearchResults = {
        results: {
          artists: [],
          employees: [],
          pages: [],
          repertoire: [],
        },
        source: 'backup',
        error: 'Search temporarily unavailable',
      }

      abortControllers.delete(abortKey)
      return emptyResults
    }
  }
}

/**
 * Search via API endpoint (primary search method)
 */
async function searchViaAPI(query: string, locale: 'de' | 'en', signal: AbortSignal): Promise<SearchResults> {
  // Always use 'de' locale for search since only German records exist
  // The content itself is localized, but the search records are only created for German
  const searchLocale = 'de'
  const url = `/api/search?q=${encodeURIComponent(query)}&locale=${searchLocale}&limit=50`

  const response = await fetch(url, { signal, cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`)
  }

  const data = await response.json()

  // Group results by collection
  const grouped: SearchResults = {
    results: {
      artists: [],
      employees: [],
      pages: [],
      repertoire: [],
    },
    source: 'api',
  }

  for (const doc of data.results) {
    const searchDoc: SearchDoc = {
      id: doc.id,
      title: doc.title,
      relationTo: doc.relationTo,
      relationId: doc.relationId,
      slug: doc.slug,
      priority: doc.priority,
      contactPersons: doc.contactPersons, // Include contact persons if present
    }

    if (doc.relationTo === 'artists') {
      grouped.results.artists.push(searchDoc)
    } else if (doc.relationTo === 'employees') {
      grouped.results.employees.push(searchDoc)
    } else if (doc.relationTo === 'pages') {
      grouped.results.pages.push(searchDoc)
    } else if (doc.relationTo === 'repertoire') {
      grouped.results.repertoire.push(searchDoc)
    }
  }

  return grouped
}

/**
 * Search via static JSON with client-side substring matching
 */
async function searchViaStaticJSON(query: string, locale: 'de' | 'en'): Promise<SearchResults> {
  const url = `/search-index-${locale}.json`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch static index: ${response.status}`)
  }

  const index: SearchIndex = await response.json()

  // Perform client-side substring search on displayTitle (normalized)
  const normalizedQuery = normalizeText(query)

  const matchedDocs = index.docs.filter((doc) => normalizeText(doc.displayTitle).includes(normalizedQuery))

  // Group by collection type and convert to SearchDoc format
  const grouped: SearchResults = {
    results: {
      artists: [],
      employees: [],
      pages: [],
      repertoire: [],
    },
    source: 'backup',
  }

  for (const doc of matchedDocs) {
    const searchDoc: SearchDoc = {
      id: doc.slug || doc.displayTitle, // Use slug as ID, fallback to displayTitle
      title: doc.displayTitle,
      relationTo: doc.relationTo,
      relationId: doc.slug || doc.displayTitle,
      slug: doc.slug,
      priority: 0, // Priority not needed for client-side results
    }

    if (doc.relationTo === 'artists') {
      grouped.results.artists.push(searchDoc)
    } else if (doc.relationTo === 'employees') {
      grouped.results.employees.push(searchDoc)
    } else if (doc.relationTo === 'pages') {
      grouped.results.pages.push(searchDoc)
    } else if (doc.relationTo === 'repertoire') {
      grouped.results.repertoire.push(searchDoc)
    }
  }

  return grouped
}

/**
 * Clear the search cache
 */
export function clearSearchCache(): void {
  searchCache.clear()
}
