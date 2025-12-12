/**
 * Re-index Search Collection (Fast Version)
 *
 * This script directly updates the search collection by applying normalization logic
 * to existing search records, then generates static JSON files for fallback.
 *
 * Usage:
 *   pnpm tsx scripts/reindexSearch.ts
 *
 * What it does:
 * 1. Fetches all existing search records
 * 2. Applies normalized text transformation (diacritic-insensitive) directly
 * 3. Updates search records in bulk
 * 4. Generates static JSON files (public/search-index-{locale}.json) for fallback
 *
 * This is MUCH faster than the old approach which updated every source document.
 *
 * Environment:
 * - Uses the DATABASE_URI from .env
 * - Connects to whichever database is configured (local or remote)
 */

import 'dotenv/config'

import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

/**
 * Normalize text for diacritic-insensitive search
 * (Inline version to avoid import issues in payload run scripts)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Decompose combined characters (é → e + ́)
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
}

interface MinimalSearchDoc {
  displayTitle: string
  slug: string
  relationTo: string
  category?: string // For posts: 'news', 'projects', or 'home'
}

interface SearchIndex {
  version: string
  locale: string
  updated: string
  docs: MinimalSearchDoc[]
}

async function run() {
  console.log('🔍 Starting fast search re-index...\n')

  try {
    const payload = await getPayload({ config })
    console.log('✅ Connected to Payload\n')

    // Step 1: Re-normalize existing search records (FAST - no source doc updates)
    console.log('📝 Step 1: Re-normalizing search records...\n')

    // Fetch all search records
    const searchResults = await payload.find({
      collection: 'search',
      limit: 0,
      pagination: false,
    })

    console.log(`   Found ${searchResults.docs.length} search records`)

    let updated = 0
    for (const searchDoc of searchResults.docs) {
      try {
        // Re-normalize the title field
        if (searchDoc.title) {
          const normalizedTitle = normalizeText(searchDoc.title)

          // Only update the title field
          await payload.update({
            collection: 'search',
            id: searchDoc.id,
            data: {
              title: normalizedTitle,
            },
            overrideAccess: true,
          })

          updated++

          if (updated % 10 === 0) {
            console.log(`   Normalized ${updated}/${searchResults.docs.length}`)
          }
        }
      } catch (error) {
        console.error(`   ⚠️  Error updating search record ${searchDoc.id}:`, (error as Error).message)
      }
    }

    console.log(`   ✅ Completed normalization (${updated} records)\n`)

    console.log('✅ Database search re-normalization complete!\n')

    // Step 2: Generate static JSON files
    console.log('📄 Step 2: Generating static JSON files for fallback...\n')

    for (const locale of ['de', 'en'] as const) {
      console.log(`   Processing locale: ${locale}`)

      // Query all search documents for this locale
      const results = await payload.find({
        collection: 'search',
        locale,
        limit: 1000, // Fetch all documents (increase if needed)
        pagination: false,
      })

      console.log(`   Found ${results.docs.length} documents`)

      // Transform to minimal format
      const minimalDocs: MinimalSearchDoc[] = results.docs.map((doc: unknown) => {
        const record = doc as Record<string, unknown>
        const docRelation = record.doc as Record<string, unknown> | undefined
        return {
          displayTitle: (record.displayTitle as string) || (record.title as string) || 'Untitled',
          slug: (record.slug as string) || '',
          relationTo: (docRelation?.relationTo as string) || 'unknown',
          category: record.category as string | undefined, // Include category for posts
        }
      })

      // Create search index object
      const searchIndex: SearchIndex = {
        version: '2025-12-07',
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
      console.log(`   📦 Size: ${fileSizeKB} KB (raw, will be gzipped by Vercel)\n`)
    }

    console.log('✅ Complete search re-index finished!')
    console.log('   - Database search records updated with normalized text')
    console.log('   - Static JSON files generated for fallback\n')
  } catch (error) {
    console.error('❌ Failed:', error)
    process.exit(1)
  }

  process.exit(0)
}

await run()
