/**
 * Upload Local Media Files with Hybrid Upload Strategy
 *
 * Uploads locally downloaded WordPress media files to Payload CMS using the new
 * Images and Documents collections with Vercel Blob storage.
 *
 * This script:
 * 1. Reads the list of media files from media-urls.json
 * 2. Routes by MIME type to appropriate collection (images vs documents)
 * 3. Uses hybrid upload strategy based on file size:
 *    - Files ≤4.5MB: Upload via Payload API (server upload)
 *    - Files >4.5MB: Upload directly to Vercel Blob (bypass 4.5MB limit)
 * 4. Creates separate filename→media ID mappings for each collection
 * 5. Saves mappings to images-id-map.json and documents-id-map.json
 *
 * Usage:
 *   pnpm tsx scripts/wordpress/utils/uploadLocalMedia.ts
 *
 * Environment Variables:
 *   DATABASE_URI - Database connection string
 *   PAYLOAD_SECRET - Payload CMS secret key
 *   BLOB_READ_WRITE_TOKEN - Vercel Blob storage token
 *
 * @see scripts/wordpress/utils/extractMediaUrls.ts - Generates media-urls.json
 * @see scripts/wordpress/utils/downloadMedia.sh - Downloads files locally
 * @see scripts/wordpress/migrateArtists.ts - Uses ID maps for migration
 */

import config from '@/payload.config'
import { put } from '@vercel/blob'
import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { getPayload } from 'payload'
import { fileURLToPath } from 'url'

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

    const data = collection === 'images' 
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
    })

    console.log(`  📤 Uploaded to Blob: ${filename} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`)

    // Create Payload record manually (without file upload)
    const data = collection === 'images'
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
 * Main execution
 */
async function main() {
  console.log('📦 Starting local media upload with hybrid strategy...\n')
  console.log(`📊 Size threshold: ${(MAX_SERVER_UPLOAD_SIZE / 1024 / 1024).toFixed(1)}MB`)
  console.log(`   - Files ≤${(MAX_SERVER_UPLOAD_SIZE / 1024 / 1024).toFixed(1)}MB: Upload via Payload API`)
  console.log(`   - Files >${(MAX_SERVER_UPLOAD_SIZE / 1024 / 1024).toFixed(1)}MB: Upload via Vercel Blob\n`)

  const payload = await getPayload({ config })

  // Read media URLs list
  const mediaUrlsPath = path.join(__dirname, 'data', 'media-urls.json')
  const mediaUrlsContent = await fs.readFile(mediaUrlsPath, 'utf-8')
  const mediaUrls: MediaUrl[] = JSON.parse(mediaUrlsContent)

  console.log(`Found ${mediaUrls.length} media files to upload\n`)

  // Initialize mappings
  const imagesIdMap: MediaIdMap = {}
  const documentsIdMap: MediaIdMap = {}
  const downloadedDir = path.join(__dirname, 'data', 'downloaded-media')

  // Upload stats
  const stats: UploadStats = {
    successCount: 0,
    skipCount: 0,
    errorCount: 0,
    smallFileCount: 0,
    largeFileCount: 0,
  }

  // Upload each file
  for (const mediaItem of mediaUrls) {
    const { filename } = mediaItem

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

    // Generate temporary alt/title text
    const altText = decodedFilename

    // Upload file
    const result = await uploadLocalFile(payload, filePath, decodedFilename, altText)

    if (result.id !== null) {
      // Store mapping in appropriate collection map
      if (result.collection === 'images') {
        imagesIdMap[filename] = result.id
      } else {
        documentsIdMap[filename] = result.id
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
  const imagesMapPath = path.join(__dirname, 'data', 'images-id-map.json')
  const documentsMapPath = path.join(__dirname, 'data', 'documents-id-map.json')
  
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
