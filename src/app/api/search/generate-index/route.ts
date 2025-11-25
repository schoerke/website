/**
 * Generate Static Search Index Endpoint
 *
 * GET /api/search/generate-index
 *
 * Generates static JSON files for offline search fallback:
 * - public/search-index-de.json
 * - public/search-index-en.json
 *
 * These files are used as a backup when the Payload API is unavailable.
 *
 * Response Format:
 * {
 *   success: boolean
 *   message: string
 *   files: string[]
 *   stats: {
 *     de: { totalResults: number, groups: Record<string, number> }
 *     en: { totalResults: number, groups: Record<string, number> }
 *   }
 * }
 */

import config from '@/payload.config'
import { writeFile } from 'fs/promises'
import { NextResponse } from 'next/server'
import path from 'path'
import { getPayload } from 'payload'

interface SearchDoc {
  id: string
  title: string
  relationTo: string
  relationId: string
  slug?: string
  priority: number
}

interface SearchIndex {
  version: string
  locale: string
  updated: string
  results: {
    artists: SearchDoc[]
    projects: SearchDoc[]
    news: SearchDoc[]
    recordings: SearchDoc[]
    employees: SearchDoc[]
    pages: SearchDoc[]
  }
}

export async function GET() {
  try {
    const payload = await getPayload({ config })

    // Generate index for both locales
    const locales: Array<'de' | 'en'> = ['de', 'en']
    const files: string[] = []
    const stats: Record<string, { totalResults: number; groups: Record<string, number> }> = {}

    for (const locale of locales) {
      // Fetch ALL search results for this locale (no query filter)
      const results = await payload.find({
        collection: 'search' as any,
        locale,
        limit: 1000, // High limit to get all results
        sort: '-priority',
      })

      // Group results by collection/category
      const index: SearchIndex = {
        version: '2025-11-24',
        locale,
        updated: new Date().toISOString(),
        results: {
          artists: [],
          projects: [],
          news: [],
          recordings: [],
          employees: [],
          pages: [],
        },
      }

      for (const doc of results.docs as any[]) {
        const searchDoc: SearchDoc = {
          id: doc.id,
          title: doc.displayTitle || doc.title, // Use displayTitle for proper case
          relationTo: doc.doc.relationTo,
          relationId: doc.doc.value,
          slug: doc.slug || undefined,
          priority: doc.priority,
        }

        // Group by collection/category
        const relationTo = doc.doc.relationTo

        if (relationTo === 'artists') {
          index.results.artists.push(searchDoc)
        } else if (relationTo === 'recordings') {
          index.results.recordings.push(searchDoc)
        } else if (relationTo === 'employees') {
          index.results.employees.push(searchDoc)
        } else if (relationTo === 'posts') {
          // TODO: Categorize posts by category (news vs projects)
          // For now, treat all posts as news
          index.results.news.push(searchDoc)
        } else if (relationTo === 'pages') {
          index.results.pages.push(searchDoc)
        }
      }

      // Write to public directory
      const publicDir = path.join(process.cwd(), 'public')
      const fileName = `search-index-${locale}.json`
      const filePath = path.join(publicDir, fileName)

      await writeFile(filePath, JSON.stringify(index, null, 2), 'utf-8')

      files.push(fileName)
      stats[locale] = {
        totalResults: results.totalDocs,
        groups: {
          artists: index.results.artists.length,
          projects: index.results.projects.length,
          news: index.results.news.length,
          recordings: index.results.recordings.length,
          employees: index.results.employees.length,
          pages: index.results.pages.length,
        },
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Static search index generated successfully',
      files,
      stats,
    })
  } catch (error) {
    console.error('Generate index error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate search index',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
