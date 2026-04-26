/**
 * Extract Post Image URLs from WordPress XML exports
 *
 * Reads posts-dataset.json to find all posts with an imagePath, then looks up
 * the corresponding attachment URL in the WordPress XML exports. Outputs a JSON
 * file (post-image-urls.json) ready for use with downloadMedia.sh.
 *
 * Usage:
 *   pnpm tsx scripts/wordpress/utils/extractPostImageUrls.ts
 *
 * Output:
 *   scripts/wordpress/data/post-image-urls.json
 *
 * Next steps:
 *   1. Review post-image-urls.json to verify URLs look correct
 *   2. Run downloadMedia.sh with post-image-urls.json to download files
 *   3. Run uploadPostImages.ts to upload to Payload and update images-id-map.json
 *
 * @see scripts/wordpress/data/posts-dataset.json - Source dataset
 * @see scripts/wordpress/utils/downloadMedia.sh - Downloads files locally
 * @see scripts/wordpress/utils/uploadPostImages.ts - Uploads to Payload
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { cleanWordPressFilename } from './fieldMappers.js'
import { parseWordPressXML } from './xmlParser.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')

interface PostImageUrl {
  filename: string // cleaned filename (matches imagePath in dataset)
  originalFilename: string // raw filename from WordPress attachment URL
  url: string // full download URL
  wpPostId: number // WordPress post ID of the attachment
}

async function extractPostImageUrls() {
  console.log('🔍 Extracting post image URLs from WordPress exports...\n')

  // Load dataset
  const datasetPath = path.join(DATA_DIR, 'posts-dataset.json')
  const dataset = JSON.parse(await fs.readFile(datasetPath, 'utf-8'))

  // Collect unique imagePath filenames needed
  const neededFilenames = new Set<string>()
  for (const entry of dataset) {
    if (entry.imagePath) neededFilenames.add(entry.imagePath)
  }
  console.log(`📋 Posts with images: ${dataset.filter((e: { imagePath: string | null }) => e.imagePath).length}`)
  console.log(`📋 Unique image filenames needed: ${neededFilenames.size}\n`)

  // Build attachment ID→URL map from both XML files
  // Use DE XML as primary (News posts), EN XML as secondary (Projects posts)
  console.log('📖 Building attachment URL map from XML exports...')
  const attachmentUrlMap = new Map<string, { url: string; postId: number }>()

  for (const xmlFile of ['all-de.xml', 'all-en.xml']) {
    const items = await parseWordPressXML(path.join(DATA_DIR, xmlFile))
    let count = 0
    for (const item of items) {
      if (item['wp:post_type'] === 'attachment') {
        const attachmentUrl = (item as unknown as Record<string, string>)['wp:attachment_url']
        if (attachmentUrl) {
          const rawFilename = attachmentUrl.split('/').pop() || ''
          const cleanedFilename = cleanWordPressFilename(rawFilename)
          // Store by cleaned filename (don't overwrite if already found)
          if (!attachmentUrlMap.has(cleanedFilename)) {
            attachmentUrlMap.set(cleanedFilename, {
              url: attachmentUrl,
              postId: Number(item['wp:post_id']),
            })
            count++
          }
        }
      }
    }
    console.log(`  ✅ ${xmlFile}: ${count} new attachments mapped`)
  }
  console.log(`  📊 Total unique attachments: ${attachmentUrlMap.size}\n`)

  // Match each needed filename to its attachment URL
  const results: PostImageUrl[] = []
  const notFound: string[] = []

  for (const filename of neededFilenames) {
    const attachment = attachmentUrlMap.get(filename)
    if (attachment) {
      const originalFilename = attachment.url.split('/').pop() || filename
      results.push({
        filename,
        originalFilename,
        url: attachment.url,
        wpPostId: attachment.postId,
      })
    } else {
      notFound.push(filename)
    }
  }

  // Report results
  console.log(`✅ Matched: ${results.length} / ${neededFilenames.size}`)
  if (notFound.length > 0) {
    console.log(`\n⚠️  Not found in XML (${notFound.length}):`)
    notFound.forEach((f) => console.log(`  - ${f}`))
  }

  // Save output
  const outputPath = path.join(DATA_DIR, 'post-image-urls.json')
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2))
  console.log(`\n💾 Saved to: ${outputPath}`)
  console.log('\nNext steps:')
  console.log('  1. Review post-image-urls.json to verify URLs')
  console.log('  2. Run: bash scripts/wordpress/utils/downloadMedia.sh (point at post-image-urls.json)')
  console.log('  3. Run: pnpm tsx scripts/wordpress/utils/uploadPostImages.ts')
}

extractPostImageUrls().catch(console.error)
