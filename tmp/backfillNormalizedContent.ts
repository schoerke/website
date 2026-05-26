/**
 * One-time backfill script: populates normalizedContent for all existing posts.
 *
 * Triggers the Posts beforeChange hook by re-saving each post via Payload Local API.
 * Run once after deploying the normalizedContent field to production.
 *
 * Usage: npx tsx tmp/backfillNormalizedContent.ts
 *
 * IMPORTANT: Verify DATABASE_URI in .env points to the correct database before running.
 * Requires explicit user approval per database protection policy.
 */

import 'dotenv/config'

import config from '@/payload.config'
import { getPayload } from 'payload'

const BATCH_SIZE = 50

async function main() {
  const payload = await getPayload({ config })

  const locales: Array<'de' | 'en'> = ['de', 'en']

  for (const locale of locales) {
    console.log(`\nProcessing locale: ${locale}`)

    let page = 1
    let hasMore = true

    while (hasMore) {
      const result = await payload.find({
        collection: 'posts',
        limit: BATCH_SIZE,
        page,
        depth: 0,
        locale,
      })

      console.log(`  Page ${page}/${result.totalPages} — ${result.docs.length} posts`)

      for (const post of result.docs) {
        // Skip posts that already have normalizedContent populated
        if (post.normalizedContent) {
          process.stdout.write('s')
          continue
        }
        try {
          await payload.update({
            collection: 'posts',
            id: post.id,
            data: {
              // Re-saving existing data triggers beforeChange hooks including normalizedContent
              content: post.content,
            },
            locale,
            context: { skipRevalidation: true },
          })
          process.stdout.write('.')
        } catch (err) {
          console.error(`\n  ERROR updating post ${post.id} (${post.title}):`, err)
        }
      }

      process.stdout.write('\n')
      hasMore = result.hasNextPage
      page++
    }
  }

  console.log('\nBackfill complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
