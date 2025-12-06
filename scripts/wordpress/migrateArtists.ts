/**
 * WordPress to Payload CMS Artist Migration Script
 *
 * Migrates artist data from WordPress XML exports (both EN and DE) into Payload CMS.
 * Handles localized content, media relationships, rich text conversion, and complex nested data.
 *
 * Prerequisites:
 * 1. Export ALL content from both WordPress instances:
 *    - EN: Tools > Export > Select "All content" > Download
 *    - DE: Tools > Export > Select "All content" > Download
 * 2. Place files in scripts/wordpress/data/all-en.xml and all-de.xml
 * 3. Run utils/uploadLocalMedia.ts first to upload all media files
 * 4. Ensure employees have been migrated first (contact persons)
 *
 * Usage:
 *   # Dry run (preview without changes)
 *   pnpm migrate:artists -- --dry-run
 *
 *   # Full migration
 *   pnpm migrate:artists
 *
 *   # Verbose output
 *   pnpm migrate:artists -- --verbose
 *
 * Features:
 * - Parses complex WordPress custom fields
 * - Handles EN/DE localized content (biography, quote)
 * - Converts HTML to Lexical rich text format
 * - Resolves media and employee relationships using pre-uploaded media
 * - Updates existing artists by slug (unique identifier)
 * - Dry-run mode for testing
 *
 * @see scripts/wordpress/helpers/* - Helper modules for parsing and mapping
 * @see scripts/wordpress/utils/uploadLocalMedia.ts - Uploads media files first
 */

import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { getPayload } from 'payload'
import { fileURLToPath } from 'url'
import config from '../../src/payload.config.js'
import { cleanWordPressFilename, findEmployeeByName, mapInstruments, validateAndCleanURL } from './utils/fieldMappers'
import { htmlToLexical } from './utils/lexicalConverter'
import { cleanBiographyHTML, extractFirstParagraph, parsePostMeta, parseWordPressXML } from './utils/xmlParser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface MigrationConfig {
  xmlPathEn: string
  xmlPathDe: string
  dryRun: boolean
  verbose: boolean
}

interface MigrationStats {
  total: number
  created: number
  updated: number
  skipped: number
  failed: number
  errors: Array<{ artist: string; error: string }>
}

interface PayloadArtistData {
  name: string
  slug: string
  instrument: string[]
  image?: number
  quote?: string
  biography: any // Lexical format
  homepageURL?: string
  externalCalendarURL?: string
  facebookURL?: string
  instagramURL?: string
  twitterURL?: string
  youtubeURL?: string
  spotifyURL?: string
  contactPersons?: number[]
  downloads?: {
    biographyPDF?: number
    galleryZIP?: number
  }
  // Add more fields as we build them out
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG: MigrationConfig = {
  xmlPathEn: './scripts/wordpress/data/all-en.xml',
  xmlPathDe: './scripts/wordpress/data/all-de.xml',
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Media ID maps loaded from images-id-map.json and documents-id-map.json
 * Maps filename → Payload media ID for each collection
 */
let imagesIdMap: Record<string, number> = {}
let documentsIdMap: Record<string, number> = {}

/**
 * Get WordPress attachment URL from all-en.xml
 * This is used to resolve _thumbnail_id to actual media filename
 */
const attachmentMap = new Map<string, string>()

/**
 * Initialize attachment map from all-en.xml
 * Maps attachment ID → URL
 */
async function loadAttachmentMap() {
  try {
    const allXmlPath = path.join(__dirname, 'data', 'all-en.xml')
    const items = await parseWordPressXML(allXmlPath)

    for (const item of items) {
      if (item['wp:post_type'] === 'attachment') {
        const attachmentId = item['wp:post_id']
        // @ts-ignore - wp:attachment_url is not in interface but exists for attachments
        const attachmentUrl = item['wp:attachment_url']
        if (attachmentId && attachmentUrl) {
          attachmentMap.set(String(attachmentId), String(attachmentUrl))
        }
      }
    }

    console.log(`✅ Loaded ${attachmentMap.size} attachment URLs from all-en.xml\n`)
  } catch (error) {
    console.warn('⚠️  Could not load attachment map from all-en.xml:', error instanceof Error ? error.message : error)
  }
}

/**
 * Find media ID from pre-uploaded media using the images-id-map.json or documents-id-map.json
 */
async function findMediaByFilename(
  filename: string | undefined,
  collection: 'images' | 'documents',
  dryRun: boolean = false,
): Promise<number | null> {
  if (!filename) return null
  if (dryRun) return null

  const idMap = collection === 'images' ? imagesIdMap : documentsIdMap

  // The filename might be URL-encoded in the map
  const encodedFilename = encodeURIComponent(filename)

  // Try both encoded and decoded versions
  let mediaId = idMap[filename] || idMap[encodedFilename]

  if (!mediaId) {
    console.warn(`  ⚠️  Media not found in ${collection} map: ${filename}`)
    return null
  }

  return mediaId
}

/**
 * Find media ID by WordPress media ID using attachment map
 */
async function findMediaId(wpMediaId: string | number, dryRun: boolean = false): Promise<number | null> {
  if (!wpMediaId) return null
  if (dryRun) return null

  // Look up the attachment URL from our map
  const attachmentUrl = attachmentMap.get(String(wpMediaId))

  if (!attachmentUrl) {
    console.warn(`  ⚠️  Attachment ID ${wpMediaId} not found in all-en.xml`)
    return null
  }

  // Extract filename from URL
  try {
    const url = new URL(attachmentUrl)
    let filename = url.pathname.split('/').pop()

    if (!filename) {
      console.warn(`  ⚠️  Could not extract filename from: ${attachmentUrl}`)
      return null
    }

    // Clean WordPress timestamp postfixes
    filename = cleanWordPressFilename(filename, CONFIG.verbose)

    // Artist featured images are always in 'images' collection
    return await findMediaByFilename(filename, 'images', dryRun)
  } catch (error) {
    console.warn(`  ⚠️  Invalid attachment URL: ${attachmentUrl}`)
    return null
  }
}

/**
 * Map WordPress artist data to Payload artist schema
 */
async function mapArtistData(
  wpArtist: any,
  _locale: 'en' | 'de',
  payload: any,
  dryRun: boolean = false,
): Promise<PayloadArtistData> {
  const meta = parsePostMeta(wpArtist['wp:postmeta'])
  const content = wpArtist['content:encoded'] || ''

  // Extract quote (first paragraph if it's quoted text)
  const quote = extractFirstParagraph(content)

  // Biography (remove quote if it was extracted)
  const biographyHTML = quote ? cleanBiographyHTML(content) : content
  const biography = htmlToLexical(biographyHTML)

  // Basic fields
  const artistData: PayloadArtistData = {
    name: wpArtist.title,
    slug: wpArtist['wp:post_name'],
    instrument: mapInstruments(meta.instruments as string),
    biography,
  }

  // Optional quote
  if (quote && quote.length > 0) {
    artistData.quote = quote
  }

  // Featured image
  if (meta._thumbnail_id) {
    const mediaId = await findMediaId(meta._thumbnail_id, dryRun)
    if (mediaId) {
      artistData.image = mediaId
    }
  }

  // Contact persons (max 2)
  const contactPersons: number[] = []
  if (meta['contact-person']) {
    const id = await findEmployeeByName(payload, meta['contact-person'])
    if (id) contactPersons.push(id)
  }
  if (meta['contact-person-2']) {
    const id = await findEmployeeByName(payload, meta['contact-person-2'])
    if (id) contactPersons.push(id)
  }
  if (contactPersons.length > 0) {
    artistData.contactPersons = contactPersons
  }

  // URLs
  artistData.homepageURL = validateAndCleanURL(meta.homepage)
  artistData.externalCalendarURL = validateAndCleanURL(meta.externe_konzertdaten)
  artistData.facebookURL = validateAndCleanURL(meta.facebook)
  artistData.instagramURL = validateAndCleanURL(meta.instagram)
  artistData.twitterURL = validateAndCleanURL(meta.twitter)
  artistData.youtubeURL = validateAndCleanURL(meta.youtube)
  artistData.spotifyURL = validateAndCleanURL(meta.spotify)

  // Downloads (biography PDF, gallery ZIP)
  // Look up from pre-uploaded media using filenames
  const downloads: { biographyPDF?: number; galleryZIP?: number } = {}

  if (!dryRun) {
    if (meta.biography_pdf && typeof meta.biography_pdf === 'string') {
      const pdfUrl = meta.biography_pdf.trim()
      if (pdfUrl) {
        try {
          let filename = new URL(pdfUrl).pathname.split('/').pop()
          if (filename) {
            filename = cleanWordPressFilename(filename, CONFIG.verbose)
            const pdfId = await findMediaByFilename(filename, 'documents', dryRun)
            if (pdfId) downloads.biographyPDF = pdfId
          }
        } catch (error) {
          console.warn(`  ⚠️  Invalid biography PDF URL: ${pdfUrl}`)
        }
      }
    }

    if (meta.gallery_zip_link && typeof meta.gallery_zip_link === 'string') {
      const zipUrl = meta.gallery_zip_link.trim()
      if (zipUrl) {
        try {
          let filename = new URL(zipUrl).pathname.split('/').pop()
          if (filename) {
            filename = cleanWordPressFilename(filename, CONFIG.verbose)
            const zipId = await findMediaByFilename(filename, 'documents', dryRun)
            if (zipId) downloads.galleryZIP = zipId
          }
        } catch (error) {
          console.warn(`  ⚠️  Invalid gallery ZIP URL: ${zipUrl}`)
        }
      }
    }
  }

  if (Object.keys(downloads).length > 0) {
    artistData.downloads = downloads
  }

  return artistData
}

/**
 * Migrate a single artist
 */
async function migrateArtist(
  name: string,
  enData: PayloadArtistData,
  deData: PayloadArtistData,
  payload: any,
  stats: MigrationStats,
): Promise<void> {
  try {
    if (CONFIG.verbose) {
      console.log(`\n📋 Artist data for ${name}:`)
      console.log(`  Slug: ${enData.slug}`)
      console.log(`  Instruments: ${enData.instrument.join(', ')}`)
      console.log(`  Has image: ${!!enData.image}`)
      console.log(`  Has quote: ${!!enData.quote}`)
      console.log(`  Has biography: ${!!enData.biography}`)
      console.log(`  Contact persons: ${enData.contactPersons?.length || 0}`)
      console.log(
        `  URLs: ${[enData.homepageURL, enData.facebookURL, enData.instagramURL, enData.twitterURL, enData.youtubeURL, enData.spotifyURL].filter(Boolean).length}`,
      )
      console.log(`  Has downloads: ${!!enData.downloads}`)
    }

    // Validate required fields
    if (!enData.instrument || enData.instrument.length === 0) {
      console.log(`⚠️  No instruments for ${name}, skipping`)
      stats.skipped++
      return
    }

    if (CONFIG.dryRun) {
      console.log(`✅ [DRY RUN] Would create/update: ${name}`)
      stats.created++
      return
    }

    // Check if artist already exists (by slug - unique identifier)
    const existing = await payload.find({
      collection: 'artists',
      where: {
        slug: { equals: enData.slug },
      },
      limit: 1,
    })

    if (existing.totalDocs > 0) {
      // Update existing artist in EN locale
      await payload.update({
        collection: 'artists',
        id: existing.docs[0].id,
        data: enData,
        locale: 'en',
      })

      // Update DE locale with localized fields
      // Use EN biography as fallback if DE biography is empty (avoids validation error)
      const deBiographyUpdate = deData.biography.root.children.length > 0 ? deData.biography : enData.biography

      await payload.update({
        collection: 'artists',
        id: existing.docs[0].id,
        data: {
          quote: deData.quote,
          biography: deBiographyUpdate,
        },
        locale: 'de',
      })

      if (deData.biography.root.children.length === 0) {
        console.warn(`  ⚠️  German biography empty, using English as fallback`)
      }

      // Update metadata for artist image and downloads
      if (enData.image) {
        try {
          await payload.update({
            collection: 'images',
            id: enData.image,
            data: { alt: name },
          })
        } catch (error) {
          console.warn(`  ⚠️  Failed to update image alt text:`, error instanceof Error ? error.message : error)
        }
      }
      if (enData.downloads?.biographyPDF) {
        try {
          await payload.update({
            collection: 'documents',
            id: enData.downloads.biographyPDF,
            data: { title: `${name} - Biography` },
          })
        } catch (error) {
          console.warn(`  ⚠️  Failed to update PDF title:`, error instanceof Error ? error.message : error)
        }
      }
      if (enData.downloads?.galleryZIP) {
        try {
          await payload.update({
            collection: 'documents',
            id: enData.downloads.galleryZIP,
            data: { title: `${name} - Gallery` },
          })
        } catch (error) {
          console.warn(`  ⚠️  Failed to update ZIP title:`, error instanceof Error ? error.message : error)
        }
      }

      console.log(`🔄 Updated: ${name}`)
      stats.updated++
    } else {
      // Create new artist in EN locale
      const created = await payload.create({
        collection: 'artists',
        data: enData,
        locale: 'en',
      })
      // Update DE locale with localized fields
      // Use EN biography as fallback if DE biography is empty (avoids validation error)
      const deBiography = deData.biography.root.children.length > 0 ? deData.biography : enData.biography

      await payload.update({
        collection: 'artists',
        id: created.id,
        data: {
          quote: deData.quote,
          biography: deBiography,
        },
        locale: 'de',
      })

      if (deData.biography.root.children.length === 0) {
        console.warn(`  ⚠️  German biography empty, using English as fallback`)
      }

      // Update metadata for artist image and downloads
      if (enData.image) {
        try {
          await payload.update({
            collection: 'images',
            id: enData.image,
            data: { alt: name },
          })
        } catch (error) {
          console.warn(`  ⚠️  Failed to update image alt text:`, error instanceof Error ? error.message : error)
        }
      }
      if (enData.downloads?.biographyPDF) {
        try {
          await payload.update({
            collection: 'documents',
            id: enData.downloads.biographyPDF,
            data: { title: `${name} - Biography` },
          })
        } catch (error) {
          console.warn(`  ⚠️  Failed to update PDF title:`, error instanceof Error ? error.message : error)
        }
      }
      if (enData.downloads?.galleryZIP) {
        try {
          await payload.update({
            collection: 'documents',
            id: enData.downloads.galleryZIP,
            data: { title: `${name} - Gallery` },
          })
        } catch (error) {
          console.warn(`  ⚠️  Failed to update ZIP title:`, error instanceof Error ? error.message : error)
        }
      }

      console.log(`✅ Created: ${name}`)
      stats.created++
    }
  } catch (error) {
    console.error(`❌ Failed: ${name}`, error)
    stats.failed++
    stats.errors.push({
      artist: name,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

// ============================================================================
// MAIN MIGRATION LOGIC
// ============================================================================

/**
 * Main migration runner
 */
async function runMigration() {
  console.log('\n🚀 WordPress Artist Migration\n')
  console.log(`Mode: ${CONFIG.dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`EN XML: ${CONFIG.xmlPathEn}`)
  console.log(`DE XML: ${CONFIG.xmlPathDe}\n`)

  const stats: MigrationStats = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  }

  try {
    // Initialize Payload
    const payload = await getPayload({ config })
    console.log('✅ Payload initialized\n')

    // Load media ID maps (images and documents)
    if (!CONFIG.dryRun) {
      try {
        const imagesMapPath = path.join(__dirname, 'data', 'images-id-map.json')
        const imagesMapContent = await fs.readFile(imagesMapPath, 'utf-8')
        imagesIdMap = JSON.parse(imagesMapContent)
        console.log(`✅ Loaded images ID map with ${Object.keys(imagesIdMap).length} entries`)

        const documentsMapPath = path.join(__dirname, 'data', 'documents-id-map.json')
        const documentsMapContent = await fs.readFile(documentsMapPath, 'utf-8')
        documentsIdMap = JSON.parse(documentsMapContent)
        console.log(`✅ Loaded documents ID map with ${Object.keys(documentsIdMap).length} entries\n`)
      } catch (error) {
        console.warn('⚠️  Could not load ID maps:', error instanceof Error ? error.message : error)
        console.warn('   Media uploads will be skipped. Run utils/uploadLocalMedia.ts first.\n')
      }

      // Load attachment map from all-en.xml
      await loadAttachmentMap()
    }

    // Load both XML files
    console.log('📥 Loading WordPress exports...')
    const allEnItems = await parseWordPressXML(CONFIG.xmlPathEn)
    const allDeItems = await parseWordPressXML(CONFIG.xmlPathDe)

    // Filter for only artist post type
    const enArtists = allEnItems.filter((item) => item['wp:post_type'] === 'artist')
    const deArtists = allDeItems.filter((item) => item['wp:post_type'] === 'artist')

    console.log(`✅ Loaded ${enArtists.length} EN artists`)
    console.log(`✅ Loaded ${deArtists.length} DE artists\n`)

    // Map EN artists by slug
    const enMap = new Map<string, any>()
    for (const wpArtist of enArtists) {
      if (wpArtist['wp:status'] === 'publish') {
        const slug = wpArtist['wp:post_name']
        const data = await mapArtistData(wpArtist, 'en', payload, CONFIG.dryRun)
        enMap.set(slug, data)
      }
    }

    // Map DE artists by slug
    const deMap = new Map<string, any>()
    for (const wpArtist of deArtists) {
      if (wpArtist['wp:status'] === 'publish') {
        const slug = wpArtist['wp:post_name']
        const data = await mapArtistData(wpArtist, 'de', payload, CONFIG.dryRun)
        deMap.set(slug, data)
      }
    }

    stats.total = enMap.size
    console.log(`📊 Found ${stats.total} artists to migrate\n`)

    // Migrate each artist
    let index = 0
    for (const [slug, enData] of enMap.entries()) {
      index++
      const name = enData.name
      console.log(`[${index}/${stats.total}] Processing: ${name}`)

      const deData = deMap.get(slug) || enData // Fallback to EN if DE not found
      await migrateArtist(name, enData, deData, payload, stats)
    }

    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('MIGRATION SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total:   ${stats.total}`)
    console.log(`Created: ${stats.created}`)
    console.log(`Updated: ${stats.updated}`)
    console.log(`Skipped: ${stats.skipped}`)
    console.log(`Failed:  ${stats.failed}`)

    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:')
      for (const err of stats.errors) {
        console.log(`  - ${err.artist}: ${err.error}`)
      }
    }

    if (CONFIG.dryRun) {
      console.log('\n💡 This was a DRY RUN. No changes were made.')
      console.log('   Run without --dry-run to perform actual migration.')
    }

    console.log('\n✅ Migration complete!\n')
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error)
    process.exit(1)
  }

  process.exit(0)
}

// ============================================================================
// RUN MIGRATION
// ============================================================================

await runMigration()
