/**
 * Extract all unique media URLs from WordPress XML exports
 *
 * This script parses the all-en.xml export to find all media references
 * for artists, employees, and posts, and outputs a JSON file with unique URLs
 * for batch migration.
 *
 * Usage: pnpm tsx scripts/wordpress/utils/extractMediaUrls.ts
 */

import { parsePostMeta, parseWordPressXML } from './xmlParser'

interface MediaReference {
  url: string
  source: string // Which collection needs it
  field: string // Which field (biographyPDF, galleryZIP, image, etc.)
  filename: string
}

async function extractMediaUrls() {
  console.log('🔍 Extracting media URLs from WordPress exports...\n')

  const mediaUrls = new Map<string, MediaReference>()

  // Helper to add URL
  const addUrl = (url: string | undefined, source: string, field: string) => {
    if (!url || typeof url !== 'string') return
    const trimmed = url.trim()
    if (!trimmed || trimmed === '0') return

    const urlObj = new URL(trimmed)
    const filename = urlObj.pathname.split('/').pop() || 'download'

    if (!mediaUrls.has(trimmed)) {
      mediaUrls.set(trimmed, { url: trimmed, source, field, filename })
    }
  }

  // ============================================================================
  // ARTISTS
  // ============================================================================
  console.log('📋 Parsing artists and employees from all-en.xml...')

  // Build media ID to URL map from all-en.xml attachments
  console.log('  📋 Building media ID→URL map from attachments...')
  const allMedia = await parseWordPressXML('./scripts/wordpress/data/all-en.xml')
  const mediaIdMap = new Map<string, string>()

  // Extract all items of different types
  const artistsEN = allMedia.filter((item) => item['wp:post_type'] === 'artist')
  const employees = allMedia.filter((item) => item['wp:post_type'] === 'employee')

  for (const item of allMedia) {
    if (item['wp:post_type'] === 'attachment') {
      const attachmentUrl = item['wp:attachment_url']
      if (attachmentUrl) {
        mediaIdMap.set(String(item['wp:post_id']), attachmentUrl)
      }
    }
  }
  console.log(`  ✅ Mapped ${mediaIdMap.size} media IDs to URLs`)

  for (const artist of artistsEN) {
    const meta = parsePostMeta(artist['wp:postmeta'])

    // Featured image (lookup ID in map)
    // Check both _thumbnail_id and artist_secondary-image_thumbnail_id
    const thumbnailId = meta._thumbnail_id || meta['artist_secondary-image_thumbnail_id']
    if (thumbnailId) {
      const imageUrl = mediaIdMap.get(String(thumbnailId))
      addUrl(imageUrl, 'artists', 'image')
    }

    // Biography PDF (direct URL)
    addUrl(meta.biography_pdf as string, 'artists', 'biographyPDF')

    // Gallery ZIP (direct URL)
    addUrl(meta.gallery_zip_link as string, 'artists', 'galleryZIP')
  }

  console.log(`  ✅ Found ${mediaUrls.size} unique media URLs from artists`)

  // ============================================================================
  // EMPLOYEES
  // ============================================================================
  console.log('📋 Parsing employees...')

  for (const employee of employees) {
    const meta = parsePostMeta(employee['wp:postmeta'])

    // Employee image (lookup ID in map, same as artists)
    const thumbnailId = meta._thumbnail_id
    if (thumbnailId) {
      const imageUrl = mediaIdMap.get(String(thumbnailId))
      addUrl(imageUrl, 'employees', 'image')
    }
  }

  console.log(`  ✅ Total unique media URLs: ${mediaUrls.size}`)

  // ============================================================================
  // POSTS (Optional - add if needed)
  // ============================================================================
  // console.log('📋 Parsing posts...')
  // const postsEN = await parseWordPressXML('./scripts/wordpress/data/posts-en.xml')
  // ... extract post media ...

  // ============================================================================
  // OUTPUT
  // ============================================================================
  const urlList = Array.from(mediaUrls.values())

  // Save to JSON
  const fs = await import('fs/promises')
  await fs.writeFile('./scripts/wordpress/data/media-urls.json', JSON.stringify(urlList, null, 2), 'utf-8')

  console.log(`\n✅ Extracted ${urlList.length} unique media URLs`)
  console.log(`📁 Saved to: scripts/wordpress/data/media-urls.json`)

  // Show breakdown
  const breakdown = urlList.reduce(
    (acc, item) => {
      const key = `${item.source}:${item.field}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  console.log('\n📊 Breakdown by collection:')
  Object.entries(breakdown).forEach(([key, count]) => {
    console.log(`  ${key}: ${count}`)
  })
}

extractMediaUrls().catch(console.error)
