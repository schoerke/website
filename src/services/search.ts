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
}

export interface SearchResults {
  results: {
    artists: SearchDoc[]
    projects: SearchDoc[]
    news: SearchDoc[]
    recordings: SearchDoc[]
    employees: SearchDoc[]
    pages: SearchDoc[]
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
        projects: [],
        news: [],
        recordings: [],
        employees: [],
        pages: [],
      },
      source: 'api',
      error: 'Query too short (minimum 3 characters)',
    }
  }

  if (sanitizedQuery.length > 100) {
    return {
      results: {
        artists: [],
        projects: [],
        news: [],
        recordings: [],
        employees: [],
        pages: [],
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
    // Try API first with 500ms timeout
    const apiPromise = searchViaAPI(sanitizedQuery, locale, controller.signal)
    const timeoutPromise = new Promise<SearchResults>((_, reject) => {
      const timeoutId = setTimeout(() => {
        controller.abort() // Abort the fetch when timeout occurs
        reject(new Error('API timeout after 500ms'))
      }, 500)
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
          projects: [],
          news: [],
          recordings: [],
          employees: [],
          pages: [],
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
 * Search via Payload API
 */
async function searchViaAPI(query: string, locale: 'de' | 'en', signal: AbortSignal): Promise<SearchResults> {
  const url = `/api/search?q=${encodeURIComponent(query)}&locale=${locale}&limit=50`

  const response = await fetch(url, { signal })

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`)
  }

  const data = await response.json()

  // Group results by collection
  const grouped: SearchResults = {
    results: {
      artists: [],
      projects: [],
      news: [],
      recordings: [],
      employees: [],
      pages: [],
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
    }

    if (doc.relationTo === 'artists') {
      grouped.results.artists.push(searchDoc)
    } else if (doc.relationTo === 'recordings') {
      grouped.results.recordings.push(searchDoc)
    } else if (doc.relationTo === 'employees') {
      grouped.results.employees.push(searchDoc)
    } else if (doc.relationTo === 'posts') {
      // TODO: Categorize by post category
      grouped.results.news.push(searchDoc)
    } else if (doc.relationTo === 'pages') {
      grouped.results.pages.push(searchDoc)
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

  // Perform client-side substring search on displayTitle
  const lowerQuery = query.toLowerCase()

  const matchedDocs = index.docs.filter((doc) => doc.displayTitle.toLowerCase().includes(lowerQuery))

  // Group by collection type and convert to SearchDoc format
  const grouped: SearchResults = {
    results: {
      artists: [],
      projects: [],
      news: [],
      recordings: [],
      employees: [],
      pages: [],
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
    } else if (doc.relationTo === 'recordings') {
      grouped.results.recordings.push(searchDoc)
    } else if (doc.relationTo === 'employees') {
      grouped.results.employees.push(searchDoc)
    } else if (doc.relationTo === 'posts') {
      grouped.results.news.push(searchDoc)
    } else if (doc.relationTo === 'pages') {
      grouped.results.pages.push(searchDoc)
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
