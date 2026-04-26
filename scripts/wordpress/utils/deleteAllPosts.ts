/**
 * Delete All Posts from Payload CMS
 *
 * Deletes all documents from the posts collection, including their versions.
 * Payload's delete operation automatically calls deleteCollectionVersions()
 * before each delete, so _posts_v and its child tables are cleaned up too.
 *
 * Usage:
 *   pnpm tsx scripts/wordpress/utils/deleteAllPosts.ts                          # delete all posts
 *   pnpm tsx scripts/wordpress/utils/deleteAllPosts.ts --dry-run                # preview only
 *   pnpm tsx scripts/wordpress/utils/deleteAllPosts.ts --slugs=slug1,slug2,...  # delete specific posts by wpSlug
 *
 * @see scripts/wordpress/importPostsDataset.ts - Run this after to import real posts
 */

import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../../../src/payload.config.js'

const DRY_RUN = process.argv.includes('--dry-run')
const SLUGS_ARG = process.argv.find(a => a.startsWith('--slugs='))
const FILTER_SLUGS: string[] | null = SLUGS_ARG ? SLUGS_ARG.split('=')[1].split(',').map(s => s.trim()) : null
const IDS_ARG = process.argv.find(a => a.startsWith('--ids='))
const FILTER_IDS: number[] | null = IDS_ARG ? IDS_ARG.split('=')[1].split(',').map(Number) : null

async function main() {
  if (DRY_RUN) {
    console.log('🔍 DRY RUN — no deletions will occur\n')
  } else {
    console.log('🗑️  Deleting posts...\n')
  }

  if (FILTER_SLUGS) {
    console.log(`🎯 Targeting ${FILTER_SLUGS.length} specific slugs\n`)
  }
  if (FILTER_IDS) {
    console.log(`🎯 Targeting ${FILTER_IDS.length} specific IDs\n`)
  }

  const payload = await getPayload({ config })

  // Find all posts
  const { docs } = await payload.find({
    collection: 'posts',
    locale: 'de',
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })

  // Filter to target slugs/ids if provided
  const toDelete = FILTER_IDS
    ? docs.filter(p => FILTER_IDS.includes(p.id as number))
    : FILTER_SLUGS
      ? docs.filter(p => FILTER_SLUGS.includes(p.slug as string))
      : docs

  if (toDelete.length === 0) {
    console.log('✅ No matching posts found — nothing to delete.')
    process.exit(0)
  }

  console.log(`📋 Found ${toDelete.length} posts to delete:\n`)
  toDelete.forEach(p => console.log(`  ID ${p.id}: "${p.title}" (slug: ${p.slug})`))
  console.log()

  if (DRY_RUN) {
    console.log('─'.repeat(60))
    console.log(`📊 Dry Run Summary:`)
    console.log(`  Would delete: ${toDelete.length} posts`)
    console.log(`  Versions and related records cleaned up automatically by Payload`)
    console.log('\n✅ Run without --dry-run to proceed.')
    process.exit(0)
  }

  // Delete matched posts one by one (to avoid deleting unrelated posts when filtering)
  let deleted = 0
  let errors = 0
  for (const post of toDelete) {
    try {
      await payload.delete({ collection: 'posts', id: post.id as number, overrideAccess: true })
      console.log(`  ✅ Deleted ID ${post.id}: "${post.slug}"`)
      deleted++
    } catch (err) {
      console.error(`  ❌ Failed ID ${post.id}: ${err instanceof Error ? err.message : err}`)
      errors++
    }
  }

  console.log('─'.repeat(60))
  console.log(`📊 Summary:`)
  console.log(`  ✅ Deleted: ${deleted}`)
  console.log(`  ❌ Errors:  ${errors}`)

  if (errors > 0) {
    console.log('\nCheck errors above.')
  }

  process.exit(0)
}

main().catch(console.error)
