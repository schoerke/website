/**
 * Migrate Media URLs to R2
 *
 * This script updates all media records in the database to use R2 URLs instead of local file paths.
 *
 * IMPORTANT: Verify your R2 configuration before running:
 * - CLOUDFLARE_S3_BUCKET=schoerke-website
 * - NEXT_PUBLIC_S3_HOSTNAME=https://pub-ff0ee23113d64c13b1d4b075f4d0b9b8.r2.dev
 * - All files uploaded to R2
 *
 * Usage:
 *   pnpm tsx scripts/db/migrateMediaToR2.ts
 */

import { config as loadEnv } from 'dotenv'
import { getPayload } from 'payload'
import payloadConfig from '../../src/payload.config.js'

loadEnv()

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_S3_HOSTNAME || ''

if (!R2_PUBLIC_URL) {
  console.error('❌ Error: NEXT_PUBLIC_S3_HOSTNAME not set in environment')
  process.exit(1)
}

async function migrateMediaToR2() {
  const payload = await getPayload({ config: payloadConfig })

  console.log('=== Migrate Media URLs to R2 ===')
  console.log(`R2 Public URL: ${R2_PUBLIC_URL}`)
  console.log('')

  // Get all media records
  const allMedia = await payload.find({
    collection: 'media',
    limit: 1000,
    pagination: false,
  })

  console.log(`Found ${allMedia.totalDocs} media records`)
  console.log('')

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const doc of allMedia.docs) {
    const oldUrl = doc.url

    // Skip if already using R2 URL
    if (oldUrl && oldUrl.startsWith(R2_PUBLIC_URL)) {
      console.log(`⏭️  Skipping (already R2): ${doc.filename}`)
      skipped++
      continue
    }

    try {
      // Update main file URL
      const newUrl = `${R2_PUBLIC_URL}/${doc.filename}`

      // Update sizes URLs
      const updatedSizes: any = {}
      if (doc.sizes) {
        for (const [sizeName, sizeData] of Object.entries(doc.sizes as any)) {
          if (sizeData && typeof sizeData === 'object' && 'filename' in sizeData) {
            // Only update URL if filename exists (not null/undefined)
            // If filename is null, the size generation failed - keep URL as null
            const newUrl = sizeData.filename ? `${R2_PUBLIC_URL}/${sizeData.filename}` : null
            updatedSizes[sizeName] = {
              ...sizeData,
              url: newUrl,
            }
          }
        }
      }

      // Update the record
      await payload.update({
        collection: 'media',
        id: doc.id,
        data: {
          url: newUrl,
          ...(Object.keys(updatedSizes).length > 0 ? { sizes: updatedSizes } : {}),
        },
      })

      console.log(`✅ Updated: ${doc.filename}`)
      console.log(`   Old: ${oldUrl}`)
      console.log(`   New: ${newUrl}`)
      updated++
    } catch (error) {
      console.error(`❌ Failed to update ${doc.filename}:`, error instanceof Error ? error.message : error)
      failed++
    }
  }

  console.log('')
  console.log('=== Migration Summary ===')
  console.log(`✅ Updated: ${updated}`)
  console.log(`⏭️  Skipped (already R2): ${skipped}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📊 Total: ${allMedia.totalDocs}`)

  process.exit(0)
}

migrateMediaToR2()
