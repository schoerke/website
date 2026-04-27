/**
 * Import Posts Dataset into Payload CMS
 *
 * Reads posts-dataset.json (168 entries) and creates posts in Payload with
 * both DE and EN locale content. Each post is created in DE first, then
 * updated with EN content.
 *
 * Usage:
 *   pnpm tsx scripts/wordpress/importPostsDataset.ts                           # full import
 *   pnpm tsx scripts/wordpress/importPostsDataset.ts --dry-run                 # preview only, no writes
 *   pnpm tsx scripts/wordpress/importPostsDataset.ts --slugs=slug1,slug2,...   # import specific posts by wpSlug
 *
 * Dry-run checks:
 *   - All artist slugs resolve to Payload IDs
 *   - All imagePaths resolve in images-id-map.json
 *   - DE and EN slugs are present on every entry
 *   - HTML content is parseable by htmlToLexical
 *
 * Idempotency:
 *   - Skips entries where a post with the same DE slug already exists
 *   - Safe to re-run if import is interrupted
 *
 * Field mapping:
 *   - title       → localized (de + en)
 *   - slug        → localized (de + en), passed directly — slug hook preserves existing value
 *   - content     → localized richText, converted from HTML via htmlToLexical
 *   - categories  → select hasMany, ['news'] or ['projects']
 *   - image       → upload relation to images collection (via images-id-map.json)
 *   - artists     → relationship hasMany, resolved slug → Payload ID
 *   - createdBy   → default 1 (Eva Wagner)
 *   - _status     → 'published'
 *
 * @see scripts/wordpress/data/posts-dataset.json - Input dataset
 * @see scripts/wordpress/data/images-id-map.json - filename → Payload image ID
 * @see scripts/wordpress/utils/lexicalConverter.ts - HTML → Lexical converter
 */

import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { getPayload } from 'payload'
import { fileURLToPath } from 'url'
import config from '../../src/payload.config.js'
import { htmlToLexical } from './utils/lexicalConverter.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')

const DRY_RUN = process.argv.includes('--dry-run')
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='))
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1], 10) : undefined
const SLUGS_ARG = process.argv.find(a => a.startsWith('--slugs='))
const FILTER_SLUGS: string[] | null = SLUGS_ARG ? SLUGS_ARG.split('=')[1].split(',').map(s => s.trim()) : null
const DATASET_ARG = process.argv.find(a => a.startsWith('--dataset='))
const DATASET_PATH = DATASET_ARG ? path.resolve(DATASET_ARG.split('=')[1]) : path.join(DATA_DIR, 'posts-dataset.json')

interface DatasetEntry {
  wpSlug: string
  publishedAt: string
  category: 'news' | 'projects'
  artists: string[]
  imagePath: string | null
  de: {
    title: string
    contentHtml: string
    slug: string
    source: string
  }
  en: {
    title: string
    contentHtml: string
    slug: string
    source: string
  }
}

async function main() {
  if (DRY_RUN) {
    console.log('🔍 DRY RUN — no database writes will occur\n')
  } else {
    console.log('📥 Importing posts dataset...\n')
  }

  // Load dataset
  const dataset: DatasetEntry[] = JSON.parse(await fs.readFile(DATASET_PATH, 'utf-8'))
  console.log(`📋 ${dataset.length} entries in ${path.basename(DATASET_PATH)}\n`)

  const entries = LIMIT ? dataset.slice(0, LIMIT) : dataset
  if (LIMIT) console.log(`⚠️  Limiting to first ${LIMIT} entr${LIMIT === 1 ? 'y' : 'ies'}\n`)

  const filteredEntries = FILTER_SLUGS ? entries.filter(e => FILTER_SLUGS.includes(e.wpSlug)) : entries
  if (FILTER_SLUGS) console.log(`🎯 Targeting ${filteredEntries.length} of ${entries.length} entries by wpSlug\n`)

  // Load images-id-map
  const imagesIdMapPath = path.join(DATA_DIR, 'images-id-map.json')
  const imagesIdMap: Record<string, number> = JSON.parse(await fs.readFile(imagesIdMapPath, 'utf-8'))
  console.log(`🖼️  images-id-map.json has ${Object.keys(imagesIdMap).length} entries\n`)

  const payload = await getPayload({ config })

  // Build artist slug → ID map
  const artistResult = await payload.find({ collection: 'artists', limit: 200, depth: 0, locale: 'de' })
  const artistSlugToId: Record<string, number> = {}
  artistResult.docs.forEach(a => {
    if (a.slug) artistSlugToId[a.slug] = a.id as number
  })
  console.log(`🎨 ${Object.keys(artistSlugToId).length} artists loaded\n`)

  // Validate all entries before doing any writes
  console.log('🔎 Validating dataset...\n')
  const validationErrors: string[] = []

  for (let i = 0; i < filteredEntries.length; i++) {
    const entry = filteredEntries[i]
    const prefix = `[${i}] ${entry.wpSlug}`

    if (!entry.de.slug) validationErrors.push(`${prefix}: missing de.slug`)
    if (!entry.en.slug) validationErrors.push(`${prefix}: missing en.slug`)
    if (!entry.de.title) validationErrors.push(`${prefix}: missing de.title`)
    if (!entry.en.title) validationErrors.push(`${prefix}: missing en.title`)
    if (!entry.de.contentHtml) validationErrors.push(`${prefix}: missing de.contentHtml`)
    if (!entry.en.contentHtml) validationErrors.push(`${prefix}: missing en.contentHtml`)

    for (const artistSlug of entry.artists) {
      if (!artistSlugToId[artistSlug]) {
        validationErrors.push(`${prefix}: unknown artist slug "${artistSlug}"`)
      }
    }

    if (entry.imagePath && imagesIdMap[entry.imagePath] === undefined) {
      validationErrors.push(`${prefix}: imagePath "${entry.imagePath}" not in images-id-map.json`)
    }

    try {
      htmlToLexical(entry.de.contentHtml)
      htmlToLexical(entry.en.contentHtml)
    } catch (err) {
      validationErrors.push(`${prefix}: HTML parse error — ${err instanceof Error ? err.message : err}`)
    }
  }

  if (validationErrors.length > 0) {
    console.error('❌ Validation failed:\n')
    validationErrors.forEach(e => console.error(`  ${e}`))
    process.exit(1)
  }

  console.log('✅ All entries valid\n')

  if (DRY_RUN) {
    // Show preview of what would be created
    console.log('📊 Preview (first 5 entries):\n')
    for (const entry of filteredEntries.slice(0, 5)) {
      const imageId = entry.imagePath ? imagesIdMap[entry.imagePath] : null
      const artistIds = entry.artists.map(s => artistSlugToId[s])
      console.log(`  ${entry.de.slug}`)
      console.log(`    DE title:  "${entry.de.title}"`)
      console.log(`    EN title:  "${entry.en.title}"`)
      console.log(`    Category:  ${entry.category}`)
      console.log(`    Artists:   ${artistIds.join(', ') || '(none)'}`)
      console.log(`    Image ID:  ${imageId ?? '(none)'}`)
      console.log(`    Published: ${entry.publishedAt}`)
      console.log()
    }
    console.log('─'.repeat(60))
    console.log(`📊 Dry Run Summary:`)
    console.log(`  Would create: ${filteredEntries.length} posts`)
    console.log(`  With images:  ${filteredEntries.filter(e => e.imagePath).length}`)
    console.log(`  News:         ${filteredEntries.filter(e => e.category === 'news').length}`)
    console.log(`  Projects:     ${filteredEntries.filter(e => e.category === 'projects').length}`)
    console.log('\n✅ Run without --dry-run to import.')
    process.exit(0)
  }

  // Full import
  let created = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < filteredEntries.length; i++) {
    const entry = filteredEntries[i]

    // Check for existing post by DE slug
    const existing = await payload.find({
      collection: 'posts',
      locale: 'de',
      where: { slug: { equals: entry.de.slug } },
      limit: 1,
      depth: 0,
    })

    if (existing.totalDocs > 0) {
      console.log(`  ⏭️  Skip [${i + 1}/${filteredEntries.length}]: "${entry.de.slug}" (already exists, ID ${existing.docs[0].id})`)
      skipped++
      continue
    }

    const imageId = entry.imagePath ? imagesIdMap[entry.imagePath] : undefined
    const artistIds = entry.artists.map(s => artistSlugToId[s]).filter(Boolean)

    const deContent = htmlToLexical(entry.de.contentHtml)
    const enContent = htmlToLexical(entry.en.contentHtml)

    try {
      // Step 1: Create with DE locale
      const created_doc = await payload.create({
        collection: 'posts',
        locale: 'de',
        overrideAccess: true,
        data: {
          title: entry.de.title,
          slug: entry.de.slug,
          content: deContent,
          categories: [entry.category],
          image: imageId ?? null,
          artists: artistIds,
          createdBy: 1,
          createdAt: entry.publishedAt,
          _status: 'published',
        },
      })

      // Step 2: Add EN locale
      await payload.update({
        collection: 'posts',
        id: created_doc.id,
        locale: 'en',
        overrideAccess: true,
        data: {
          title: entry.en.title,
          slug: entry.en.slug,
          content: enContent,
        },
      })

      console.log(`  ✅ [${i + 1}/${filteredEntries.length}] "${entry.de.slug}" (ID ${created_doc.id})`)
      created++
    } catch (err) {
      console.error(`  ❌ [${i + 1}/${filteredEntries.length}] "${entry.de.slug}": ${err instanceof Error ? err.message : err}`)
      errors++
    }
  }

  console.log('\n' + '─'.repeat(60))
  console.log('📊 Summary:')
  console.log(`  ✅ Created: ${created}`)
  console.log(`  ⏭️  Skipped: ${skipped}`)
  console.log(`  ❌ Errors:  ${errors}`)

  process.exit(errors > 0 ? 1 : 0)
}

main().catch(console.error)
