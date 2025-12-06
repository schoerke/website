/**
 * Regenerate Image Sizes Utility
 *
 * Regenerates all image sizes for images in the Images collection.
 * Useful when:
 * - Adding new image size configurations to Images collection
 * - Migrating images from one storage provider to another
 * - Fixing corrupted or missing image size variants
 * - Updating image optimization settings
 *
 * Process:
 * 1. Fetches all image documents from the Images collection
 * 2. Downloads original image from Vercel Blob storage
 * 3. Re-uploads to Payload to trigger size regeneration
 * 4. Cleans up temporary files
 *
 * Requirements:
 * - BLOB_READ_WRITE_TOKEN must be set (Vercel Blob)
 * - Original images must be accessible via Vercel Blob
 * - Sufficient disk space for temporary image storage
 *
 * Usage:
 *   pnpm tsx scripts/utils/regenerateMediaSizes.ts
 *
 * Environment Variables:
 *   BLOB_READ_WRITE_TOKEN - Vercel Blob authentication token
 *
 * @see src/collections/Images.ts - Images collection configuration
 */

import 'dotenv/config'
import { promises as fs } from 'fs'
import path from 'path'
import { getPayload } from 'payload'

/**
 * Load and resolve Payload configuration
 *
 * @returns Resolved Payload configuration object
 */
async function getConfig() {
  const configModule = await import('../../src/payload.config')
  const configMaybePromise = configModule.default
  return typeof configMaybePromise.then === 'function' ? await configMaybePromise : configMaybePromise
}

/**
 * Download image from URL to local filesystem
 *
 * @param url - Image URL to download from
 * @param dest - Local destination path for downloaded image
 * @throws {Error} If download fails or URL is not accessible
 *
 * @example
 * await downloadImage('https://cdn.example.com/image.jpg', '/tmp/image.jpg')
 */
async function downloadImage(url: string, dest: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download image: ${url}`)
  const arrayBuffer = await res.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  await fs.writeFile(dest, buffer)
}

/**
 * Regenerate image sizes for a single image document
 *
 * Downloads the original image, re-uploads it to Payload, and cleans up.
 * This triggers Payload's image processing pipeline to regenerate all sizes.
 *
 * @param payload - Payload CMS instance
 * @param imageDoc - Image document to process
 * @param publicUrl - Base public URL for accessing image files
 * @throws {Error} If download, upload, or cleanup fails
 *
 * @example
 * const imageDoc = await payload.findByID({ collection: 'images', id: '123' })
 * await regenerateSizesForImage(payload, imageDoc, 'https://blob.vercel-storage.com')
 */
async function regenerateSizesForImage(payload: any, imageDoc: any, publicUrl: string) {
  const originalUrl = imageDoc.url?.startsWith('http') ? imageDoc.url : `${publicUrl}/${imageDoc.filename}`
  const tmpDir = path.join(process.cwd(), 'tmp')
  await fs.mkdir(tmpDir, { recursive: true })
  const originalPath = path.join(tmpDir, imageDoc.filename)
  await downloadImage(originalUrl, originalPath)

  // Use Local API to re-upload and regenerate sizes
  await payload.update({
    collection: 'images',
    id: imageDoc.id,
    filePath: originalPath,
    overwriteExistingFiles: true,
    data: {},
  })

  await fs.unlink(originalPath)
}

/**
 * Main execution function
 *
 * Processes all image documents in the Images collection:
 * 1. Initializes Payload CMS
 * 2. Validates environment configuration
 * 3. Fetches all image documents (up to 10,000)
 * 4. Regenerates sizes for each image
 * 5. Logs progress and errors
 *
 * @throws {Error} If no Vercel Blob token is configured or Payload initialization fails
 */
async function main() {
  const config = await getConfig()
  const payload = await getPayload({ config })
  const imageSizes = config.collections.find((c: any) => c.slug === 'images')?.upload?.imageSizes || []

  // Vercel Blob public URL (no longer using R2)
  const publicUrl = 'https://blob.vercel-storage.com'

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN not found in environment variables')
  }

  console.log(`📊 Found ${imageSizes.length} image size configurations`)

  const { docs: imageDocs } = await payload.find({ collection: 'images', limit: 10000 })
  console.log(`🖼️  Processing ${imageDocs.length} images...\n`)

  for (const imageDoc of imageDocs) {
    if (!imageDoc.filename) continue
    try {
      console.log(`Regenerating sizes for: ${imageDoc.filename}`)
      await regenerateSizesForImage(payload, imageDoc, publicUrl)
      console.log(`✅ Done: ${imageDoc.filename}`)
    } catch (err) {
      console.error(`❌ Error processing ${imageDoc.filename}:`, err)
    }
  }

  console.log('\n✨ All images processed!')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
