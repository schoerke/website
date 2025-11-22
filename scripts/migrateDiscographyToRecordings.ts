// @ts-nocheck
/**
 * Migration Script: Discography to Recordings
 *
 * This script migrates existing discography data from the Artists collection
 * to the new Recordings collection. Since discography data is unstructured
 * richText, this migration creates draft Recordings that preserve the original
 * content in the description field for manual review and structuring.
 *
 * Usage: pnpm migrate:discography
 */

import config from '@payload-config'
import { getPayload } from 'payload'

async function migrateDiscography() {
  console.log('=== Starting Discography Migration ===\n')

  try {
    const payload = await getPayload({ config })

    // 1. Fetch all artists with discography data
    console.log('Fetching artists with discography data...')
    const artists = await payload.find({
      collection: 'artists',
      where: {
        discography: {
          exists: true,
        },
      },
      limit: 1000,
      locale: 'all', // Get all locales
    })

    console.log(`Found ${artists.docs.length} artists with discography data\n`)

    let createdCount = 0
    let skippedCount = 0
    const errors: Array<{ artist: string; error: string }> = []

    // 2. Process each artist
    for (const artist of artists.docs) {
      // Skip if no discography content
      if (!artist.discography) {
        console.log(`⏭️  Skipping ${artist.name} (no discography content)`)
        skippedCount++
        continue
      }

      try {
        console.log(`📝 Processing: ${artist.name}`)

        // Create a draft recording with the discography content
        // Note: We create with DE locale first (default), then update EN locale
        const recording = await payload.create({
          collection: 'recordings',
          data: {
            title: `${artist.name} - Diskographie (zur Überprüfung)`,
            composer: 'Zu bestimmen',
            description: artist.discography, // Preserve original richText content
            artistRoles: [
              {
                artist: artist.id,
                role: ['soloist'], // Default role
              },
            ],
            _status: 'draft',
          },
          locale: 'de',
        })

        // Update with English locale
        await payload.update({
          collection: 'recordings',
          id: recording.id,
          data: {
            title: `${artist.name} - Discography (needs review)`,
            composer: 'To be determined',
          },
          locale: 'en',
        })

        console.log(`   ✅ Created draft recording for ${artist.name}`)
        createdCount++
      } catch (error) {
        console.error(`   ❌ Error processing ${artist.name}:`, error)
        errors.push({
          artist: artist.name,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // 3. Output migration summary
    console.log('\n=== Migration Complete ===')
    console.log(`✅ Created: ${createdCount} draft recordings`)
    console.log(`⏭️  Skipped: ${skippedCount} artists (no discography)`)

    if (errors.length > 0) {
      console.log(`\n❌ Errors: ${errors.length}`)
      errors.forEach(({ artist, error }) => {
        console.log(`   - ${artist}: ${error}`)
      })
    }

    console.log('\n=== Next Steps ===')
    console.log('1. Log into Payload admin panel')
    console.log('2. Navigate to Recordings collection')
    console.log('3. Review each draft recording:')
    console.log('   - Extract title, composer, year, label, catalog number from description')
    console.log('   - Update description to only include supplementary info (tracks, notes)')
    console.log('   - Adjust artist roles if needed')
    console.log('   - Add cover art')
    console.log('   - Publish when ready')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
migrateDiscography()
