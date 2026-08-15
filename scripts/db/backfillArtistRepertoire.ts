/**
 * Backfill artist.repertoire arrays from existing Repertoire collection links.
 *
 * This script populates the new artist.repertoire relationship field by finding all
 * repertoire docs linked to each artist, then appending them to the artist's
 * repertoire array. Idempotent — safe to re-run.
 *
 * ⚠️ CRITICAL — ALWAYS run against production with NODE_ENV=production:
 * Without it, Payload's connect() runs `pushDevSchema` in dev mode, which re-adds
 * the `dev` batch:-1 marker to `payload_migrations` and breaks future `payload migrate`
 * runs (the interactive data-loss prompt silently cancels in CI). NODE_ENV=production
 * makes connect() skip the push entirely.
 *
 *   # Run against production (inline env, no .env swap):
 *   NODE_ENV=production DATABASE_URI=libsql://ksschoerke-production-... DATABASE_AUTH_TOKEN=<prod> \
 *     pnpm tsx scripts/db/backfillArtistRepertoire.ts --apply
 *
 * Safety features:
 * - Dry run mode by default (preview changes without applying)
 * - Preserves existing repertoire order if any exists
 * - Respects the 5-section maximum limit
 *
 * Usage:
 *   # Preview changes (dry run)
 *   pnpm tsx scripts/db/backfillArtistRepertoire.ts
 *
 *   # Apply changes
 *   pnpm tsx scripts/db/backfillArtistRepertoire.ts --apply
 */

import 'dotenv/config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'

async function getConfig() {
  const configModule = await import('../../src/payload.config')
  const configMaybePromise = configModule.default
  return typeof configMaybePromise.then === 'function' ? await configMaybePromise : configMaybePromise
}

async function run() {
  const isDryRun = !process.argv.includes('--apply')

  // Guard: connecting to the production DB without NODE_ENV=production triggers
  // pushDevSchema, which re-adds the dev batch:-1 marker and breaks future migrate runs.
  const isProd = (process.env.DATABASE_URI || '').includes('ksschoerke-production')
  if (isProd && process.env.NODE_ENV !== 'production') {
    console.error(
      '❌ ABORT: connecting to production requires NODE_ENV=production.\n' +
        '   Run with: NODE_ENV=production ... (prevents pushDevSchema from re-adding the dev marker)'
    )
    process.exit(1)
  }

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be applied')
    console.log('   Run with --apply flag to execute\n')
  }

  const config = await getConfig()
  const payload: Payload = await getPayload({ config })

  console.log('Fetching all repertoire docs...')
  const repertoires = await payload.find({
    collection: 'repertoire',
    limit: 1000,
  })

  console.log(`Found ${repertoires.docs.length} repertoire docs\n`)

  // Build map: artistId -> repertoire IDs
  const artistRepertoireMap = new Map<number, number[]>()

  for (const doc of repertoires.docs) {
    const artistIds = (doc.artists || [])
      .map((a) => (typeof a === 'object' && a !== null ? a.id : a))
      .filter((id): id is number => typeof id === 'number')

    for (const artistId of artistIds) {
      if (!artistRepertoireMap.has(artistId)) {
        artistRepertoireMap.set(artistId, [])
      }
      const list = artistRepertoireMap.get(artistId)!
      if (!list.includes(doc.id)) {
        list.push(doc.id)
      }
    }
  }

  console.log(`Updating ${artistRepertoireMap.size} artists\n`)

  let migrationCount = 0
  for (const [artistId, newIds] of artistRepertoireMap) {
    const artist = await payload.findByID({
      collection: 'artists',
      id: artistId,
    })

    const currentIds = (artist.repertoire || [])
      .map((r) => (typeof r === 'object' && r !== null ? r.id : r))
      .filter((id): id is number => typeof id === 'number')

    // Preserve existing order, append new IDs, cap at 5
    const merged: number[] = []
    for (const id of currentIds) {
      if (!merged.includes(id)) merged.push(id)
    }
    for (const id of newIds) {
      if (!merged.includes(id) && merged.length < 5) merged.push(id)
    }
    const limited = merged.slice(0, 5)

    console.log(`📝 Artist ${artistId} (${artist.name}): ${limited.length}/5 repertoire sections`)

    if (!isDryRun) {
      try {
        await payload.update({
          collection: 'artists',
          id: artistId,
          data: { repertoire: limited },
          // Prevent the syncArtistRepertoire hook from re-syncing during backfill,
          // and skip revalidateArtistOnChange (revalidatePath requires a Next.js server context).
          context: { syncingRepertoire: true, skipRevalidation: true },
        })
        console.log(`   ✓ Updated`)
      } catch (error) {
        console.error(`   ❌ Update failed:`, error)
        process.exit(1)
      }
    }
    migrationCount++
    console.log('')
  }

  console.log('─'.repeat(50))
  console.log(`Summary: ${migrationCount} artists processed`)

  if (isDryRun) {
    console.log(`\n✓ Dry run complete - no changes made`)
    console.log(`  Run with --apply flag to execute`)
  } else {
    console.log(`\n✓ Backfill complete!`)
    console.log(`  Note: syncArtistRepertoire hook keeps arrays in sync going forward`)
  }

  process.exit(0)
}

run().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
