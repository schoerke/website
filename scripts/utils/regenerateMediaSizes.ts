/**
 * Regenerate Media Sizes Utility
 *
 * Regenerates all image sizes for media in the Media collection.
 * Useful when:
 * - Adding new image size configurations to Media collection
 * - Migrating media from one storage provider to another
 * - Fixing corrupted or missing image size variants
 * - Updating image optimization settings
 *
 * Process:
 * 1. Fetches all media documents from the collection
 * 2. Downloads original image from S3/R2 storage
 * 3. Re-uploads to Payload to trigger size regeneration
 * 4. Cleans up temporary files
 *
 * Requirements:
 * - NEXT_PUBLIC_S3_HOSTNAME or CLOUDFLARE_PUBLIC_URL must be set
 * - Original images must be accessible at the public URL
 * - Sufficient disk space for temporary image storage
 *
 * Usage:
 *   pnpm tsx scripts/utils/regenerateMediaSizes.ts
 *
 * Environment Variables:
 *   NEXT_PUBLIC_S3_HOSTNAME - Public URL for S3/R2 bucket
 *   CLOUDFLARE_PUBLIC_URL   - Alternative public URL
 *
 * @see src/collections/Media.ts - Media collection configuration
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
  const configModule = await import('../src/payload.config')
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
 * Regenerate image sizes for a single media document
 *
 * Downloads the original image, re-uploads it to Payload, and cleans up.
 * This triggers Payload's image processing pipeline to regenerate all sizes.
 *
 * @param payload - Payload CMS instance
 * @param mediaDoc - Media document to process
 * @param publicUrl - Base public URL for accessing media files
 * @throws {Error} If download, upload, or cleanup fails
 *
 * @example
 * const mediaDoc = await payload.findByID({ collection: 'media', id: '123' })
 * await regenerateSizesForMedia(payload, mediaDoc, 'https://cdn.example.com')
 */
async function regenerateSizesForMedia(payload: any, mediaDoc: any, publicUrl: string) {
  const originalUrl = mediaDoc.url?.startsWith('http') ? mediaDoc.url : `${publicUrl}/${mediaDoc.filename}`
  const tmpDir = path.join(process.cwd(), 'tmp')
  await fs.mkdir(tmpDir, { recursive: true })
  const originalPath = path.join(tmpDir, mediaDoc.filename)
  await downloadImage(originalUrl, originalPath)

  // Use Local API to re-upload and regenerate sizes
  await payload.update({
    collection: 'media',
    id: mediaDoc.id,
    filePath: originalPath,
    overwriteExistingFiles: true,
    data: {},
  })

  await fs.unlink(originalPath)
}

/**
 * Main execution function
 *
 * Processes all media documents in the collection:
 * 1. Initializes Payload CMS
 * 2. Validates environment configuration
 * 3. Fetches all media documents (up to 10,000)
 * 4. Regenerates sizes for each image
 * 5. Logs progress and errors
 *
 * @throws {Error} If no public URL is configured or Payload initialization fails
 */
async function main() {
  const config = await getConfig()
  const payload = await getPayload({ config })
  const imageSizes = config.collections.find((c: any) => c.slug === 'media')?.upload?.imageSizes || []
  const publicUrl = process.env.NEXT_PUBLIC_S3_HOSTNAME || process.env.CLOUDFLARE_PUBLIC_URL
  if (!publicUrl) throw new Error('No public S3/R2 URL found in env')

  const { docs: mediaDocs } = await payload.find({ collection: 'media', limit: 10000 })
  for (const mediaDoc of mediaDocs) {
    if (!mediaDoc.filename) continue
    try {
      console.log(`Regenerating sizes for: ${mediaDoc.filename}`)
      await regenerateSizesForMedia(payload, mediaDoc, publicUrl)
      console.log(`Done: ${mediaDoc.filename}`)
    } catch (err) {
      console.error(`Error processing ${mediaDoc.filename}:`, err)
    }
  }
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
