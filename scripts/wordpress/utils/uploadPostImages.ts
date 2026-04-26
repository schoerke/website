/**
 * Upload Post Images to Payload CMS
 *
 * Uploads locally downloaded post images to Payload's images collection,
 * then appends the filename→ID mappings to images-id-map.json so the
 * import script can link images to posts.
 *
 * Usage:
 *   pnpm tsx scripts/wordpress/utils/uploadPostImages.ts            # full upload
 *   pnpm tsx scripts/wordpress/utils/uploadPostImages.ts --dry-run  # preview only, no uploads
 *
 * Dry-run checks (no database or file writes):
 *   - post-image-urls.json exists and is valid
 *   - Each image file exists in downloaded-media/
 *   - File size and upload method (Payload API vs Vercel Blob)
 *   - MIME type is a supported image format
 *   - Already mapped in images-id-map.json (would be skipped)
 *
 * Prerequisites:
 *   - post-image-urls.json must exist (run extractPostImageUrls.ts first)
 *   - Images must be downloaded to data/downloaded-media/
 *     (run: bash scripts/wordpress/utils/downloadMedia.sh post-image-urls.json)
 *
 * Environment Variables:
 *   DATABASE_URI          - Database connection string
 *   DATABASE_AUTH_TOKEN   - Database auth token
 *   PAYLOAD_SECRET        - Payload CMS secret key
 *   BLOB_READ_WRITE_TOKEN - Vercel Blob storage token
 *
 * @see scripts/wordpress/utils/extractPostImageUrls.ts - Generates post-image-urls.json
 * @see scripts/wordpress/utils/downloadMedia.sh - Downloads image files locally
 * @see scripts/wordpress/importPostsDataset.ts - Uses images-id-map.json during import
 */

import { put } from '@vercel/blob'
import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { getPayload } from 'payload'
import { fileURLToPath } from 'url'
import config from '../../../src/payload.config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')
const DOWNLOADED_DIR = path.join(DATA_DIR, 'downloaded-media')

// 4.5MB Vercel serverless body limit
const MAX_PAYLOAD_UPLOAD_SIZE = 4.5 * 1024 * 1024

const DRY_RUN = process.argv.includes('--dry-run')

interface PostImageUrl {
  filename: string
  originalFilename: string
  url: string
  wpPostId: number
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const types: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  }
  return types[ext || ''] || 'application/octet-stream'
}

async function uploadImage(
  payload: Awaited<ReturnType<typeof getPayload>>,
  filePath: string,
  filename: string,
  mimeType: string,
): Promise<number | null> {
  const buffer = await fs.readFile(filePath)
  const fileSize = buffer.length

  if (fileSize <= MAX_PAYLOAD_UPLOAD_SIZE) {
    const uploaded = await payload.create({
      collection: 'images',
      data: { alt: filename },
      file: { data: buffer, mimetype: mimeType, name: filename, size: fileSize },
    })
    console.log(`  ✅ Payload upload: ${filename} (ID: ${uploaded.id})`)
    return uploaded.id as number
  } else {
    const blob = await put(filename, buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: mimeType,
      addRandomSuffix: false,
      allowOverwrite: true,
    })
    const record = await payload.create({
      collection: 'images',
      data: { alt: filename, filename, mimeType, filesize: fileSize, url: blob.url },
    })
    console.log(`  ✅ Blob upload: ${filename} (${(fileSize / 1024 / 1024).toFixed(1)}MB, ID: ${record.id})`)
    return record.id as number
  }
}

async function main() {
  if (DRY_RUN) {
    console.log('🔍 DRY RUN — no uploads or file writes will occur\n')
  } else {
    console.log('📦 Uploading post images to Payload...\n')
  }

  // Load post image URL list
  const urlListPath = path.join(DATA_DIR, 'post-image-urls.json')
  const urlList: PostImageUrl[] = JSON.parse(await fs.readFile(urlListPath, 'utf-8'))
  console.log(`📋 ${urlList.length} images in post-image-urls.json\n`)

  // Load existing images-id-map
  const imagesIdMapPath = path.join(DATA_DIR, 'images-id-map.json')
  let imagesIdMap: Record<string, number> = {}
  try {
    imagesIdMap = JSON.parse(await fs.readFile(imagesIdMapPath, 'utf-8'))
    console.log(`📖 images-id-map.json has ${Object.keys(imagesIdMap).length} existing entries\n`)
  } catch {
    console.log('📖 No existing images-id-map.json — will create fresh\n')
  }

  // In dry-run mode we don't need Payload at all
  const payload = DRY_RUN ? null : await getPayload({ config })

  let toUpload = 0
  let alreadyMapped = 0
  let missing = 0
  let unsupported = 0
  let payloadUploads = 0
  let blobUploads = 0
  let uploaded = 0
  let errors = 0

  for (const item of urlList) {
    const { filename } = item

    // Already in map
    if (imagesIdMap[filename] !== undefined) {
      if (DRY_RUN) console.log(`  ⏭️  Already mapped: ${filename} (ID: ${imagesIdMap[filename]})`)
      alreadyMapped++
      continue
    }

    const mimeType = getMimeType(filename)
    if (!mimeType.startsWith('image/')) {
      console.warn(`  ⚠️  Unsupported type: ${filename} (${mimeType})`)
      unsupported++
      continue
    }

    // Check local file exists
    const filePath = path.join(DOWNLOADED_DIR, filename)
    let fileSize: number | null = null
    try {
      const stat = await fs.stat(filePath)
      fileSize = stat.size
    } catch {
      console.warn(`  ❌ Missing locally: ${filename}`)
      missing++
      continue
    }

    const method = fileSize <= MAX_PAYLOAD_UPLOAD_SIZE ? 'payload' : 'blob'
    const sizeMB = (fileSize / 1024 / 1024).toFixed(2)

    if (DRY_RUN) {
      const methodLabel = method === 'payload' ? '📤 Payload API' : '☁️  Vercel Blob'
      console.log(`  ✅ ${methodLabel}: ${filename} (${sizeMB}MB, ${mimeType})`)
      if (method === 'payload') payloadUploads++
      else blobUploads++
      toUpload++
      continue
    }

    // Full upload path
    if (method === 'payload') payloadUploads++
    else blobUploads++

    // Check if already in Payload by filename
    const existing = await payload!.find({
      collection: 'images',
      where: { filename: { equals: filename } },
      limit: 1,
    })
    if (existing.totalDocs > 0) {
      const id = existing.docs[0].id as number
      console.log(`  ℹ️  Already in Payload: ${filename} (ID: ${id})`)
      imagesIdMap[filename] = id
      alreadyMapped++
      continue
    }

    try {
      const id = await uploadImage(payload!, filePath, filename, mimeType)
      if (id !== null) {
        imagesIdMap[filename] = id
        uploaded++
      } else {
        errors++
      }
    } catch (err) {
      console.error(`  ❌ Error uploading ${filename}:`, err instanceof Error ? err.message : err)
      errors++
    }
  }

  console.log('\n' + '─'.repeat(60))
  if (DRY_RUN) {
    console.log('📊 Dry Run Summary:')
    console.log(`  ✅ Ready to upload:        ${toUpload} files`)
    console.log(`     └─ via Payload API:     ${payloadUploads}`)
    console.log(`     └─ via Vercel Blob:     ${blobUploads}`)
    console.log(`  ⏭️  Already mapped:         ${alreadyMapped} (will skip)`)
    console.log(`  ❌ Missing locally:         ${missing} (need download)`)
    console.log(`  ⚠️  Unsupported type:        ${unsupported}`)
    if (missing > 0) {
      console.log('\n⚠️  Run download first:')
      console.log('   bash scripts/wordpress/utils/downloadMedia.sh post-image-urls.json')
    }
    if (missing === 0 && toUpload > 0) {
      console.log('\n✅ All files present. Run without --dry-run to upload.')
    }
  } else {
    console.log('📊 Summary:')
    console.log(`  ✅ Uploaded: ${uploaded}`)
    console.log(`  ⏭️  Skipped (already exists): ${alreadyMapped}`)
    console.log(`  ❌ Errors: ${errors}`)
    console.log(`\n💾 images-id-map.json updated (${Object.keys(imagesIdMap).length} total entries)`)
    await fs.writeFile(imagesIdMapPath, JSON.stringify(imagesIdMap, null, 2))
  }

  process.exit(0)
}

main().catch(console.error)
