# Posts Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate WordPress News and Projects posts (last 365 days) into Payload CMS with complete EN and DE locales, via a human-reviewable intermediate JSON dataset.

**Architecture:** Three phases — (1) `buildPostsDataset.ts` produces a reviewable JSON file from WordPress XML without touching the database; (2) `uploadLocalMedia.ts` is re-run to upload post featured images; (3) `importPostsDataset.ts` reads the JSON and creates posts in Payload with both locales.

**Tech Stack:** TypeScript, `fast-xml-parser`, Payload Local API, `htmlToLexical` (existing util), `images-id-map.json` (existing map updated by uploadLocalMedia)

**Design spec:** `docs/superpowers/specs/2026-04-25-posts-migration-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `scripts/wordpress/buildPostsDataset.ts` | **Create** | Phase 1: parse XML, match DE↔EN, output JSON dataset |
| `scripts/wordpress/importPostsDataset.ts` | **Create** | Phase 3: read JSON, create posts in Payload |
| `scripts/wordpress/data/posts-dataset.json` | **Generated** | Human-reviewable intermediate dataset |
| `scripts/wordpress/data/posts-image-urls.json` | **Generated** | List of post image URLs for uploadLocalMedia |
| `scripts/wordpress/utils/xmlParser.ts` | **Modify** | Add `parseWordPressXMLWithAttributes` (attribute-aware parser) |
| `package.json` | **Modify** | Add `build:posts-dataset` and `import:posts` scripts |

---

## Task 1: Add attribute-aware XML parser to xmlParser.ts

The existing `parseWordPressXML` uses `new XMLParser()` with no options, which drops XML attributes. Category tags use attributes (`@_domain`, `@_nicename`) to distinguish post categories from artist tags. We need an attribute-aware variant.

**Files:**
- Modify: `scripts/wordpress/utils/xmlParser.ts`

- [ ] **Read the existing file**

```bash
cat scripts/wordpress/utils/xmlParser.ts
```

- [ ] **Add `parseWordPressXMLWithAttributes` function after the existing `parseWordPressXML` function**

```typescript
/**
 * Parse WordPress XML file into items, preserving XML attributes.
 * Use this when category tags need to be distinguished by domain attribute.
 *
 * Categories in WordPress XML look like:
 *   <category domain="category" nicename="news"><![CDATA[News]]></category>
 *
 * With attributes preserved, each category is: { '#text': 'News', '@_domain': 'category', '@_nicename': 'news' }
 */
export async function parseWordPressXMLWithAttributes(filePath: string): Promise<WordPressItem[]> {
  const xmlData = await fs.readFile(filePath, 'utf8')
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    isArray: (name) => name === 'item' || name === 'wp:postmeta' || name === 'category',
  })
  const wpData = parser.parse(xmlData)
  const items = wpData.rss?.channel?.item || []
  return Array.isArray(items) ? items : [items]
}
```

- [ ] **Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors

- [ ] **Commit**

```bash
git add scripts/wordpress/utils/xmlParser.ts
git commit -m "feat(migration): add attribute-aware XML parser for post category handling"
```

---

## Task 2: Create `buildPostsDataset.ts`

This script reads both XML files, matches DE News posts to EN counterparts (and EN Projects posts to DE counterparts), resolves artist slugs and image filenames, then writes `posts-dataset.json`. No database access.

**Files:**
- Create: `scripts/wordpress/buildPostsDataset.ts`
- Create: `scripts/wordpress/data/posts-dataset.json` (generated output)

- [ ] **Create the file**

```typescript
/**
 * WordPress Posts Dataset Builder
 *
 * Reads WordPress XML exports and produces a human-reviewable posts-dataset.json
 * with matched EN/DE locales, artist slugs, and featured image filenames.
 *
 * This script does NOT write to the database. Review posts-dataset.json before
 * running importPostsDataset.ts.
 *
 * Usage:
 *   pnpm run build:posts-dataset
 *   pnpm run build:posts-dataset -- --verbose
 *
 * Output:
 *   scripts/wordpress/data/posts-dataset.json
 *
 * Source of truth: German XML (all-de.xml) for News posts
 * EN Projects posts are also included with DE matched where possible.
 *
 * Matching strategy:
 *   Pass 1 (exact):  wp:post_name slug match
 *   Pass 2 (fuzzy):  same artist category tag + published within 3 days
 *   Unmatched:       source set to "auto-translate"
 *
 * @see scripts/wordpress/importPostsDataset.ts - Imports the generated dataset
 * @see docs/superpowers/specs/2026-04-25-posts-migration-design.md - Design spec
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { cleanWordPressFilename } from './utils/fieldMappers.js'
import { parseWordPressXMLWithAttributes } from './utils/xmlParser.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============================================================================
// CONSTANTS
// ============================================================================

const DATA_DIR = path.join(__dirname, 'data')
const EN_XML = path.join(DATA_DIR, 'all-en.xml')
const DE_XML = path.join(DATA_DIR, 'all-de.xml')
const OUTPUT_PATH = path.join(DATA_DIR, 'posts-dataset.json')

/** Posts older than this date are excluded (365 days before most recent post 2026-04-17) */
const CUTOFF_DATE = new Date('2025-04-17T00:00:00.000Z')

/** Maximum days apart for fuzzy date matching between DE and EN posts */
const FUZZY_DATE_WINDOW_DAYS = 3

/**
 * Map WordPress category display names to Payload artist slugs.
 * These are the artist name tags used in WordPress post categories.
 */
const ARTIST_SLUG_MAP: Record<string, string> = {
  'Andreas Staier': 'andreas-staier',
  'Christian Zacharias': 'christian-zacharias',
  'Christian Poltéra': 'christian-poltera',
  'Claire Huangci': 'claire-huangci',
  'Conrad van Alphen': 'conrad-van-alphen',
  'Cuarteto SolTango': 'cuarteto-soltango',
  'Dominik Wagner': 'dominik-wagner',
  'Gustav Rivinius': 'gustav-rivinius',
  'Jean-Paul Gasparian': 'jean-paul-gasparian',
  'Jonian Ilias Kadesha': 'jonian-ilias-kadesha',
  'Marc Gruber': 'marc-gruber',
  'Marie-Luise Neunecker': 'marie-luise-neunecker',
  'Mario Venzago': 'mario-venzago',
  'Martin Stadtfeld': 'martin-stadtfeld',
  'Maurice Steger': 'maurice-steger',
  'Monet Quintett': 'monet-quintett',
  'Olga Scheps': 'olga-scheps',
  'Thomas Zehetmair': 'thomas-zehetmair',
  'Tianwa Yang': 'tianwa-yang',
  'Till Fellner': 'till-fellner',
  'Trio Gaspard': 'trio-gaspard',
  'Trio Jean Paul': 'trio-jean-paul',
  'Tzimon Barto': 'tzimon-barto',
  'Zehetmair Quartett': 'zehetmair-quartett',
  'Duo Thomas Zehetmair & Ruth Killius': 'duo-zehetmair-killius',
  'Duo Thomas Zehetmair and Ruth Killius': 'duo-zehetmair-killius',
  'Ruth Killius': 'ruth-killius',
  'Francesco Piemontesi': 'francesco-piemontesi',
}

/** WordPress category names that are NOT artist names */
const NON_ARTIST_CATEGORIES = new Set([
  'News', 'Projects', 'Home', 'Startseite', 'Calendar', 'Kalender',
  'Video', 'Diskography', 'Diskographie', 'Repertoire', 'Künstler', 'Artists',
])

// ============================================================================
// TYPES
// ============================================================================

interface WPPost {
  title: string
  'wp:post_name': string
  'wp:post_id': number
  'wp:post_date': string
  'wp:status': string
  'wp:post_type': string
  'content:encoded'?: string
  category?: WPCategory | WPCategory[]
  'wp:postmeta'?: WPMeta | WPMeta[]
}

interface WPCategory {
  '#text': string
  '@_domain': string
  '@_nicename': string
}

interface WPMeta {
  'wp:meta_key': string
  'wp:meta_value': string | number
}

interface WPAttachment {
  'wp:post_id': number
  'wp:post_type': string
  'wp:attachment_url'?: string
}

export interface PostDatasetEntry {
  wpSlug: string
  publishedAt: string
  category: 'news' | 'projects'
  artists: string[]
  imagePath: string | null
  en: PostLocaleData
  de: PostLocaleData
}

interface PostLocaleData {
  title: string
  contentHtml: string
  slug: string
  source: 'original' | 'matched' | 'auto-translate'
}

// ============================================================================
// HELPERS
// ============================================================================

function getCategories(post: WPPost): string[] {
  const cats = Array.isArray(post.category)
    ? post.category
    : post.category
      ? [post.category]
      : []
  return cats.map((c) => (typeof c === 'string' ? c : c['#text'] || '')).filter(Boolean)
}

function getArtistSlugsFromCategories(categories: string[]): string[] {
  const slugs: string[] = []
  const unknown: string[] = []
  for (const cat of categories) {
    if (NON_ARTIST_CATEGORIES.has(cat)) continue
    const slug = ARTIST_SLUG_MAP[cat]
    if (slug) {
      slugs.push(slug)
    } else {
      unknown.push(cat)
    }
  }
  if (unknown.length > 0) {
    console.warn(`  ⚠️  Unknown category tags (not in artist map): ${unknown.join(', ')}`)
  }
  return slugs
}

function getPostMeta(post: WPPost): Record<string, string> {
  const meta = Array.isArray(post['wp:postmeta'])
    ? post['wp:postmeta']
    : post['wp:postmeta']
      ? [post['wp:postmeta']]
      : []
  const result: Record<string, string> = {}
  for (const m of meta) {
    result[m['wp:meta_key']] = String(m['wp:meta_value'])
  }
  return result
}

function withinDays(a: Date, b: Date, days: number): boolean {
  return Math.abs(a.getTime() - b.getTime()) <= days * 24 * 60 * 60 * 1000
}

/**
 * Find EN counterpart for a DE post.
 * Pass 1: exact slug match.
 * Pass 2: same artist tag + published within FUZZY_DATE_WINDOW_DAYS days.
 */
function findEnCounterpart(
  dePost: WPPost,
  enPosts: WPPost[],
  enBySlug: Map<string, WPPost>,
): { post: WPPost; method: 'slug' | 'fuzzy' } | null {
  // Pass 1
  const bySlug = enBySlug.get(dePost['wp:post_name'])
  if (bySlug) return { post: bySlug, method: 'slug' }

  // Pass 2
  const deDate = new Date(dePost['wp:post_date'])
  const deArtists = getCategories(dePost).filter((c) => !NON_ARTIST_CATEGORIES.has(c))

  for (const en of enPosts) {
    if (!withinDays(new Date(en['wp:post_date']), deDate, FUZZY_DATE_WINDOW_DAYS)) continue
    const enArtists = getCategories(en).filter((c) => !NON_ARTIST_CATEGORIES.has(c))
    if (deArtists.some((a) => enArtists.includes(a))) return { post: en, method: 'fuzzy' }
  }

  return null
}

/**
 * Find DE counterpart for an EN post (same logic, reversed).
 */
function findDeCounterpart(
  enPost: WPPost,
  dePosts: WPPost[],
  deBySlug: Map<string, WPPost>,
): { post: WPPost; method: 'slug' | 'fuzzy' } | null {
  const bySlug = deBySlug.get(enPost['wp:post_name'])
  if (bySlug) return { post: bySlug, method: 'slug' }

  const enDate = new Date(enPost['wp:post_date'])
  const enArtists = getCategories(enPost).filter((c) => !NON_ARTIST_CATEGORIES.has(c))

  for (const de of dePosts) {
    if (!withinDays(new Date(de['wp:post_date']), enDate, FUZZY_DATE_WINDOW_DAYS)) continue
    const deArtists = getCategories(de).filter((c) => !NON_ARTIST_CATEGORIES.has(c))
    if (enArtists.some((a) => deArtists.includes(a))) return { post: de, method: 'fuzzy' }
  }

  return null
}

/**
 * Resolve featured image filename from WP attachment map.
 * Returns the cleaned filename or null if not found.
 */
function resolveImageFilename(
  post: WPPost,
  attachmentUrlById: Map<number, string>,
): string | null {
  const meta = getPostMeta(post)
  const thumbId = meta['_thumbnail_id']
  if (!thumbId) return null
  const url = attachmentUrlById.get(Number(thumbId))
  if (!url) return null
  const rawFilename = url.split('/').pop()
  if (!rawFilename) return null
  return cleanWordPressFilename(rawFilename)
}

// ============================================================================
// MAIN
// ============================================================================

async function buildPostsDataset(): Promise<void> {
  const verbose = process.argv.includes('--verbose')
  console.log('📋 Building posts dataset...\n')

  // Load XML
  console.log('📂 Parsing WordPress XML files...')
  const enItems = await parseWordPressXMLWithAttributes(EN_XML)
  const deItems = await parseWordPressXMLWithAttributes(DE_XML)
  console.log(`   EN: ${enItems.length} total items`)
  console.log(`   DE: ${deItems.length} total items\n`)

  // Build attachment URL map from EN XML (ID → URL)
  const attachmentUrlById = new Map<number, string>()
  for (const item of enItems) {
    if (item['wp:post_type'] === 'attachment' && (item as unknown as WPAttachment)['wp:attachment_url']) {
      attachmentUrlById.set(
        item['wp:post_id'],
        (item as unknown as WPAttachment)['wp:attachment_url']!,
      )
    }
  }
  console.log(`🖼️  Loaded ${attachmentUrlById.size} attachment URLs\n`)

  // Filter to published posts within date range
  const isRecentPublished = (p: WPPost) =>
    p['wp:post_type'] === 'post' &&
    p['wp:status'] === 'publish' &&
    new Date(p['wp:post_date']) >= CUTOFF_DATE

  const enPosts = enItems.filter(isRecentPublished) as WPPost[]
  const dePosts = deItems.filter(isRecentPublished) as WPPost[]

  // Filter to relevant categories
  const enNewsProj = enPosts.filter((p) => {
    const cats = getCategories(p)
    return cats.includes('News') || cats.includes('Projects')
  })
  const deNews = dePosts.filter((p) => getCategories(p).includes('News'))

  console.log(`📰 EN News+Projects posts (last 365d): ${enNewsProj.length}`)
  console.log(`📰 DE News posts (last 365d): ${deNews.length}\n`)

  // Build slug lookup maps
  const enBySlug = new Map(enNewsProj.map((p) => [p['wp:post_name'], p]))
  const deBySlug = new Map(deNews.map((p) => [p['wp:post_name'], p]))

  const dataset: PostDatasetEntry[] = []
  const stats = { deNewsTotal: 0, deNewsMatched: 0, deNewsUnmatched: 0, projTotal: 0, projMatched: 0, projUnmatched: 0 }

  // ── DE News posts (primary) ──
  console.log('Processing DE News posts...')
  for (const de of deNews) {
    stats.deNewsTotal++
    const deCategories = getCategories(de)
    const artists = getArtistSlugsFromCategories(deCategories)
    const imagePath = resolveImageFilename(de, attachmentUrlById)

    const enMatch = findEnCounterpart(de, enNewsProj, enBySlug)

    const entry: PostDatasetEntry = {
      wpSlug: de['wp:post_name'],
      publishedAt: new Date(de['wp:post_date']).toISOString(),
      category: 'news',
      artists,
      imagePath,
      de: {
        title: String(de.title),
        contentHtml: de['content:encoded'] || '',
        slug: de['wp:post_name'],
        source: 'original',
      },
      en: enMatch
        ? {
            title: String(enMatch.post.title),
            contentHtml: enMatch.post['content:encoded'] || '',
            slug: enMatch.post['wp:post_name'],
            source: 'matched',
          }
        : {
            title: '',
            contentHtml: '',
            slug: de['wp:post_name'],
            source: 'auto-translate',
          },
    }

    if (enMatch) {
      stats.deNewsMatched++
      if (verbose) console.log(`  ✅ ${de.title} → ${enMatch.post.title} (${enMatch.method})`)
    } else {
      stats.deNewsUnmatched++
      console.log(`  ⚠️  No EN match: "${de.title}"`)
    }

    dataset.push(entry)
  }

  // ── EN Projects posts ──
  console.log('\nProcessing EN Projects posts...')
  const enProjects = enNewsProj.filter((p) => getCategories(p).includes('Projects'))

  // Track which DE posts were already used for news matching (avoid double-use)
  const usedDeSlugs = new Set(dataset.map((e) => e.de.slug))

  for (const en of enProjects) {
    stats.projTotal++
    const enCategories = getCategories(en)
    const artists = getArtistSlugsFromCategories(enCategories)
    const imagePath = resolveImageFilename(en, attachmentUrlById)

    const deMatch = findDeCounterpart(en, dePosts, deBySlug)
    const deMatchPost = deMatch && !usedDeSlugs.has(deMatch.post['wp:post_name']) ? deMatch : null

    const entry: PostDatasetEntry = {
      wpSlug: en['wp:post_name'],
      publishedAt: new Date(en['wp:post_date']).toISOString(),
      category: 'projects',
      artists,
      imagePath,
      en: {
        title: String(en.title),
        contentHtml: en['content:encoded'] || '',
        slug: en['wp:post_name'],
        source: 'original',
      },
      de: deMatchPost
        ? {
            title: String(deMatchPost.post.title),
            contentHtml: deMatchPost.post['content:encoded'] || '',
            slug: deMatchPost.post['wp:post_name'],
            source: 'matched',
          }
        : {
            title: '',
            contentHtml: '',
            slug: en['wp:post_name'],
            source: 'auto-translate',
          },
    }

    if (deMatchPost) {
      stats.projMatched++
      if (verbose) console.log(`  ✅ ${en.title} → ${deMatchPost.post.title} (${deMatch!.method})`)
    } else {
      stats.projUnmatched++
      console.log(`  ⚠️  No DE match: "${en.title}"`)
    }

    dataset.push(entry)
  }

  // Write output
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(dataset, null, 2), 'utf-8')

  // Summary
  const autoTranslateCount = dataset.filter(
    (e) => e.en.source === 'auto-translate' || e.de.source === 'auto-translate',
  ).length
  const fullCount = dataset.length - autoTranslateCount

  console.log('\n✅ Dataset built successfully!')
  console.log(`\n📊 Summary:`)
  console.log(`   DE News posts:     ${stats.deNewsTotal} total, ${stats.deNewsMatched} matched EN, ${stats.deNewsUnmatched} unmatched`)
  console.log(`   EN Projects posts: ${stats.projTotal} total, ${stats.projMatched} matched DE, ${stats.projUnmatched} unmatched`)
  console.log(`   Total entries:     ${dataset.length}`)
  console.log(`   Both locales:      ${fullCount} (ready to import)`)
  console.log(`   Auto-translate:    ${autoTranslateCount} (skipped by default in import)`)
  console.log(`\n📄 Output: ${OUTPUT_PATH}`)
}

buildPostsDataset().catch((err) => {
  console.error('❌ Failed to build dataset:', err)
  process.exit(1)
})
```

- [ ] **Add script to package.json**

In `package.json`, add to the `"scripts"` object:

```json
"build:posts-dataset": "payload run scripts/wordpress/buildPostsDataset.ts"
```

- [ ] **Run the dataset builder**

```bash
pnpm run build:posts-dataset -- --verbose 2>&1 | head -80
```

Expected: summary showing ~89 DE News posts and ~79 EN Projects posts, with matched/unmatched counts

- [ ] **Inspect the output for a few entries**

```bash
node -e "const d=require('./scripts/wordpress/data/posts-dataset.json'); console.log(JSON.stringify(d.slice(0,2), null, 2))"
```

Expected: entries with `de.source: "original"`, `en.source: "matched"` or `"auto-translate"`, correct artists array, imagePath

- [ ] **Commit**

```bash
git add scripts/wordpress/buildPostsDataset.ts package.json
git commit -m "feat(migration): add buildPostsDataset script for posts migration"
```

---

## Task 3: Generate post image URL list and upload images

Post featured images need to be uploaded to Vercel Blob before import. We generate a supplementary `posts-image-urls.json` from the dataset's `imagePath` values, then run the existing `uploadLocalMedia.ts` (which reads `media-urls.json`) — but since `uploadLocalMedia` reads from `media-urls.json` with a specific shape, we need to add the post image entries to `media-urls.json` (or create a wrapper script).

The cleanest approach: write a small script `scripts/wordpress/addPostImagesToMediaUrls.ts` that appends post image entries to `media-urls.json`, then re-run `uploadLocalMedia`.

**Files:**
- Create: `scripts/wordpress/addPostImagesToMediaUrls.ts`

- [ ] **Check the shape of media-urls.json**

```bash
node -e "const d=require('./scripts/wordpress/data/media-urls.json'); console.log('Total:', d.length); console.log('Sample:', JSON.stringify(d[0], null, 2))"
```

Note the exact shape (fields: `url`, `source`, `field`, `filename`).

- [ ] **Create `addPostImagesToMediaUrls.ts`**

```typescript
/**
 * Add Post Image URLs to media-urls.json
 *
 * Reads posts-dataset.json and all-en.xml to find attachment URLs for
 * post featured images not already in media-urls.json.
 * Appends them to media-urls.json so uploadLocalMedia.ts can upload them.
 *
 * Usage:
 *   pnpm tsx scripts/wordpress/addPostImagesToMediaUrls.ts
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { cleanWordPressFilename } from './utils/fieldMappers.js'
import { parseWordPressXMLWithAttributes } from './utils/xmlParser.js'
import type { PostDatasetEntry } from './buildPostsDataset.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, 'data')

interface MediaUrlEntry {
  url: string
  source: string
  field: string
  filename: string
}

async function main(): Promise<void> {
  const datasetPath = path.join(DATA_DIR, 'posts-dataset.json')
  const mediaUrlsPath = path.join(DATA_DIR, 'media-urls.json')
  const enXmlPath = path.join(DATA_DIR, 'all-en.xml')

  const dataset: PostDatasetEntry[] = JSON.parse(await fs.readFile(datasetPath, 'utf-8'))
  const existing: MediaUrlEntry[] = JSON.parse(await fs.readFile(mediaUrlsPath, 'utf-8'))
  const existingFilenames = new Set(existing.map((e) => e.filename))

  // Build attachment URL lookup from EN XML
  const enItems = await parseWordPressXMLWithAttributes(enXmlPath)
  const attachmentByFilename = new Map<string, string>()
  for (const item of enItems) {
    if (item['wp:post_type'] === 'attachment') {
      const url = (item as Record<string, unknown>)['wp:attachment_url'] as string | undefined
      if (url) {
        const raw = url.split('/').pop()!
        const clean = cleanWordPressFilename(raw)
        attachmentByFilename.set(clean, url)
      }
    }
  }

  const toAdd: MediaUrlEntry[] = []
  for (const entry of dataset) {
    if (!entry.imagePath) continue
    if (existingFilenames.has(entry.imagePath)) continue
    const url = attachmentByFilename.get(entry.imagePath)
    if (!url) {
      console.warn(`  ⚠️  No URL found for image: ${entry.imagePath}`)
      continue
    }
    toAdd.push({ url, source: 'post-featured-image', field: 'image', filename: entry.imagePath })
    existingFilenames.add(entry.imagePath)
  }

  if (toAdd.length === 0) {
    console.log('✅ No new post images to add to media-urls.json')
    return
  }

  const updated = [...existing, ...toAdd]
  await fs.writeFile(mediaUrlsPath, JSON.stringify(updated, null, 2), 'utf-8')
  console.log(`✅ Added ${toAdd.length} post image entries to media-urls.json`)
  console.log('Next step: run uploadLocalMedia to upload them to Vercel Blob')
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
```

- [ ] **Run the script to add post images to media-urls.json**

```bash
pnpm tsx scripts/wordpress/addPostImagesToMediaUrls.ts
```

Expected: "Added N post image entries to media-urls.json"

- [ ] **Verify additions look correct**

```bash
node -e "const d=require('./scripts/wordpress/data/media-urls.json'); const posts=d.filter(e=>e.source==='post-featured-image'); console.log('Post image entries:', posts.length); console.log('Sample:', JSON.stringify(posts[0]))"
```

- [ ] **Run uploadLocalMedia to upload new post images**

> ⚠️ DATABASE OPERATION — confirm with user before running this step.

Check the database configuration first:

```bash
grep DATABASE_URI .env
```

Then ask user to confirm which database to use, then run:

```bash
pnpm tsx scripts/wordpress/utils/uploadLocalMedia.ts
```

Expected: uploads new post images, skips already-uploaded ones, updates `images-id-map.json`

- [ ] **Verify images-id-map.json has new entries**

```bash
node -e "const d=require('./scripts/wordpress/data/images-id-map.json'); console.log('Total images in map:', Object.keys(d).length)"
```

Expected: more than the previous 52 entries

- [ ] **Commit**

```bash
git add scripts/wordpress/addPostImagesToMediaUrls.ts
git commit -m "feat(migration): add script to append post images to media-urls.json"
```

---

## Task 4: Create `importPostsDataset.ts`

Reads `posts-dataset.json`, converts HTML to Lexical, resolves artist IDs and image IDs, and creates posts in Payload with both locales.

**Files:**
- Create: `scripts/wordpress/importPostsDataset.ts`

- [ ] **Create the file**

```typescript
/**
 * WordPress Posts Dataset Importer
 *
 * Reads posts-dataset.json and creates posts in Payload CMS with both EN and DE locales.
 * Requires buildPostsDataset.ts to have been run first.
 * Requires post images to have been uploaded (run addPostImagesToMediaUrls + uploadLocalMedia).
 *
 * Usage:
 *   # Dry run (preview without changes)
 *   pnpm run import:posts -- --dry-run
 *
 *   # Full import (skips auto-translate entries)
 *   pnpm run import:posts
 *
 *   # Include entries needing auto-translation (imports with available locale only, flags for review)
 *   pnpm run import:posts -- --include-auto-translate
 *
 *   # Verbose output
 *   pnpm run import:posts -- --verbose
 *
 * @see scripts/wordpress/buildPostsDataset.ts - Builds the dataset
 * @see docs/superpowers/specs/2026-04-25-posts-migration-design.md - Design spec
 */

import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { getPayload, type Payload } from 'payload'
import { fileURLToPath } from 'url'
import config from '../../src/payload.config.js'
import { htmlToLexical } from './utils/lexicalConverter.js'
import type { PostDatasetEntry } from './buildPostsDataset.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, 'data')

// ============================================================================
// TYPES
// ============================================================================

interface ImportConfig {
  dryRun: boolean
  verbose: boolean
  includeAutoTranslate: boolean
}

interface ImportStats {
  total: number
  created: number
  updated: number
  skipped: number
  failed: number
  errors: Array<{ slug: string; error: string }>
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Look up a Payload artist ID by slug.
 * Returns null if not found (logs a warning).
 */
async function findArtistIdBySlug(slug: string, payload: Payload): Promise<number | null> {
  const result = await payload.find({
    collection: 'artists',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  if (result.docs.length === 0) {
    console.warn(`  ⚠️  Artist not found in Payload: slug="${slug}"`)
    return null
  }
  return result.docs[0].id as number
}

// ============================================================================
// MAIN
// ============================================================================

async function importPostsDataset(): Promise<void> {
  const cfg: ImportConfig = {
    dryRun: process.argv.includes('--dry-run'),
    verbose: process.argv.includes('--verbose'),
    includeAutoTranslate: process.argv.includes('--include-auto-translate'),
  }

  console.log(`🚀 Importing posts dataset${cfg.dryRun ? ' (DRY RUN)' : ''}...\n`)

  // Load dataset
  const datasetPath = path.join(DATA_DIR, 'posts-dataset.json')
  const dataset: PostDatasetEntry[] = JSON.parse(await fs.readFile(datasetPath, 'utf-8'))

  // Load images-id-map
  const imagesMapPath = path.join(DATA_DIR, 'images-id-map.json')
  const imagesMap: Record<string, number> = JSON.parse(await fs.readFile(imagesMapPath, 'utf-8'))

  const payload = await getPayload({ config })

  // Pre-build artist slug → ID cache
  console.log('🎨 Pre-fetching artist IDs...')
  const artistSlugToId = new Map<string, number | null>()
  const allArtistSlugs = new Set(dataset.flatMap((e) => e.artists))
  for (const slug of allArtistSlugs) {
    artistSlugToId.set(slug, await findArtistIdBySlug(slug, payload))
  }
  console.log(`   Resolved ${[...artistSlugToId.values()].filter(Boolean).length}/${allArtistSlugs.size} artist slugs\n`)

  const stats: ImportStats = { total: 0, created: 0, updated: 0, skipped: 0, failed: 0, errors: [] }

  for (const entry of dataset) {
    stats.total++
    const needsAutoTranslate =
      entry.en.source === 'auto-translate' || entry.de.source === 'auto-translate'

    if (needsAutoTranslate && !cfg.includeAutoTranslate) {
      if (cfg.verbose) console.log(`⏭️  Skipping (auto-translate needed): ${entry.wpSlug}`)
      stats.skipped++
      continue
    }

    const artistIds = entry.artists
      .map((slug) => artistSlugToId.get(slug))
      .filter((id): id is number => id !== null && id !== undefined)

    const imageId = entry.imagePath ? (imagesMap[entry.imagePath] ?? null) : null
    if (entry.imagePath && !imageId) {
      console.warn(`  ⚠️  Image not in map: ${entry.imagePath} — importing without image`)
    }

    // When --include-auto-translate: use the available locale as fallback for missing one
    const enTitle = entry.en.title || entry.de.title
    const enContent = entry.en.contentHtml || entry.de.contentHtml
    const enSlug = entry.en.slug || entry.de.slug
    const deTitle = entry.de.title || entry.en.title
    const deContent = entry.de.contentHtml || entry.en.contentHtml
    const deSlug = entry.de.slug || entry.en.slug

    if (cfg.dryRun) {
      console.log(`[DRY RUN] Would create: "${enTitle}" / "${deTitle}" (${entry.category}) [${entry.publishedAt.split('T')[0]}]`)
      if (needsAutoTranslate) console.log(`          ⚠️  One locale is a fallback — needs manual review`)
      stats.created++
      continue
    }

    try {
      // Check if post already exists by EN slug
      const existing = await payload.find({
        collection: 'posts',
        where: { slug: { equals: enSlug } },
        locale: 'en',
        limit: 1,
        depth: 0,
      })

      const postData = {
        title: enTitle,
        slug: enSlug,
        content: htmlToLexical(enContent),
        categories: [entry.category],
        artists: artistIds,
        ...(imageId ? { image: imageId } : {}),
        createdBy: 1, // Eva Wagner (default)
        _status: 'published',
      }

      let postId: number

      if (existing.docs.length > 0) {
        postId = existing.docs[0].id as number
        await payload.update({
          collection: 'posts',
          id: postId,
          data: postData,
          locale: 'en',
        })
        stats.updated++
        if (cfg.verbose) console.log(`  ♻️  Updated: "${enTitle}"`)
      } else {
        const created = await payload.create({
          collection: 'posts',
          data: postData,
          locale: 'en',
        })
        postId = created.id as number
        stats.created++
        if (cfg.verbose) console.log(`  ✅ Created: "${enTitle}"`)
      }

      // Patch DE locale
      await payload.update({
        collection: 'posts',
        id: postId,
        data: {
          title: deTitle,
          slug: deSlug,
          content: htmlToLexical(deContent),
        },
        locale: 'de',
      })

      if (needsAutoTranslate) {
        console.log(`  ⚠️  "${enTitle}" — one locale used as fallback, needs manual review`)
      }
    } catch (err) {
      stats.failed++
      const msg = err instanceof Error ? err.message : String(err)
      stats.errors.push({ slug: enSlug, error: msg })
      console.error(`  ❌ Failed: "${enSlug}" — ${msg}`)
    }
  }

  // Summary
  console.log('\n📊 Import complete:')
  console.log(`   Total:   ${stats.total}`)
  console.log(`   Created: ${stats.created}`)
  console.log(`   Updated: ${stats.updated}`)
  console.log(`   Skipped: ${stats.skipped} (auto-translate needed)`)
  console.log(`   Failed:  ${stats.failed}`)

  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:')
    stats.errors.forEach(({ slug, error }) => console.log(`   ${slug}: ${error}`))
  }

  process.exit(stats.failed > 0 ? 1 : 0)
}

importPostsDataset().catch((err) => {
  console.error('❌ Import failed:', err)
  process.exit(1)
})
```

- [ ] **Add script to package.json**

In `package.json`, add to the `"scripts"` object:

```json
"import:posts": "payload run scripts/wordpress/importPostsDataset.ts"
```

- [ ] **Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors

- [ ] **Commit**

```bash
git add scripts/wordpress/importPostsDataset.ts package.json
git commit -m "feat(migration): add importPostsDataset script"
```

---

## Task 5: Dry run and validation

Verify the full pipeline end-to-end before any real database writes.

**Files:** none new

- [ ] **Run the dataset builder**

```bash
pnpm run build:posts-dataset
```

Review the summary output. Confirm the counts match expectations:
- ~89 DE News entries
- ~79 EN Projects entries
- ~19 auto-translate entries
- ~149 entries with both locales

- [ ] **Spot-check the dataset JSON**

```bash
node -e "
const d = require('./scripts/wordpress/data/posts-dataset.json');
console.log('Total entries:', d.length);
const autoTrans = d.filter(e => e.en.source === 'auto-translate' || e.de.source === 'auto-translate');
console.log('Auto-translate entries:', autoTrans.length);
console.log('Sample auto-translate:', JSON.stringify(autoTrans[0], null, 2));
const full = d.filter(e => e.en.source !== 'auto-translate' && e.de.source !== 'auto-translate');
console.log('Full bilingual entries:', full.length);
console.log('Sample full entry:', JSON.stringify(full[0], null, 2));
"
```

Verify: titles look correct in both languages, `imagePath` values look like image filenames, `artists` arrays contain valid slugs.

- [ ] **Dry-run the import**

```bash
pnpm run import:posts -- --dry-run --verbose
```

Expected: lists all posts that would be created, confirms no errors thrown, shows skipped auto-translate entries

- [ ] **Verify the `createdBy` default exists**

```bash
node -e "
require('dotenv/config');
const { getPayload } = require('payload');
// Note: this is a quick check — just confirm employee ID 1 exists in the Payload admin
console.log('Check Payload admin: does employee with ID 1 (Eva Wagner) exist?');
"
```

If employee ID 1 doesn't exist, update the `createdBy: 1` default in `importPostsDataset.ts` to the correct ID.

---

## Task 6: Full import

> ⚠️ DATABASE OPERATION — follow the mandatory verification process from AGENTS.md before running.

- [ ] **Verify database environment**

```bash
grep DATABASE_URI .env
```

Confirm with user whether to use local or remote database.

- [ ] **Run the import**

```bash
pnpm run import:posts -- --verbose
```

Expected: creates ~149 posts with both locales, skips ~19 auto-translate entries, 0 failures

- [ ] **Verify in Payload admin**

Open the Payload admin panel → Posts collection. Confirm:
- Posts are visible in both EN and DE
- Categories are set correctly (news / projects)
- Artists are linked
- Featured images appear where expected

- [ ] **Commit final state**

```bash
git add scripts/wordpress/data/posts-dataset.json scripts/wordpress/data/images-id-map.json
git commit -m "feat(migration): add generated posts dataset and updated images-id-map"
```

---

## Notes

- `posts-dataset.json` is intentionally committed — it's the human-reviewable record of what was migrated
- Auto-translate entries (~19) are skipped by default; to handle them, fill in the missing locale content manually in `posts-dataset.json` (change `source` from `"auto-translate"` to `"matched"`) then re-run the import
- The `addPostImagesToMediaUrls.ts` script is idempotent — safe to re-run
- All scripts support `--dry-run` for safe previewing
