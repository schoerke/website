/**
 * Seed Images Collection
 *
 * Seeds the Images collection with all images from the assets/ folder.
 * Uploads images to Payload CMS storage and creates corresponding image records.
 *
 * Features:
 * - Scans assets/ folder for all image files
 * - Checks if images already exist (by filename) to avoid duplicates
 * - Uploads images with appropriate mimetype
 * - Creates image records with descriptive alt text
 *
 * Supported formats:
 * - PNG (.png)
 * - JPEG (.jpg, .jpeg)
 * - WebP (.webp)
 * - SVG (.svg)
 * - GIF (.gif)
 *
 * Usage:
 *   pnpm payload run scripts/db/seedMedia.ts
 *   pnpm seed:all  # Part of master seed script
 *
 * Data Source:
 *   assets/ folder
 *
 * @see scripts/db/seedAll.ts - Master orchestration script
 * @see scripts/db/seedArtists.ts - Uses default-avatar.webp from images
 */

import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

// Supported image formats
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif']

// Mimetype mapping
const MIMETYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
}

/**
 * Get all image files from assets folder
 *
 * @returns Array of filenames in the assets folder
 */
function getAssetFiles(): string[] {
  const assetsPath = path.join(process.cwd(), 'assets')

  if (!fs.existsSync(assetsPath)) {
    console.warn('Assets folder not found at:', assetsPath)
    return []
  }

  const files = fs.readdirSync(assetsPath)
  return files.filter((file) => {
    const ext = path.extname(file).toLowerCase()
    return IMAGE_EXTENSIONS.includes(ext)
  })
}

/**
 * Generate alt text from filename
 *
 * Converts filename to readable alt text:
 * - "default-avatar.webp" → "Default Avatar"
 * - "logo_icon.png" → "Logo Icon"
 *
 * @param filename - Original filename
 * @returns Human-readable alt text
 */
function generateAltText(filename: string): string {
  const nameWithoutExt = path.parse(filename).name
  return nameWithoutExt
    .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()) // Capitalize first letter of each word
}

/**
 * Upload image file to Payload
 *
 * @param payload - Payload CMS instance
 * @param filename - Name of file in assets folder
 * @returns Image document ID
 */
async function uploadMedia(payload: any, filename: string): Promise<string> {
  const assetsPath = path.join(process.cwd(), 'assets', filename)
  const fileData = fs.readFileSync(assetsPath)
  const ext = path.extname(filename).toLowerCase()
  const mimetype = MIMETYPES[ext] || 'application/octet-stream'
  const altText = generateAltText(filename)

  const media = await payload.create({
    collection: 'images',
    data: {
      alt: altText,
    },
    file: {
      data: fileData,
      mimetype,
      name: filename,
    },
  })

  console.log(`✓ Uploaded: ${filename} (${altText})`)
  return media.id
}

/**
 * Main seeding function
 *
 * Iterates through assets folder and uploads all images:
 * 1. Get all image files from assets/
 * 2. Check if each file already exists in images collection
 * 3. Upload if not found, skip if already exists
 */
async function run() {
  try {
    const payload = await getPayload({ config })

    console.log('Seeding Images Collection...\n')

    // Get all image files from assets
    const assetFiles = getAssetFiles()

    if (assetFiles.length === 0) {
      console.log('No image files found in assets/ folder')
      process.exit(0)
    }

    console.log(`Found ${assetFiles.length} image file(s) in assets/\n`)

    let uploadedCount = 0
    let skippedCount = 0

    for (const filename of assetFiles) {
      // Check if image already exists
      const existingMedia = await payload.find({
        where: {
          filename: { equals: filename },
        },
        collection: 'images',
        limit: 1,
      })

      if (existingMedia.totalDocs > 0) {
        console.log(`⊘ Skipped: ${filename} (already exists)`)
        skippedCount++
        continue
      }

      // Upload new image
      await uploadMedia(payload, filename)
      uploadedCount++
    }

    console.log('\n--- Summary ---')
    console.log(`Uploaded: ${uploadedCount}`)
    console.log(`Skipped: ${skippedCount}`)
    console.log(`Total: ${assetFiles.length}`)
  } catch (error) {
    console.error('Error seeding images:', error)
    process.exit(1)
  }

  process.exit(0)
}

await run()
