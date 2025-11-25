/**
 * WordPress to Payload CMS Repertoire Migration Script
 *
 * Migrates repertoire posts from WordPress XML exports into
 * existing Payload artist records.
 *
 * NOTE: Discography posts are NOT migrated by this script.
 * Discographies will be handled separately via the Recordings collection.
 *
 * Prerequisites:
 * 1. Artists must already be migrated (run migrateArtists.ts first)
 * 2. WordPress XML exports in scripts/wordpress/data/all-en.xml and all-de.xml
 *
 * Usage:
 *   # Preview mode (dry run)
 *   pnpm tsx scripts/wordpress/migrateRepertoire.ts --dry-run
 *
 *   # Verbose output
 *   pnpm tsx scripts/wordpress/migrateRepertoire.ts --verbose
 *
 *   # Full migration
 *   pnpm tsx scripts/wordpress/migrateRepertoire.ts
 *
 * Features:
 * - Handles multiple repertoire sections per artist
 * - Converts HTML to Lexical rich text format
 * - Preserves EN/DE localization
 * - Idempotent (can be re-run safely)
 *
 * @see scripts/wordpress/README.md
 */

import config from '@payload-config'
import 'dotenv/config'
import { XMLParser } from 'fast-xml-parser'
import * as fs from 'fs/promises'
import path from 'path'
import { getPayload } from 'payload'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  xmlPathEn: path.join(__dirname, 'data', 'all-en.xml'),
  xmlPathDe: path.join(__dirname, 'data', 'all-de.xml'),
}

interface MigrationStats {
  total: number
  updated: number
  skipped: number
  failed: number
  errors: Array<{ artist: string; error: string }>
}

interface RepertoirePost {
  title: string
  slug: string
  content: string
  artistCategory: string
  section: string
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract section name from post title
 */
function extractSectionFromTitle(title: string): string {
  // Try to extract section after "Repertoire"
  const match = title.match(/(?:Repertoire|Repertoir)\s+(.+?)$/i)
  if (match) {
    return match[1].trim()
  }

  // Check for section in middle
  const match2 = title.match(/(?:Repertoire|Repertoir)\s+(\w+)/i)
  if (match2) {
    return match2[1].trim()
  }

  // Generic fallback
  return 'General'
}

// ============================================================================
// XML PARSING
// ============================================================================

/**
 * Load and parse XML file for repertoire posts only
 */
async function loadPostsFromXML(filePath: string): Promise<any[]> {
  const xmlData = await fs.readFile(filePath, 'utf8')

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '_',
  })
  const parsed = parser.parse(xmlData)

  const items = parsed.rss.channel.item || []
  const posts: any[] = []

  for (const item of items) {
    const postType = item['wp:post_type'] || ''
    if (postType !== 'post') continue

    const categories = Array.isArray(item.category) ? item.category : item.category ? [item.category] : []
    const categoryNames = categories
      .map((cat: any) => (typeof cat === 'string' ? cat : cat['#text'] || cat))
      .filter(Boolean)

    // Only match repertoire posts
    const isRepertoire = categoryNames.some(
      (c: string) => c.toLowerCase().includes('repertoire') || c.toLowerCase().includes('repertoir'),
    )

    if (!isRepertoire) continue

    // Find artist category (the one that's not "Repertoire")
    const artistCategory = categoryNames.find(
      (c: string) =>
        !c.toLowerCase().includes('repertoire') && !c.toLowerCase().includes('repertoir') && c !== 'Projects', // Exclude "Projects" category
    )

    if (!artistCategory) {
      if (CONFIG.verbose) {
        console.log(`  ⚠️  No artist category found for: ${item.title}`)
      }
      continue
    }

    posts.push({
      title: item.title || '',
      slug: item['wp:post_name'] || '',
      content: item['content:encoded'] || '',
      artistCategory,
      section: extractSectionFromTitle(item.title || ''),
    })
  }

  return posts
}

/**
 * Merge EN and DE posts for the same artist
 */
function mergeLocalizedPosts(enPosts: any[], dePosts: any[]): Map<string, { en: any[]; de: any[] }> {
  const merged = new Map<string, { en: any[]; de: any[] }>()

  // Add EN posts
  for (const post of enPosts) {
    if (!merged.has(post.artistCategory)) {
      merged.set(post.artistCategory, { en: [], de: [] })
    }
    merged.get(post.artistCategory)!.en.push(post)
  }

  // Add DE posts
  for (const post of dePosts) {
    if (!merged.has(post.artistCategory)) {
      merged.set(post.artistCategory, { en: [], de: [] })
    }
    merged.get(post.artistCategory)!.de.push(post)
  }

  return merged
}

// ============================================================================
// MAIN MIGRATION LOGIC
// ============================================================================

async function runMigration() {
  console.log('\n🚀 WordPress Repertoire Migration\n')
  console.log(`Mode: ${CONFIG.dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`EN XML: ${CONFIG.xmlPathEn}`)
  console.log(`DE XML: ${CONFIG.xmlPathDe}\n`)

  const stats: MigrationStats = {
    total: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  }

  try {
    // Initialize Payload
    const payload = await getPayload({ config })
    console.log('✅ Payload initialized\n')

    // Load repertoires only
    console.log('🎵 Loading repertoire posts...')
    const repEN = await loadPostsFromXML(CONFIG.xmlPathEn)
    const repDE = await loadPostsFromXML(CONFIG.xmlPathDe)
    const repByArtist = mergeLocalizedPosts(repEN, repDE)
    console.log(`   Found ${repEN.length} EN + ${repDE.length} DE = ${repByArtist.size} artists\n`)

    // Process each artist
    stats.total = repByArtist.size

    console.log(`\n📊 Processing ${stats.total} artists...\n`)

    for (const artistName of repByArtist.keys()) {
      try {
        // Special case: "Duo Thomas Zehetmair and Ruth Killius" or "Duo Thomas Zehetmair & Ruth Killius"
        // Add repertoire to both Thomas Zehetmair and Ruth Killius
        const isDuo =
          artistName.includes('Duo Thomas Zehetmair') ||
          artistName === 'Duo Thomas Zehetmair and Ruth Killius' ||
          artistName === 'Duo Thomas Zehetmair & Ruth Killius' ||
          artistName === 'Duo Thomas Zehetmair &amp; Ruth Killius'

        const artistsToUpdate: string[] = isDuo ? ['Thomas Zehetmair', 'Ruth Killius'] : [artistName]

        for (const targetArtistName of artistsToUpdate) {
          // Find artist in Payload
          const artistResult = await payload.find({
            collection: 'artists',
            where: {
              name: { equals: targetArtistName },
            },
            limit: 1,
          })

          if (artistResult.totalDocs === 0) {
            console.log(`⚠️  Artist not found: ${targetArtistName}`)
            if (!isDuo) {
              stats.skipped++
            }
            continue
          }

          const artist = artistResult.docs[0]
          console.log(`\n📝 Processing: ${targetArtistName} (ID: ${artist.id})${isDuo ? ' [from Duo]' : ''}`)

          // Process repertoire
          const reps = repByArtist.get(artistName)
          if (reps && (reps.en.length > 0 || reps.de.length > 0)) {
            console.log(`   🎵 ${reps.en.length} EN + ${reps.de.length} DE repertoires`)

            const repertoireArray: any[] = []

            // Create a merged map by section
            const repertoireBySection = new Map<string, { en: any | null; de: any | null }>()

            for (const enPost of reps.en) {
              const section = enPost.section
              if (!repertoireBySection.has(section)) {
                repertoireBySection.set(section, { en: null, de: null })
              }
              repertoireBySection.get(section)!.en = enPost
            }

            for (const dePost of reps.de) {
              const section = dePost.section
              if (!repertoireBySection.has(section)) {
                repertoireBySection.set(section, { en: null, de: null })
              }
              repertoireBySection.get(section)!.de = dePost
            }

            // Build repertoire entries - EN locale
            const { htmlToLexical } = await import('./utils/lexicalConverter.js')
            for (const [sectionTitle, posts] of repertoireBySection) {
              repertoireArray.push({
                title: sectionTitle,
                content: posts.en ? htmlToLexical(posts.en.content) : htmlToLexical(posts.de?.content || ''),
              })

              console.log(`      - ${sectionTitle}`)
            }

            // Update artist with EN repertoire
            if (!CONFIG.dryRun) {
              await payload.update({
                collection: 'artists',
                id: artist.id,
                data: { repertoire: repertoireArray },
                locale: 'en',
              })

              // Now update DE locale
              if (reps.de.length > 0) {
                const deRepertoireArray: any[] = []
                for (const [sectionTitle, posts] of repertoireBySection) {
                  if (posts.de) {
                    deRepertoireArray.push({
                      title: sectionTitle,
                      content: htmlToLexical(posts.de.content),
                    })
                  }
                }

                if (deRepertoireArray.length > 0) {
                  await payload.update({
                    collection: 'artists',
                    id: artist.id,
                    data: { repertoire: deRepertoireArray },
                    locale: 'de',
                  })
                }
              }

              console.log(`   ✅ Updated in Payload`)
            } else {
              console.log(
                `   🔍 DRY RUN - Would update:`,
                JSON.stringify({ repertoire: repertoireArray }, null, 2).substring(0, 200),
              )
            }
          }

          if (!isDuo) {
            stats.updated++
          }
        }

        if (isDuo) {
          stats.updated++
        }
      } catch (error) {
        console.error(`❌ Failed: ${artistName}`, error)
        stats.failed++
        stats.errors.push({
          artist: artistName,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Summary
    console.log('\n\n📊 Migration Summary:')
    console.log(`  Total artists: ${stats.total}`)
    console.log(`  ✅ Updated: ${stats.updated}`)
    console.log(`  ⏭️  Skipped: ${stats.skipped}`)
    console.log(`  ❌ Failed: ${stats.failed}`)

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors:')
      for (const err of stats.errors) {
        console.log(`  - ${err.artist}: ${err.error}`)
      }
    }

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
