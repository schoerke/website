/**
 * Re-index Search Collection
 *
 * This script forces a re-index of all searchable collections by touching each document.
 * This triggers the search plugin's beforeSync hook to regenerate search records with updated fields.
 *
 * Usage:
 *   pnpm payload run scripts/reindexSearch.ts
 *
 * What it does:
 * - Fetches all artists, posts, recordings, and employees
 * - Updates each document (triggers search plugin hooks)
 * - Regenerates search records with slug field populated
 *
 * Environment:
 * - Uses the DATABASE_URI from .env
 * - Connects to whichever database is configured (local or remote)
 */

import config from '@payload-config'
import { getPayload } from 'payload'

const collections = ['artists', 'posts', 'recordings', 'employees'] as const

async function run() {
  console.log('🔍 Starting search re-index...\n')

  try {
    const payload = await getPayload({ config })
    console.log('✅ Connected to Payload\n')

    for (const collection of collections) {
      console.log(`📚 Processing ${collection}...`)

      try {
        // Fetch all documents with minimal fields
        const result = await payload.find({
          collection,
          limit: 0,
          depth: 0, // Don't populate relationships
        })

        console.log(`   Found ${result.docs.length} documents`)

        // Update each document to trigger search index
        let processed = 0
        for (const doc of result.docs) {
          try {
            // Fetch the full document first (needed for validation)
            const fullDoc = await payload.findByID({
              collection,
              id: doc.id,
              depth: 0,
            })

            // Update with the same data to trigger hooks
            await payload.update({
              collection,
              id: doc.id,
              data: fullDoc as any,
              depth: 0,
            })

            processed++

            if (processed % 5 === 0) {
              console.log(`   Processed ${processed}/${result.docs.length}`)
            }
          } catch (error) {
            console.error(`   ⚠️  Error updating ${collection} ${doc.id}:`, (error as Error).message)
          }
        }

        console.log(`   ✅ Completed ${collection} (${processed} documents)\n`)
      } catch (error) {
        console.error(`   ❌ Error processing ${collection}:`, error)
      }
    }

    console.log('✅ Search re-index complete!')
  } catch (error) {
    console.error('❌ Failed:', error)
    process.exit(1)
  }

  process.exit(0)
}

await run()
