/**
 * WordPress to Payload CMS Employee Migration Script
 *
 * Migrates employee data from WordPress XML exports (both EN and DE) into Payload CMS.
 * Handles localized content, media relationships, and contact information parsing.
 *
 * Prerequisites:
 * 1. Export ALL content from both WordPress instances:
 *    - EN: Tools > Export > Select "All content" > Download
 *    - DE: Tools > Export > Select "All content" > Download
 * 2. Place files in scripts/wordpress/data/all-en.xml and all-de.xml
 * 3. Ensure media has been migrated first (employee images)
 *
 * Usage:
 *   # Dry run (preview without changes)
 *   pnpm payload run tmp/migrateEmployees.ts -- --dry-run
 *
 *   # Full migration
 *   pnpm payload run tmp/migrateEmployees.ts
 *
 *   # Verbose output
 *   pnpm payload run tmp/migrateEmployees.ts -- --verbose
 *
 * Features:
 * - Parses contact info from content (title, email, phone, mobile)
 * - Handles EN/DE localized titles
 * - Uses XML order for display order (1-indexed)
 * - Resolves media relationships
 * - Updates existing employees by email (unique identifier)
 * - Dry-run mode for testing
 *
 * @see docs/plans/wordpress-migration-strategy.md
 */

import config from '@payload-config'
import { XMLParser } from 'fast-xml-parser'
import * as fs from 'fs/promises'
import path from 'path'
import { getPayload } from 'payload'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Environment variables are automatically loaded by Payload CLI

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface WordPressEmployee {
  title: string
  'wp:post_name': string
  'wp:menu_order': number
  'wp:postmeta'?:
    | Array<{ 'wp:meta_key': string; 'wp:meta_value': string }>
    | { 'wp:meta_key': string; 'wp:meta_value': string }
  'content:encoded'?: string
  'wp:status': string
}

interface ParsedEmployeeData {
  title: string
  email: string
  phone: string
  mobile: string
}

interface PayloadEmployeeData {
  name: string
  title: string
  email: string
  phone: string
  mobile: string
  order: number
  image?: number
}

interface MigrationStats {
  total: number
  created: number
  updated: number
  skipped: number
  failed: number
  errors: Array<{ employee: string; error: string }>
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  xmlPathEn: './scripts/wordpress/data/all-en.xml',
  xmlPathDe: './scripts/wordpress/data/all-de.xml',
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  defaultLocale: 'en' as const,
  locales: ['en', 'de'] as const,
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Media ID map loaded from media-id-map.json
 * Maps filename → Payload media ID
 */
let mediaIdMap: Record<string, number> = {}

/**
 * Get WordPress attachment URL from all-en.xml
 * This is used to resolve _thumbnail_id to actual media filename
 */
const attachmentMap = new Map<string, string>()

/**
 * Load media ID mapping from media-id-map.json
 */
async function loadMediaIdMap() {
  try {
    const mapPath = path.join(__dirname, 'data', 'media-id-map.json')
    const mapData = await fs.readFile(mapPath, 'utf-8')
    mediaIdMap = JSON.parse(mapData)
    console.log(`✅ Loaded media ID map with ${Object.keys(mediaIdMap).length} entries\n`)
  } catch (error) {
    console.warn('⚠️  Could not load media-id-map.json:', error instanceof Error ? error.message : error)
  }
}

/**
 * Load attachment map from all-en.xml
 * Maps attachment ID → URL
 */
async function loadAttachmentMap() {
  try {
    const xmlData = await fs.readFile(CONFIG.xmlPathEn, 'utf8')
    const parser = new XMLParser()
    const wpData = parser.parse(xmlData)
    const items = wpData.rss?.channel?.item || []
    const allItems = Array.isArray(items) ? items : [items]

    for (const item of allItems) {
      if (item['wp:post_type'] === 'attachment') {
        const attachmentId = item['wp:post_id']
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
 * Find media ID from pre-uploaded media using the media-id-map.json
 */
function findMediaByFilename(filename: string | undefined): number | null {
  if (!filename) return null

  // Try exact match first
  if (mediaIdMap[filename]) {
    return mediaIdMap[filename]
  }

  // Try URL-decoded filename
  try {
    const decoded = decodeURIComponent(filename)
    if (mediaIdMap[decoded]) {
      return mediaIdMap[decoded]
    }
  } catch {
    // Ignore decode errors
  }

  return null
}

/**
 * Find media ID by resolving thumbnail ID to URL, then filename
 */
function findMediaId(thumbnailId: string | number | undefined): number | null {
  if (!thumbnailId) return null

  // Look up attachment URL from ID
  const attachmentUrl = attachmentMap.get(String(thumbnailId))
  if (!attachmentUrl) {
    if (CONFIG.verbose) {
      console.log(`  ⚠️  Attachment ID ${thumbnailId} not found in all-en.xml`)
    }
    return null
  }

  // Extract filename from URL
  const filename = attachmentUrl.split('/').pop()
  if (!filename) return null

  // Look up Payload media ID
  const mediaId = findMediaByFilename(filename)
  if (!mediaId && CONFIG.verbose) {
    console.log(`  ⚠️  Media not found in map: ${filename}`)
  }

  return mediaId
}

/**
 * Parse WordPress postmeta into key-value object
 */
function parsePostMeta(postmeta: any): Record<string, string> {
  if (!postmeta) return {}

  const metaArray = Array.isArray(postmeta) ? postmeta : [postmeta]
  const result: Record<string, string> = {}

  for (const meta of metaArray) {
    const key = meta['wp:meta_key']
    const value = meta['wp:meta_value']
    if (key && value) {
      result[key] = String(value)
    }
  }

  return result
}

/**
 * Parse employee contact info from WordPress content
 *
 * Expected format:
 * <strong>Managing Director</strong>
 * <a href="mailto:e.wagner@ks-schoerke.de">e.wagner@ks-schoerke.de</a>
 * Phone: +49 (0)611-50 58 90 51
 * Mobile: +49(0)172 821 32 58
 */
function parseEmployeeContent(content: string): ParsedEmployeeData {
  const result: ParsedEmployeeData = {
    title: '',
    email: '',
    phone: '',
    mobile: '',
  }

  if (!content) return result

  // Extract title (between <strong> tags, handle newlines with 's' flag)
  const titleMatch = content.match(/<strong>(.*?)<\/strong>/is)
  if (titleMatch) {
    result.title = titleMatch[1].trim()
  }

  // Extract email - prefer the VISIBLE text over mailto: link
  // First try to get the text content of <a> tag
  const emailLinkMatch = content.match(/<a[^>]*href="mailto:([^"]+)"[^>]*>([^<]+)<\/a>/i)
  if (emailLinkMatch) {
    // Use the visible text (second capture group), not the mailto
    result.email = emailLinkMatch[2].trim()
  } else {
    // Fallback to any email pattern
    const emailMatch = content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
    if (emailMatch) {
      result.email = emailMatch[1].trim()
    }
  }

  // Extract phone (Phone: or Telefon:)
  const phoneMatch = content.match(/(?:Phone|Telefon):\s*([+\d\s()-]+?)(?:\n|<|$)/i)
  if (phoneMatch) {
    result.phone = phoneMatch[1].trim()
  }

  // Extract mobile (Mobile: or Mobil:)
  const mobileMatch = content.match(/(?:Mobile|Mobil):\s*([+\d\s()-]+?)(?:\n|<|$)/i)
  if (mobileMatch) {
    result.mobile = mobileMatch[1].trim()
  }

  return result
}

/**
 * Map WordPress employee data to Payload employee schema
 */
async function mapEmployeeData(
  wpEmployee: WordPressEmployee,
  locale: 'en' | 'de',
  xmlOrder: number,
  payload: any,
): Promise<PayloadEmployeeData> {
  const meta = parsePostMeta(wpEmployee['wp:postmeta'])
  const parsed = parseEmployeeContent(wpEmployee['content:encoded'] || '')

  // Extract base fields
  const employeeData: PayloadEmployeeData = {
    name: wpEmployee.title,
    title: parsed.title,
    email: parsed.email,
    phone: parsed.phone,
    mobile: parsed.mobile,
    order: xmlOrder, // Use position in XML (1-indexed)
  }

  // Featured image (resolve thumbnail ID to Payload media ID)
  const featuredImageId = meta['_thumbnail_id']
  if (featuredImageId) {
    const mediaId = findMediaId(featuredImageId)
    if (mediaId) {
      employeeData.image = mediaId
    }
  }

  return employeeData
}

// ============================================================================
// MAIN MIGRATION LOGIC
// ============================================================================

/**
 * Load and parse XML file, filtering for employee post type
 */
async function loadXML(filePath: string): Promise<WordPressEmployee[]> {
  const xmlData = await fs.readFile(filePath, 'utf8')
  const parser = new XMLParser()
  const wpData = parser.parse(xmlData)

  const items = wpData.rss?.channel?.item || []
  const allItems = Array.isArray(items) ? items : [items]

  // Filter for only employee post type
  return allItems.filter((item) => item['wp:post_type'] === 'employee')
}

/**
 * Merge EN and DE employee data by name
 */
function mergeEmployeeData(
  enEmployees: Map<string, { data: PayloadEmployeeData; wpData: WordPressEmployee }>,
  deEmployees: Map<string, { data: PayloadEmployeeData; wpData: WordPressEmployee }>,
): Map<string, { en: PayloadEmployeeData; de: PayloadEmployeeData; email: string }> {
  const merged = new Map<string, { en: PayloadEmployeeData; de: PayloadEmployeeData; email: string }>()

  // Start with EN employees
  for (const [name, { data }] of enEmployees) {
    merged.set(name, {
      en: data,
      de: data, // Default to EN if DE not found
      email: data.email,
    })
  }

  // Merge in DE data
  for (const [name, { data }] of deEmployees) {
    const existing = merged.get(name)
    if (existing) {
      existing.de = data
    } else {
      // DE-only employee (shouldn't happen, but handle gracefully)
      merged.set(name, {
        en: data,
        de: data,
        email: data.email,
      })
    }
  }

  return merged
}

/**
 * Migrate a single employee
 */
async function migrateEmployee(
  name: string,
  enData: PayloadEmployeeData,
  deData: PayloadEmployeeData,
  payload: any,
  stats: MigrationStats,
): Promise<void> {
  try {
    if (CONFIG.verbose) {
      console.log(`\n📋 Employee data for ${name}:`)
      console.log(`  EN Title: ${enData.title}`)
      console.log(`  DE Title: ${deData.title}`)
      console.log(`  Email: ${enData.email}`)
      console.log(`  Phone: ${enData.phone}`)
      console.log(`  Mobile: ${enData.mobile}`)
      console.log(`  Order: ${enData.order}`)
    }

    // Validate required fields
    if (!enData.email || !enData.phone || !enData.mobile) {
      console.log(`⚠️  Missing required data for ${name}, skipping`)
      stats.skipped++
      return
    }

    if (CONFIG.dryRun) {
      console.log(`✅ [DRY RUN] Would create/update: ${name} (order: ${enData.order})`)
      stats.created++
      return
    }

    // Check if employee already exists (by email - unique identifier)
    const existing = await payload.find({
      collection: 'employees',
      where: {
        email: { equals: enData.email },
      },
      limit: 1,
    })

    if (existing.totalDocs > 0) {
      // Update existing employee in EN locale
      await payload.update({
        collection: 'employees',
        id: existing.docs[0].id,
        data: enData,
        locale: 'en',
      })

      // Update DE locale with DE title
      await payload.update({
        collection: 'employees',
        id: existing.docs[0].id,
        data: {
          title: deData.title,
        },
        locale: 'de',
      })

      // Update media alt text if image exists
      if (enData.image) {
        try {
          await payload.update({
            collection: 'media',
            id: enData.image,
            data: { alt: name },
          })
        } catch (error) {
          console.warn(`  ⚠️  Failed to update media alt text:`, error instanceof Error ? error.message : error)
        }
      }

      console.log(`🔄 Updated: ${name} (order: ${enData.order})`)
      stats.updated++
    } else {
      // Create new employee in EN locale
      const created = await payload.create({
        collection: 'employees',
        data: enData,
        locale: 'en',
      })

      // Update DE locale with DE title
      await payload.update({
        collection: 'employees',
        id: created.id,
        data: {
          title: deData.title,
        },
        locale: 'de',
      })

      // Update media alt text if image exists
      if (enData.image) {
        try {
          await payload.update({
            collection: 'media',
            id: enData.image,
            data: { alt: name },
          })
        } catch (error) {
          console.warn(`  ⚠️  Failed to update media alt text:`, error instanceof Error ? error.message : error)
        }
      }

      console.log(`✅ Created: ${name} (order: ${enData.order})`)
      stats.created++
    }
  } catch (error) {
    console.error(`❌ Failed: ${name}`, error)
    stats.failed++
    stats.errors.push({
      employee: name,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Main migration runner
 */
async function runMigration() {
  console.log('\n🚀 WordPress Employee Migration\n')
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

    // Load media ID mapping and attachment URLs
    await loadMediaIdMap()
    await loadAttachmentMap()

    // Load both XML files
    console.log('📥 Loading WordPress exports...')
    const enEmployees = await loadXML(CONFIG.xmlPathEn)
    const deEmployees = await loadXML(CONFIG.xmlPathDe)

    console.log(`✅ Loaded ${enEmployees.length} EN employees`)
    console.log(`✅ Loaded ${deEmployees.length} DE employees\n`)

    // Map EN employees by name (with XML order)
    const enMap = new Map<string, { data: PayloadEmployeeData; wpData: WordPressEmployee }>()
    let order = 1
    for (const wpEmployee of enEmployees) {
      if (wpEmployee['wp:status'] === 'publish') {
        const data = await mapEmployeeData(wpEmployee, 'en', order, payload)
        enMap.set(wpEmployee.title, { data, wpData: wpEmployee })
        order++
      }
    }

    // Map DE employees by name (use same order logic)
    const deMap = new Map<string, { data: PayloadEmployeeData; wpData: WordPressEmployee }>()
    order = 1
    for (const wpEmployee of deEmployees) {
      if (wpEmployee['wp:status'] === 'publish') {
        const data = await mapEmployeeData(wpEmployee, 'de', order, payload)
        deMap.set(wpEmployee.title, { data, wpData: wpEmployee })
        order++
      }
    }

    // Merge EN and DE data
    const merged = mergeEmployeeData(enMap, deMap)
    stats.total = merged.size

    console.log(`📊 Found ${stats.total} employees to migrate\n`)

    // Migrate each employee (maintain order from EN XML)
    let index = 0
    for (const [name, { en, de }] of merged.entries()) {
      index++
      console.log(`[${index}/${stats.total}] Processing: ${name}`)
      await migrateEmployee(name, en, de, payload, stats)
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
        console.log(`  - ${err.employee}: ${err.error}`)
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
