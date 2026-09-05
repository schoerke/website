/**
 * Set Recordings Without Cover Art to Draft
 *
 * Finds all recordings that have no cover art (`coverArt` is null/undefined) and, when
 * currently published, sets their status to `draft`. Recordings already in draft are left
 * untouched (no-op).
 *
 * ## Usage
 *
 * ```bash
 * # Dry-run against local dev.db (default, writes nothing)
 * pnpm tsx scripts/db/setRecordingsWithoutCoverToDraft.ts
 *
 * # Apply against local dev.db
 * pnpm tsx scripts/db/setRecordingsWithoutCoverToDraft.ts --apply
 *
 * # Dry-run against production (NODE_ENV=production prevents pushDevSchema / dev|-1)
 * NODE_ENV=production DATABASE_URI="libsql://ksschoerke-production-zeitchef.aws-eu-west-1.turso.io" \
 * DATABASE_AUTH_TOKEN="<prod token from .env>" \
 * pnpm tsx scripts/db/setRecordingsWithoutCoverToDraft.ts
 *
 * # Apply against production — REQUIRES explicit user approval
 * NODE_ENV=production DATABASE_URI="libsql://ksschoerke-production-zeitchef.aws-eu-west-1.turso.io" \
 * DATABASE_AUTH_TOKEN="<prod token from .env>" \
 * pnpm tsx scripts/db/setRecordingsWithoutCoverToDraft.ts --apply
 * ```
 *
 * ## Environment
 *
 * - `DATABASE_URI` / `DATABASE_AUTH_TOKEN` from `.env` (defaults to local `file:./dev.db`)
 * - `NODE_ENV=production` is REQUIRED when `DATABASE_URI` points at production
 *   (prevents `pushDevSchema` from writing the `dev|-1` marker to prod).
 *
 * ## Guards
 *
 * - Aborts if `DATABASE_URI` contains `ksschoerke-production` and `NODE_ENV !== 'production'`.
 * - Defaults to dry-run; `--apply` flag required to write.
 * - All writes use the Payload Local API with `context: { skipRevalidation: true }`
 *   (revalidateRecording hook calls revalidatePath, which throws outside Next.js).
 *
 * @see docs/memory/scripts.md — prod-safe script conventions
 * @see docs/memory/data-operations.md — why Local API (never raw SQL) for writes
 */

import 'dotenv/config'
import config from '@/payload.config'
import { getPayload } from 'payload'

const isProd = (process.env.DATABASE_URI || '').includes('ksschoerke-production')
if (isProd && process.env.NODE_ENV !== 'production') {
  console.error(
    '❌ ABORT: DATABASE_URI points to production but NODE_ENV is not production.\n' +
      '   Run with NODE_ENV=production (prevents pushDevSchema from writing the dev|-1 marker to prod).'
  )
  process.exit(1)
}

const APPLY = process.argv.includes('--apply')

interface RecordingRow {
  id: number
  title: string
  coverArt?: number | null
  _status?: 'draft' | 'published' | null
}

async function main() {
  const payload = await getPayload({ config })

  const { docs, totalDocs } = await payload.find({
    collection: 'recordings',
    where: {},
    depth: 0,
    limit: 0,
    select: {
      title: true,
      coverArt: true,
      _status: true,
    },
  })

  const rows = docs as unknown as RecordingRow[]
  const withoutCover = rows.filter((r) => r.coverArt === null || r.coverArt === undefined)
  const toDraft = withoutCover.filter((r) => r._status === 'published')
  const alreadyDraft = withoutCover.filter((r) => r._status !== 'published')

  console.log(`Recordings total:        ${totalDocs}`)
  console.log(`Without cover art:       ${withoutCover.length}`)
  console.log(`  → published (to draft): ${toDraft.length}`)
  console.log(`  → already draft (skip): ${alreadyDraft.length}`)

  if (toDraft.length > 0) {
    console.log('\nRecordings to set to draft:')
    for (const r of toDraft) {
      console.log(`  #${r.id} — ${r.title}`)
    }
  }

  if (!APPLY) {
    console.log('\nDry-run — no changes made. Re-run with --apply to write.')
    await payload.db?.destroy?.()
    process.exit(0)
  }

  console.log('\nApplying…')
  let updated = 0
  for (const r of toDraft) {
    await payload.update({
      collection: 'recordings',
      id: r.id,
      data: { _status: 'draft' },
      context: { skipRevalidation: true },
    })
    updated += 1
    console.log(`  ✓ #${r.id} → draft`)
  }

  console.log(`\nDone. ${updated} recording(s) set to draft.`)
  await payload.db?.destroy?.()
  process.exit(0)
}

main().catch(async (err) => {
  console.error(err)
  process.exit(1)
})