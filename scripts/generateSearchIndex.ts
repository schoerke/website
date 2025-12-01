/**
 * Generate Search Index
 *
 * Build-time script that queries Payload's search collection and generates
 * static JSON files for client-side search fallback.
 *
 * Features:
 * - Queries search collection for all documents (per locale)
 * - Transforms to minimal format (displayTitle, slug, relationTo)
 * - Writes minified JSON to public/search-index-{locale}.json
 * - Generates both German and English indexes
 *
 * Usage:
 * ```bash
 * pnpm generate:search-index
 * ```
 *
 * Output:
 * - /public/search-index-de.json (~10-15KB gzipped for 500 docs)
 * - /public/search-index-en.json (~10-15KB gzipped for 500 docs)
 *
 * @see docs/plans/2025-11-24-project-wide-search-refined-design.md
 */

import config from '@/payload.config'
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

interface MinimalSearchDoc {
  displayTitle: string
  slug: string
  relationTo: string
}

interface SearchIndex {
  version: string
  locale: string
  updated: string
  docs: MinimalSearchDoc[]
}

async function generateSearchIndex() {
  console.log('🔍 Generating search index...')

  try {
    const payload = await getPayload({ config })

    // Generate index for each locale
    for (const locale of ['de', 'en'] as const) {
      console.log(`\n📄 Processing locale: ${locale}`)

      // Query all search documents for this locale
      const results = await payload.find({
        collection: 'search' as any,
        locale,
        limit: 1000, // Fetch all documents (increase if needed)
        pagination: false,
      })

      console.log(`   Found ${results.docs.length} documents`)

      // Transform to minimal format
      const minimalDocs: MinimalSearchDoc[] = results.docs.map((doc: any) => ({
        displayTitle: doc.displayTitle || doc.title || 'Untitled',
        slug: doc.slug || '',
        relationTo: doc.doc?.relationTo || 'unknown',
      }))

      // Create search index object
      const searchIndex: SearchIndex = {
        version: '2025-12-01',
        locale,
        updated: new Date().toISOString(),
        docs: minimalDocs,
      }

      // Write to public directory (minified)
      const publicDir = path.join(process.cwd(), 'public')
      const filePath = path.join(publicDir, `search-index-${locale}.json`)

      // Ensure public directory exists
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true })
      }

      // Write minified JSON (no whitespace)
      fs.writeFileSync(filePath, JSON.stringify(searchIndex))

      const fileSize = fs.statSync(filePath).size
      const fileSizeKB = (fileSize / 1024).toFixed(2)

      console.log(`   ✅ Generated: ${filePath}`)
      console.log(`   📦 Size: ${fileSizeKB} KB (raw, will be gzipped by Vercel)`)
    }

    console.log('\n✅ Search index generation complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error generating search index:', error)
    process.exit(1)
  }
}

generateSearchIndex()
