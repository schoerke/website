/**
 * Upload Local Media Files with Hybrid Upload Strategy
 *
 * Uploads locally downloaded WordPress media files AND core application assets
 * to Payload CMS using the Images and Documents collections with Vercel Blob storage.
 *
 * This script:
 * 1. Uploads core application assets (logo, logo icon, default avatar) from assets/
 * 2. Reads the list of WordPress media files from media-urls.json
 * 3. Routes by MIME type to appropriate collection (images vs documents)
 * 4. Uses hybrid upload strategy based on file size:
 *    - Files ≤4.5MB: Upload via Payload API (server upload)
 *    - Files >4.5MB: Upload directly to Vercel Blob (bypass 4.5MB limit)
 * 5. Creates separate filename→media ID mappings for each collection
 * 6. Saves mappings to images-id-map.json and documents-id-map.json
 *
 * Usage:
 *   pnpm tsx scripts/wordpress/utils/uploadLocalMedia.ts
 *
 * Prerequisites:
 *   - Core assets must exist in assets/ directory
 *     (if missing, restore from git: git restore assets/)
 *   - WordPress media files must be downloaded to data/downloaded-media/
 *
 * Environment Variables:
 *   DATABASE_URI - Database connection string
 *   PAYLOAD_SECRET - Payload CMS secret key
 *   BLOB_READ_WRITE_TOKEN - Vercel Blob storage token
 *
 * @see scripts/wordpress/utils/extractMediaUrls.ts - Generates media-urls.json
 * @see scripts/wordpress/utils/downloadMedia.sh - Downloads WordPress files locally
 * @see scripts/wordpress/migrateArtists.ts - Uses ID maps for migration
 */

import { put } from '@vercel/blob'
import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { getPayload } from 'payload'
import { fileURLToPath } from 'url'
import config from '../../../src/payload.config.js'
import { cleanWordPressFilename } from './fieldMappers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 4.5MB in bytes (Vercel serverless function body limit)
const MAX_SERVER_UPLOAD_SIZE = 4.5 * 1024 * 1024

interface MediaUrl {
  url: string
  source: string
  field: string
  filename: string
}

interface MediaIdMap {
  [filename: string]: number
}

interface UploadStats {
  successCount: number
  skipCount: number
  errorCount: number
  smallFileCount: number
  largeFileCount: number
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
 * Determine target collection based on MIME type
 */
function getCollectionForMimeType(mimeType: string): 'images' | 'documents' {
  return mimeType.startsWith('image/') ? 'images' : 'documents'
}

/**
 * Upload small file via Payload API (≤4.5MB)
 */
async function uploadViaPayload(
  payload: any,
  collection: 'images' | 'documents',
  filePath: string,
  filename: string,
  mimeType: string,
  altText: string,
): Promise<number | null> {
  try {
    const buffer = await fs.readFile(filePath)

    const file = {
      data: buffer,
      mimetype: mimeType,
      name: filename,
      size: buffer.length,
    }

    const data =
      collection === 'images'
        ? { alt: altText }
        : { title: filename, description: `Migrated from WordPress: ${filename}` }

    const uploaded = await payload.create({
      collection,
      data,
      file,
    })

    console.log(`  ✅ Uploaded via Payload: ${filename} (ID: ${uploaded.id})`)
    return uploaded.id
  } catch (error) {
    console.error(`  ❌ Payload upload error for ${filename}:`, error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Upload large file directly to Vercel Blob (>4.5MB)
 */
async function uploadViaBlob(
  payload: any,
  collection: 'images' | 'documents',
  filePath: string,
  filename: string,
  mimeType: string,
  altText: string,
  fileSize: number,
): Promise<number | null> {
  try {
    // Upload directly to Vercel Blob
    const buffer = await fs.readFile(filePath)

    const blob = await put(filename, buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: mimeType,
      addRandomSuffix: false,
      allowOverwrite: true,
    })

    console.log(`  📤 Uploaded to Blob: ${filename} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`)

    // Create Payload record manually (without file upload)
    const data =
      collection === 'images'
        ? {
            alt: altText,
            filename,
            mimeType,
            filesize: fileSize,
            url: blob.url,
          }
        : {
            title: filename,
            description: `Migrated from WordPress: ${filename}`,
            filename,
            mimeType,
            fileSize,
            url: blob.url,
          }

    const record = await payload.create({
      collection,
      data,
    })

    console.log(`  ✅ Created record: ${filename} (ID: ${record.id})`)
    return record.id
  } catch (error) {
    console.error(`  ❌ Blob upload error for ${filename}:`, error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Upload a single local file using hybrid strategy
 */
async function uploadLocalFile(
  payload: any,
  filePath: string,
  filename: string,
  altText: string,
): Promise<{ id: number | null; collection: 'images' | 'documents'; uploadMethod: 'payload' | 'blob' }> {
  try {
    // Get file info
    const stats = await fs.stat(filePath)
    const fileSize = stats.size
    const mimeType = getMimeType(filename)
    const collection = getCollectionForMimeType(mimeType)
    const sizeMB = fileSize / (1024 * 1024)

    // Check if already exists
    const existing = await payload.find({
      collection,
      where: {
        filename: { equals: filename },
      },
      limit: 1,
    })

    if (existing.totalDocs > 0) {
      console.log(`  ℹ️  Already exists in ${collection}: ${filename} (ID: ${existing.docs[0].id})`)
      return { id: existing.docs[0].id, collection, uploadMethod: 'payload' }
    }

    console.log(`  📁 Processing: ${filename} (${sizeMB.toFixed(2)}MB) → ${collection}`)

    // Route by file size
    if (fileSize <= MAX_SERVER_UPLOAD_SIZE) {
      const id = await uploadViaPayload(payload, collection, filePath, filename, mimeType, altText)
      return { id, collection, uploadMethod: 'payload' }
    } else {
      const id = await uploadViaBlob(payload, collection, filePath, filename, mimeType, altText, fileSize)
      return { id, collection, uploadMethod: 'blob' }
    }
  } catch (error) {
    console.error(`  ❌ Error processing ${filename}:`, error instanceof Error ? error.message : error)
    return { id: null, collection: 'images', uploadMethod: 'payload' }
  }
}

/**
 * Upload core application assets (logo, logo icon, default avatar)
 */
async function uploadCoreAssets(
  payload: any,
  imagesIdMap: MediaIdMap,
  stats: UploadStats,
): Promise<void> {
  console.log('🎨 Uploading core application assets...\n')

  const coreAssets = [
    { filename: 'default-avatar.webp', alt: 'Default Avatar', path: 'assets/default-avatar.webp' },
    { filename: 'logo_icon.png', alt: 'KSSchoerke Logo Icon', path: 'assets/logo_icon.png' },
    { filename: 'logo.png', alt: 'KSSchoerke Logo', path: 'assets/logo.png' },
  ]

  for (const asset of coreAssets) {
    const filePath = path.join(process.cwd(), asset.path)

    // Check if file exists
    try {
      await fs.access(filePath)
    } catch {
      console.warn(
        `  ⚠️  Core asset not found: ${asset.filename} (${asset.path})` +
          `\n      If needed, restore from git: git restore ${asset.path}`,
      )
      continue
    }

    // Check if already exists in database
    const existing = await payload.find({
      collection: 'images',
      where: { filename: { equals: asset.filename } },
      limit: 1,
    })

    if (existing.totalDocs > 0) {
      const existingDoc = existing.docs[0]
      console.log(`  ℹ️  Core asset already exists: ${asset.filename} (ID: ${existingDoc.id})`)
      const docId = typeof existingDoc.id === 'number' ? existingDoc.id : parseInt(String(existingDoc.id), 10)
      imagesIdMap[asset.filename] = docId
      stats.skipCount++
      continue
    }

    // Upload the core asset
    const result = await uploadLocalFile(payload, filePath, asset.filename, asset.alt)

    if (result.id !== null) {
      imagesIdMap[asset.filename] = result.id
      stats.successCount++
      if (result.uploadMethod === 'blob') {
        stats.largeFileCount++
      } else {
        stats.smallFileCount++
      }
    } else {
      stats.errorCount++
    }
  }

  console.log()
}

/**
 * Main execution
 */
async function main() {
  console.log('📦 Starting local media upload with hybrid strategy...\n')
  console.log(`📊 Size threshold: ${(MAX_SERVER_UPLOAD_SIZE / 1024 / 1024).toFixed(1)}MB`)
  console.log(`   - Files ≤${(MAX_SERVER_UPLOAD_SIZE / 1024 / 1024).toFixed(1)}MB: Upload via Payload API`)
  console.log(`   - Files >${(MAX_SERVER_UPLOAD_SIZE / 1024 / 1024).toFixed(1)}MB: Upload via Vercel Blob\n`)

  const payload = await getPayload({ config })

  // Initialize mappings and stats
  const imagesIdMap: MediaIdMap = {}
  const documentsIdMap: MediaIdMap = {}

  const stats: UploadStats = {
    successCount: 0,
    skipCount: 0,
    errorCount: 0,
    smallFileCount: 0,
    largeFileCount: 0,
  }

  // Upload core application assets first
  await uploadCoreAssets(payload, imagesIdMap, stats)

  // Read media URLs list
  const mediaUrlsPath = path.join(__dirname, '..', 'data', 'media-urls.json')
  const mediaUrlsContent = await fs.readFile(mediaUrlsPath, 'utf-8')
  const mediaUrls: MediaUrl[] = JSON.parse(mediaUrlsContent)

  console.log(`📋 Found ${mediaUrls.length} WordPress media files to upload\n`)

  const downloadedDir = path.join(__dirname, '..', 'data', 'downloaded-media')

  // Upload each file
  for (const mediaItem of mediaUrls) {
    const { filename: originalFilename } = mediaItem

    // Clean WordPress timestamp postfixes
    const filename = cleanWordPressFilename(originalFilename)

    // Decode URL-encoded filename for filesystem lookup
    const decodedFilename = decodeURIComponent(filename)
    const filePath = path.join(downloadedDir, decodedFilename)

    // Check if file exists locally
    try {
      await fs.access(filePath)
    } catch {
      console.warn(`  ⚠️  File not found locally: ${decodedFilename}`)
      stats.errorCount++
      continue
    }

    // Determine collection from MIME type
    const mimeType = getMimeType(decodedFilename)
    const collection = getCollectionForMimeType(mimeType)

    // Check if already exists in database (idempotency)
    try {
      const existing = await payload.find({
        collection,
        where: {
          filename: { equals: decodedFilename },
        },
        limit: 1,
      })

      if (existing.totalDocs > 0) {
        const existingDoc = existing.docs[0]
        console.log(`  ℹ️  Already exists in ${collection}: ${decodedFilename} (ID: ${existingDoc.id})`)

        // Store mapping using BOTH original and cleaned filenames (ensure ID is a number)
        const docId = typeof existingDoc.id === 'number' ? existingDoc.id : parseInt(String(existingDoc.id), 10)
        if (collection === 'images') {
          imagesIdMap[originalFilename] = docId
          if (originalFilename !== filename) {
            imagesIdMap[filename] = docId
          }
        } else {
          documentsIdMap[originalFilename] = docId
          if (originalFilename !== filename) {
            documentsIdMap[filename] = docId
          }
        }

        stats.skipCount++
        continue
      }
    } catch (error) {
      // If check fails, continue with upload attempt
      console.warn(`  ⚠️  Could not check existing record: ${error instanceof Error ? error.message : error}`)
    }

    // Generate temporary alt/title text
    const altText = decodedFilename

    // Upload file
    const result = await uploadLocalFile(payload, filePath, decodedFilename, altText)

    if (result.id !== null) {
      // Store mapping using BOTH original and cleaned filenames
      // This ensures migrations can find files by either name
      if (result.collection === 'images') {
        imagesIdMap[originalFilename] = result.id
        if (originalFilename !== filename) {
          imagesIdMap[filename] = result.id
        }
      } else {
        documentsIdMap[originalFilename] = result.id
        if (originalFilename !== filename) {
          documentsIdMap[filename] = result.id
        }
      }

      // Track stats
      if (result.uploadMethod === 'blob') {
        stats.largeFileCount++
      } else {
        stats.smallFileCount++
      }

      stats.successCount++
    } else {
      stats.errorCount++
    }
  }

  // Save mappings to separate files
  const imagesMapPath = path.join(__dirname, '..', 'data', 'images-id-map.json')
  const documentsMapPath = path.join(__dirname, '..', 'data', 'documents-id-map.json')

  await fs.writeFile(imagesMapPath, JSON.stringify(imagesIdMap, null, 2))
  await fs.writeFile(documentsMapPath, JSON.stringify(documentsIdMap, null, 2))

  console.log('\n📊 Upload Summary:')
  console.log(`  ✅ Successfully uploaded: ${stats.successCount}`)
  console.log(`  ❌ Errors: ${stats.errorCount}`)
  console.log(`  📋 Total processed: ${mediaUrls.length}\n`)

  console.log('📊 Upload Method:')
  console.log(`  🔹 Small files (≤4.5MB via Payload): ${stats.smallFileCount}`)
  console.log(`  🔸 Large files (>4.5MB via Blob): ${stats.largeFileCount}\n`)

  console.log('💾 ID Mappings saved:')
  console.log(`  🖼️  Images: ${imagesMapPath} (${Object.keys(imagesIdMap).length} files)`)
  console.log(`  📄 Documents: ${documentsMapPath} (${Object.keys(documentsIdMap).length} files)`)

  console.log(`\nNext step: Run artist and post migrations with updated media linking`)

  process.exit(0)
}

main()
