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
 *     title: string
 *     relationTo: string (collection name)
 *     relationId: string (doc ID)
 *     priority: number
 *     locale: string
 *   }>
 *   total: number
 *   limit: number
 *   offset: number
 * }
 */

import config from '@/payload.config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

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

    // Search the search collection
    const results = await payload.find({
      collection: 'search' as any,
      locale, // Pass locale to get localized 'title' field
      where: {
        title: {
          contains: query.trim(),
        },
      },
      limit,
      page: Math.floor(offset / limit) + 1,
      sort: '-priority', // Higher priority first
    })

    return NextResponse.json({
      results: results.docs.map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        relationTo: doc.doc.relationTo,
        relationId: doc.doc.value,
        priority: doc.priority,
        locale: doc.locale,
      })),
      total: results.totalDocs,
      limit: results.limit,
      offset: ((results.page || 1) - 1) * results.limit,
    })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
