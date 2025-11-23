import config from '@payload-config'
import 'dotenv/config'
import { getPayload } from 'payload'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function main() {
  const payload = await getPayload({ config })

  console.log('🔍 Finding artists without slugs...\n')

  // Find all artists
  const { docs: artists } = await payload.find({
    collection: 'artists',
    limit: 1000,
  })

  let updatedCount = 0
  let skippedCount = 0

  for (const artist of artists) {
    if (!artist.slug) {
      const slug = generateSlug(artist.name)
      console.log(`📝 Updating ${artist.name} → slug: ${slug}`)

      await payload.update({
        collection: 'artists',
        id: artist.id,
        data: {
          slug,
        },
      })

      updatedCount++
    } else {
      console.log(`✓ ${artist.name} already has slug: ${artist.slug}`)
      skippedCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ Updated: ${updatedCount}`)
  console.log(`⏭️  Skipped: ${skippedCount}`)
  console.log('='.repeat(60))

  process.exit(0)
}

main()
