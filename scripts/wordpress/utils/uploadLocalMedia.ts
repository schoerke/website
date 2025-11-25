/**
 * Upload Local Media Files
 *
 * Uploads all locally downloaded WordPress media files to Payload CMS and creates a mapping file
 * for use during artist migration.
 *
 * This script:
 * 1. Reads the list of media files from media-urls.json
 * 2. Loads each file from downloaded-media/ directory
 * 3. Uploads to Payload media collection
 * 4. Creates a filename→media ID mapping
 * 5. Saves mapping to media-id-map.json
 *
 * Usage:
 *   pnpm tsx scripts/wordpress/utils/uploadLocalMedia.ts
 *
 * Environment Variables:
 *   DATABASE_URI - Database connection string
 *   PAYLOAD_SECRET - Payload CMS secret key
 *
 * @see scripts/wordpress/utils/extractMediaUrls.ts - Generates media-urls.json
 * @see scripts/wordpress/utils/downloadMedia.sh - Downloads files locally
 * @see scripts/wordpress/migrateArtists.ts - Uses media-id-map.json
 */

import config from '@/payload.config'
import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { getPayload } from 'payload'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface MediaUrl {
  url: string
  source: string
  field: string
  filename: string
}

interface MediaIdMap {
  [filename: string]: number
}

/**
 * Get MIME type from filename extension
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    zip: 'application/zip',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  }
  return mimeTypes[ext || ''] || 'application/octet-stream'
}

/**
 * Upload a single local file to Payload
 */
async function uploadLocalFile(
  payload: any,
  filePath: string,
  filename: string,
  altText: string,
): Promise<number | null> {
  try {
    // Check if media already exists by filename
    const existing = await payload.find({
      collection: 'media',
      where: {
        filename: { equals: filename },
      },
      limit: 1,
    })

    if (existing.totalDocs > 0) {
      console.log(`  ℹ️  Media already exists: ${filename} (ID: ${existing.docs[0].id})`)
      return existing.docs[0].id
    }

    // Read file from disk
    const buffer = await fs.readFile(filePath)
    const sizeMB = buffer.length / (1024 * 1024)
    console.log(`  📤 Uploading: ${filename} (${sizeMB.toFixed(2)}MB)`)

    // Determine mimetype
    const contentType = getMimeType(filename)

    // Create file object for Payload
    const file = {
      data: buffer,
      mimetype: contentType,
      name: filename,
      size: buffer.length,
    }

    // Upload to Payload
    const uploaded = await payload.create({
      collection: 'media',
      data: {
        alt: altText,
      },
      file,
    })

    console.log(`  ✅ Uploaded: ${filename} (ID: ${uploaded.id})`)
    return uploaded.id
  } catch (error) {
    console.error(`  ❌ Error uploading ${filename}:`, error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('📦 Starting local media upload...\n')

  const payload = await getPayload({ config })

  // Read media URLs list
  const mediaUrlsPath = path.join(__dirname, 'data', 'media-urls.json')
  const mediaUrlsContent = await fs.readFile(mediaUrlsPath, 'utf-8')
  const mediaUrls: MediaUrl[] = JSON.parse(mediaUrlsContent)

  console.log(`Found ${mediaUrls.length} media files to upload\n`)

  // Initialize mapping
  const mediaIdMap: MediaIdMap = {}
  const downloadedDir = path.join(__dirname, 'data', 'downloaded-media')

  // Upload each file
  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const mediaItem of mediaUrls) {
    const { filename, field, source } = mediaItem

    // Decode URL-encoded filename for filesystem lookup
    const decodedFilename = decodeURIComponent(filename)
    const filePath = path.join(downloadedDir, decodedFilename)

    // Check if file exists locally
    try {
      await fs.access(filePath)
    } catch {
      console.warn(`  ⚠️  File not found locally: ${decodedFilename}`)
      errorCount++
      continue
    }

    // Generate temporary alt text (will be updated with proper names during migration)
    const altText = decodedFilename

    // Upload file
    const mediaId = await uploadLocalFile(payload, filePath, decodedFilename, altText)

    if (mediaId !== null) {
      // Store mapping using original URL-encoded filename as key
      // (migrateArtists.ts uses the URL-encoded version)
      mediaIdMap[filename] = mediaId

      if (mediaId === mediaIdMap[filename]) {
        successCount++
      } else {
        skipCount++ // Already existed
      }
    } else {
      errorCount++
    }
  }

  // Save mapping to file
  const mapPath = path.join(__dirname, 'data', 'media-id-map.json')
  await fs.writeFile(mapPath, JSON.stringify(mediaIdMap, null, 2))

  console.log('\n📊 Upload Summary:')
  console.log(`  ✅ Successfully uploaded: ${successCount}`)
  console.log(`  ℹ️  Already existed: ${skipCount}`)
  console.log(`  ❌ Errors: ${errorCount}`)
  console.log(`  📋 Total processed: ${mediaUrls.length}`)
  console.log(`\n💾 Media ID mapping saved to: ${mapPath}`)
  console.log(`\nNext step: Run artist migration with updated media linking`)

  process.exit(0)
}

main()
