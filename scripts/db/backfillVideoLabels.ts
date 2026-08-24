/**
 * Backfill localized artists.videoLinks[].label into de + en via the Payload Local API.
 *
 * Reads the saved label map (data/dumps/video-labels.tsv: row-id<TAB>label) and sets the label
 * to the saved value in BOTH de and en locales, per artist, via TWO updates (one per locale)
 * sending the full videoLinks array with a plain-string label for that locale. Payload's
 * mergeLocalizedData preserves each locale independently on the non-localized array.
 *
 * Each row MUST include its real `id` (not a synthetic key) — omitting it causes Payload to
 * treat the row as new on every update, silently discarding the other locale's write and
 * generating a fresh row id (see docs/memory/migrations.md).
 *
 * Run this immediately after the `localize_video_link_label` migration is applied — the
 * migration drops the non-localized `label` column, so until this script runs, video link
 * labels render blank on the live site in both locales.
 *
 * @example
 * // Dry-run (default) against prod:
 * NODE_ENV=production DATABASE_URI=libsql://ksschoerke-production-... DATABASE_AUTH_TOKEN=<prod> \
 *   pnpm tsx scripts/db/backfillVideoLabels.ts
 *
 * // Apply against prod:
 * NODE_ENV=production DATABASE_URI=libsql://ksschoerke-production-... DATABASE_AUTH_TOKEN=<prod> \
 *   pnpm tsx scripts/db/backfillVideoLabels.ts --apply
 *
 * @see src/migrations/20260820_194949_localize_video_link_label.ts
 */
import 'dotenv/config'
import type { Artist } from '@/payload-types'
import config from '@/payload.config'
import { getPayload } from 'payload'
import fs from 'node:fs'
import path from 'node:path'

type VideoLinkRow = NonNullable<Artist['videoLinks']>[number]

const TSV = path.resolve('data/dumps/video-labels.tsv')
const apply = process.argv.includes('--apply')

// Guard: the label map is intentionally NOT committed (data/ is gitignored) — it must exist
// locally before this script can run. Fail loudly with exact regeneration steps rather than a
// bare ENOENT, since the source data becomes unrecoverable once the migration drops the column.
if (!fs.existsSync(TSV)) {
  console.error(
    `❌ ABORT: label map not found at ${TSV}\n\n` +
      'This file is NOT committed to git (data/ is gitignored) — it must be generated locally\n' +
      'before running this script. How to regenerate depends on whether the target DB has already\n' +
      'had the localize_video_link_label migration applied:\n\n' +
      '  1. If the migration has NOT yet run on the target DB (label column still present), export\n' +
      '     a fresh snapshot and dump the labels BEFORE migrating:\n' +
      '       turso db export ksschoerke-production --output-file data/dumps/pre-video-label.db\n' +
      '       sqlite3 -separator "$(printf \'\\t\')" data/dumps/pre-video-label.db \\\n' +
      '         "SELECT id, label FROM artists_video_links WHERE label IS NOT NULL AND label != \'\';" \\\n' +
      '         > data/dumps/video-labels.tsv\n\n' +
      '  2. If the migration has ALREADY run (label column dropped), the live DB no longer has this\n' +
      '     data — you MUST restore it from a pre-migration backup snapshot taken before the\n' +
      '     migration was applied (see data/dumps/ for any pre-video-label*.db snapshot, or the\n' +
      '     prod backup taken at deploy time) and repeat step 1 against that snapshot file.\n'
  )
  process.exit(1)
}

// Guard: connecting to production without NODE_ENV=production triggers pushDevSchema, which
// re-adds the `dev|-1` migration marker and can corrupt the migration history (see docs/memory/migrations.md).
const isProd = (process.env.DATABASE_URI || '').includes('ksschoerke-production')
if (isProd && process.env.NODE_ENV !== 'production') {
  console.error(
    '❌ ABORT: connecting to production requires NODE_ENV=production.\n' +
      '   Run with: NODE_ENV=production ... (prevents pushDevSchema from re-adding the dev marker)'
  )
  process.exit(1)
}

async function main() {
  const map = new Map<string, string>()
  for (const rawLine of fs.readFileSync(TSV, 'utf8').split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    const tab = line.indexOf('\t')
    if (tab > 0) {
      const id = line.slice(0, tab).trim()
      const label = line.slice(tab + 1)
      if (id && label) map.set(id, label)
    }
  }
  console.log('loaded', map.size, 'labels from', TSV)
  console.log('target DB       :', process.env.DATABASE_URI)

  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'artists',
    depth: 0,
    pagination: false,
    limit: 0,
    locale: 'all',
  })

  let matched = 0
  let missing = 0
  let updated = 0

  for (const artist of docs as Artist[]) {
    const rows = artist.videoLinks ?? []
    if (rows.length === 0) continue

    let artistHadMatch = false
    const newRows: VideoLinkRow[] = rows.map((r: VideoLinkRow) => {
      const saved = r?.id ? map.get(String(r.id)) : undefined
      if (saved === undefined) {
        missing++
        return r
      }
      artistHadMatch = true
      matched++
      return { id: r.id, label: saved, url: r.url }
    })

    if (!artistHadMatch) continue

    if (!apply) {
      console.log(`[dry] artist ${artist.name}: ${newRows.length} rows de/en`)
      continue
    }

    // Write de locale
    await payload.update({
      collection: 'artists',
      id: artist.id,
      data: { videoLinks: newRows },
      locale: 'de',
      context: { skipRevalidation: true },
    })
    // Write en locale (same rows; Payload stores label per locale)
    await payload.update({
      collection: 'artists',
      id: artist.id,
      data: { videoLinks: newRows },
      locale: 'en',
      context: { skipRevalidation: true },
    })
    updated++
  }

  console.log('----------------------------------------')
  console.log('labels loaded    :', map.size)
  console.log('rows matched     :', matched)
  console.log('rows missing map :', missing)
  console.log('artists updated  :', updated)
  console.log('mode             :', apply ? 'APPLY' : 'DRY-RUN')
  console.log('----------------------------------------')

  await payload.db?.destroy?.()
}

main().catch((e) => {
  console.error('BACKFILL FAILED:', e)
  process.exit(1)
})
