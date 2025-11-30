/**
 * Field Mapping Utilities
 *
 * Maps WordPress custom fields to Payload CMS schema
 */

/**
 * Map WordPress instrument names to Payload instrument values
 */

/**
 * Map WordPress instrument names to Payload instrument values
 */
export function mapInstruments(wpInstruments: string): string[] {
  if (!wpInstruments) return []

  // WordPress stores as comma-separated or single value
  const instruments = wpInstruments.split(',').map((i) => i.trim().toLowerCase())

  const mapping: Record<string, string> = {
    piano: 'piano',
    pianoforte: 'piano-forte',
    'piano-forte': 'piano-forte',
    harpsichord: 'harpsichord',
    cembalo: 'harpsichord',
    conductor: 'conductor',
    conducting: 'conductor',
    violin: 'violin',
    viola: 'viola',
    cello: 'cello',
    violoncello: 'cello',
    bass: 'bass',
    'double bass': 'bass',
    horn: 'horn',
    recorder: 'recorder',
    'chamber music': 'chamber-music',
  }

  return instruments.map((inst) => mapping[inst]).filter(Boolean)
}

/**
 * Validate and clean URL
 */
export function validateAndCleanURL(url: string | number | undefined): string | undefined {
  if (!url || typeof url !== 'string') return undefined

  let trimmed = url.trim()
  if (!trimmed) return undefined

  // Add https:// if missing protocol
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = `https://${trimmed}`
  }

  try {
    new URL(trimmed)
    return trimmed
  } catch {
    return undefined
  }
}

/**
 * Map WordPress contact person name to Payload employee ID
 */
export async function findEmployeeByName(payload: any, name: string | number | undefined): Promise<number | null> {
  if (!name || typeof name !== 'string') return null

  const trimmed = name.trim()
  if (!trimmed) return null

  try {
    const result = await payload.find({
      collection: 'employees',
      where: {
        name: { equals: trimmed },
      },
      limit: 1,
    })

    if (result.totalDocs > 0) {
      return result.docs[0].id
    }

    console.warn(`Could not find employee: ${trimmed}`)
    return null
  } catch (error) {
    console.warn(`Error looking up employee ${trimmed}:`, error)
    return null
  }
}

/**
 * Download file from URL and upload to Payload media collection
 * 
 * @deprecated This function is no longer used. Media should be uploaded via uploadLocalMedia.ts
 * which properly handles the split between 'images' and 'documents' collections.
 * 
 * @see scripts/wordpress/utils/uploadLocalMedia.ts
 */
export async function downloadAndUploadMedia(
  payload: any,
  url: string | number | undefined,
  altText?: string,
  maxSizeMB: number = 60, // Temporarily increased for migration
): Promise<number | null> {
  if (!url || typeof url !== 'string') return null

  const trimmed = url.trim()
  if (!trimmed) return null

  try {
    // Extract filename from URL
    const urlObj = new URL(trimmed)
    const filename = urlObj.pathname.split('/').pop() || 'download'

    // Check if media already exists by filename
    const existing = await payload.find({
      collection: 'media',
      where: {
        filename: { equals: filename },
      },
      limit: 1,
    })

    if (existing.totalDocs > 0) {
      console.log(`  ℹ️  Media already exists: ${filename}`)
      return existing.docs[0].id
    }

    // Check file size first with HEAD request
    console.log(`  📥 Checking size: ${filename}`)
    const headResponse = await fetch(trimmed, { method: 'HEAD' })
    if (headResponse.ok) {
      const contentLength = headResponse.headers.get('content-length')
      if (contentLength) {
        const sizeMB = parseInt(contentLength) / (1024 * 1024)
        if (sizeMB > maxSizeMB) {
          console.warn(`  ⚠️  File too large: ${filename} (${sizeMB.toFixed(2)}MB > ${maxSizeMB}MB limit)`)
          console.warn(`      Please upload manually: ${trimmed}`)
          return null
        }
        console.log(`  📥 Downloading: ${filename} (${sizeMB.toFixed(2)}MB)`)
      }
    }

    // Download file from URL
    const response = await fetch(trimmed)
    if (!response.ok) {
      console.warn(`  ⚠️  Failed to download: ${trimmed} (${response.status})`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Double-check size after download
    const sizeMB = buffer.length / (1024 * 1024)
    if (sizeMB > maxSizeMB) {
      console.warn(`  ⚠️  File too large after download: ${filename} (${sizeMB.toFixed(2)}MB > ${maxSizeMB}MB limit)`)
      console.warn(`      Please upload manually: ${trimmed}`)
      return null
    }

    // Determine mimetype from response or filename
    const contentType = response.headers.get('content-type') || getMimeType(filename)

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
        alt: altText || filename,
      },
      file,
    })

    console.log(`  ✅ Uploaded: ${filename} (ID: ${uploaded.id})`)
    return uploaded.id
  } catch (error) {
    console.warn(`  ⚠️  Error downloading/uploading ${trimmed}:`, error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Clean WordPress filename by removing timestamp postfixes
 *
 * WordPress sometimes adds timestamp postfixes to filenames:
 * - Pattern: -e[timestamp] or -e[timestamp]-[number]
 * - Examples:
 *   - "image-e1762933634869.jpg" → "image.jpg"
 *   - "photo-e1734089581370-scaled.jpg" → "photo-scaled.jpg"
 *   - "file-e1762933634869-1.jpg" → "file-1.jpg"
 *
 * This function removes these postfixes to get the original filename.
 *
 * @param filename - WordPress filename (may contain timestamp postfix)
 * @returns Cleaned filename without timestamp postfix
 */
export function cleanWordPressFilename(filename: string, debug = false): string {
  if (!filename) return filename

  // Remove timestamp postfix pattern: -e[digits]
  // Handles these cases:
  // - "file-e1762933634869.jpg" → "file.jpg"
  // - "file-e1762933634869-scaled.jpg" → "file-scaled.jpg"
  // - "file-e1762933634869-1.jpg" → "file-1.jpg"
  const cleaned = filename.replace(/-e\d+(?=-|\.)/g, '')
  
  if (debug && cleaned !== filename) {
    console.log(`  🧹 Cleaned filename: "${filename}" → "${cleaned}"`)
  }
  
  return cleaned
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
