/**
 * Search API Endpoint
 *
 * GET /api/search?q=<query>&locale=<locale>&limit=<limit>&offset=<offset>
 *
 * Query Parameters:
 * - q: Search query string (required)
 * - locale: Filter by locale ('de' or 'en', optional, defaults to 'de')
 * - limit: Number of results to return (optional, defaults to 10, max 50)
 * - offset: Pagination offset (optional, defaults to 0)
 *
 * Response Format:
 * {
 *   results: Array<{
 *     id: string
 *     title: string (clean display title from displayTitle field)
 *     relationTo: string (collection name)
 *     relationId: string (doc ID)
 *     slug: string (URL slug for artists and posts)
 *     priority: number
 *     locale: string
 *     contactPersons?: Array<{ id: number, name: string, email: string }> (for artists only)
 *   }>
 *   total: number
 *   limit: number
 *   offset: number
 * }
 */

import type { Artist, Employee, Search as SearchDocument } from '@/payload-types'
import config from '@/payload.config'
import { normalizeText } from '@/utils/search/normalizeText'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

interface ContactPerson {
  id: number
  name: string
  email: string
}

interface SearchAPIResult {
  id: string | number
  title: string
  relationTo: string
  relationId: string | number
  slug: string
  priority?: number | null
  locale?: string | null
  contactPersons?: ContactPerson[]
}

interface SearchAPIResponse {
  results: SearchAPIResult[]
  total: number
  limit: number
  offset: number
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const locale = (searchParams.get('locale') || 'de') as 'de' | 'en'
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config })

    // Normalize query for diacritic-insensitive search
    const normalizedQuery = normalizeText(query.trim())

    // Search the search collection
    const results = await payload.find({
      collection: 'search',
      locale, // Pass locale to get localized 'title' field
      where: {
        title: {
          contains: normalizedQuery,
        },
      },
      limit,
      page: Math.floor(offset / limit) + 1,
      sort: '-priority', // Higher priority first
      depth: 0, // Polymorphic relationships aren't populated by depth
    })

    // Manually populate artist contact persons (depth doesn't work on polymorphic relationships)
    const artistIds = results.docs
      .filter((doc: SearchDocument) => doc.doc.relationTo === 'artists')
      .map((doc: SearchDocument) => {
        if (doc.doc.relationTo === 'artists') {
          return typeof doc.doc.value === 'object' ? doc.doc.value.id : doc.doc.value
        }
        return null
      })
      .filter((id): id is number => id !== null)

    // Fetch all artists with their contact persons
    const artistsWithContactPersons = new Map()
    if (artistIds.length > 0) {
      const artists = await payload.find({
        collection: 'artists',
        where: {
          id: {
            in: artistIds,
          },
        },
        depth: 1, // Populate contactPersons relationships
        limit: artistIds.length,
      })

      artists.docs.forEach((artist: Artist) => {
        if (artist.contactPersons && Array.isArray(artist.contactPersons)) {
          const contactPersons = artist.contactPersons
            .filter((cp): cp is Employee => cp !== null && typeof cp === 'object' && 'email' in cp && !!cp.email)
            .map((cp) => ({
              id: cp.id,
              name: cp.name,
              email: cp.email,
            }))

          if (contactPersons.length > 0) {
            artistsWithContactPersons.set(artist.id, contactPersons)
          }
        }
      })
    }

    const response: SearchAPIResponse = {
      results: results.docs.map((searchDoc: SearchDocument) => {
        const relatedDoc = searchDoc.doc
        const relatedDocData = relatedDoc.value

        const result: SearchAPIResult = {
          id: searchDoc.id,
          title: searchDoc.displayTitle || searchDoc.title || '',
          relationTo: relatedDoc.relationTo,
          relationId: typeof relatedDocData === 'object' ? relatedDocData.id : relatedDocData,
          slug: searchDoc.slug || '', // Include slug for routing
          priority: searchDoc.priority,
          locale: searchDoc.locale,
        }

        // Attach contact persons from our manual fetch
        if (relatedDoc.relationTo === 'artists') {
          const artistId = typeof relatedDocData === 'object' ? relatedDocData.id : relatedDocData
          const contactPersons = artistsWithContactPersons.get(artistId)
          if (contactPersons) {
            result.contactPersons = contactPersons
          }
        }

        return result
      }),
      total: results.totalDocs,
      limit: results.limit,
      offset: ((results.page || 1) - 1) * results.limit,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
