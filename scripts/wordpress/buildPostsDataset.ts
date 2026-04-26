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
  source: 'original' | 'matched' | 'fuzzy-match' | 'auto-translate'
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

  // Build attachment URL map from both XMLs (ID → URL)
  // DE is indexed first so EN doesn't overwrite DE-specific attachment IDs.
  // DE posts use DE attachment IDs for _thumbnail_id; EN posts use EN attachment IDs.
  const attachmentUrlById = new Map<number, string>()
  for (const item of deItems) {
    if (item['wp:post_type'] === 'attachment') {
      const attachmentUrl = (item as WPPost & { 'wp:attachment_url'?: string })['wp:attachment_url']
      if (attachmentUrl) {
        attachmentUrlById.set(item['wp:post_id'], attachmentUrl)
      }
    }
  }
  for (const item of enItems) {
    if (item['wp:post_type'] === 'attachment') {
      const attachmentUrl = (item as WPPost & { 'wp:attachment_url'?: string })['wp:attachment_url']
      if (attachmentUrl && !attachmentUrlById.has(item['wp:post_id'])) {
        attachmentUrlById.set(item['wp:post_id'], attachmentUrl)
      }
    }
  }
  console.log(`🖼️  Loaded ${attachmentUrlById.size} attachment URLs (DE + EN)\n`)

  // Filter to published posts within date range
  const isRecentPublished = (p: WPPost) => {
    const d = new Date(p['wp:post_date'])
    if (isNaN(d.getTime())) {
      console.warn(`⚠️  Invalid date on post "${p['wp:post_name']}"`)
      return false
    }
    return p['wp:post_type'] === 'post' && p['wp:status'] === 'publish' && d >= CUTOFF_DATE
  }

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
            source: enMatch.method === 'slug' ? 'matched' : 'fuzzy-match',
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

  // Two-pass matching: exact slug first, then fuzzy.
  // This prevents a fuzzy match from consuming a DE post that should be reserved for
  // an exact slug match on a later EN post, and prevents auto-translate fallback slugs
  // (which reuse the EN slug) from colliding with fuzzy-matched DE slugs.

  // Pass 1: resolve exact slug matches and lock in usedDeSlugs
  const exactDeMatchByEnSlug = new Map<string, { post: WPPost; method: 'slug' }>()
  for (const en of enProjects) {
    const bySlug = deBySlug.get(en['wp:post_name'])
    if (bySlug && !usedDeSlugs.has(bySlug['wp:post_name'])) {
      exactDeMatchByEnSlug.set(en['wp:post_name'], { post: bySlug, method: 'slug' })
      usedDeSlugs.add(bySlug['wp:post_name'])
    }
  }

  // EN posts without exact slug matches will fall back to using their own slug as the DE slug
  // (auto-translate). Reserve these slugs so fuzzy matching can't claim them.
  const autoTranslateSlugs = new Set(
    enProjects
      .filter((p) => !exactDeMatchByEnSlug.has(p['wp:post_name']))
      .map((p) => p['wp:post_name']),
  )

  // Pass 2: fuzzy match only for EN posts without exact match, using remaining available DE posts
  const fuzzyDeMatchByEnSlug = new Map<string, { post: WPPost; method: 'slug' | 'fuzzy' }>()
  for (const en of enProjects) {
    if (exactDeMatchByEnSlug.has(en['wp:post_name'])) continue
    // Must be recomputed each iteration — usedDeSlugs grows as fuzzy matches are locked in above
    // Exclude DE posts already used AND DE posts whose slug is reserved for auto-translate fallback
    const availableDePosts = dePosts.filter(
      (p) => !usedDeSlugs.has(p['wp:post_name']) && !autoTranslateSlugs.has(p['wp:post_name']),
    )
    const fuzzyMatch = findDeCounterpart(en, availableDePosts, new Map()) // slug pass already done
    if (fuzzyMatch) {
      fuzzyDeMatchByEnSlug.set(en['wp:post_name'], fuzzyMatch)
      usedDeSlugs.add(fuzzyMatch.post['wp:post_name'])
    }
  }

  for (const en of enProjects) {
    stats.projTotal++
    const enCategories = getCategories(en)
    const artists = getArtistSlugsFromCategories(enCategories)
    const imagePath = resolveImageFilename(en, attachmentUrlById)

    const deMatch = exactDeMatchByEnSlug.get(en['wp:post_name']) ?? fuzzyDeMatchByEnSlug.get(en['wp:post_name']) ?? null

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
      de: deMatch
        ? {
            title: String(deMatch.post.title),
            contentHtml: deMatch.post['content:encoded'] || '',
            slug: deMatch.post['wp:post_name'],
            source: deMatch.method === 'slug' ? 'matched' : 'fuzzy-match',
          }
        : {
            title: '',
            contentHtml: '',
            slug: en['wp:post_name'],
            source: 'auto-translate',
          },
    }

    if (deMatch) {
      stats.projMatched++
      if (verbose) console.log(`  ✅ ${en.title} → ${deMatch.post.title} (${deMatch.method})`)
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
