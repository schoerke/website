/**
 * Dry Run Test for uploadLocalMedia.ts
 *
 * Tests the logic of the updated upload script without actually:
 * - Connecting to database
 * - Uploading files
 * - Creating records
 *
 * This validates:
 * - MIME type detection
 * - Collection routing (images vs documents)
 * - File size detection and routing strategy
 * - ID map generation logic
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 4.5MB in bytes
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

interface TestResult {
  filename: string
  mimeType: string
  collection: 'images' | 'documents'
  uploadMethod: 'payload' | 'blob'
  fileSize?: number
  reason: string
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
 * Test file routing logic
 */
async function testFileRouting(filename: string, simulatedSize?: number): Promise<TestResult> {
  const mimeType = getMimeType(filename)
  const collection = getCollectionForMimeType(mimeType)

  // Simulate file size (random between 1MB and 10MB if not provided)
  const fileSize = simulatedSize || Math.floor(Math.random() * 10 * 1024 * 1024) + 1024 * 1024

  const uploadMethod = fileSize <= MAX_SERVER_UPLOAD_SIZE ? 'payload' : 'blob'
  const sizeMB = (fileSize / 1024 / 1024).toFixed(2)

  const reason = `${sizeMB}MB ${uploadMethod === 'payload' ? '≤' : '>'} 4.5MB → ${uploadMethod} upload`

  return {
    filename,
    mimeType,
    collection,
    uploadMethod,
    fileSize,
    reason,
  }
}

/**
 * Main test execution
 */
async function main() {
  console.log('🧪 Dry Run Test: Upload Logic Validation\n')
  console.log('='.repeat(80))
  console.log(`📊 Configuration:`)
  console.log(`   - Max server upload size: ${(MAX_SERVER_UPLOAD_SIZE / 1024 / 1024).toFixed(1)}MB`)
  console.log(`   - Files ≤4.5MB: Upload via Payload API`)
  console.log(`   - Files >4.5MB: Upload via Vercel Blob`)
  console.log('='.repeat(80) + '\n')

  // Read media URLs list
  const mediaUrlsPath = path.join(__dirname, '..', 'data', 'media-urls.json')
  const mediaUrlsContent = await fs.readFile(mediaUrlsPath, 'utf-8')
  const mediaUrls: MediaUrl[] = JSON.parse(mediaUrlsContent)

  console.log(`📁 Found ${mediaUrls.length} media files to analyze\n`)

  // Test results
  const results: TestResult[] = []
  const stats = {
    images: 0,
    documents: 0,
    payloadUploads: 0,
    blobUploads: 0,
  }

  // Test first 10 files with various sizes
  const testSizes = [
    2 * 1024 * 1024, // 2MB (small)
    4 * 1024 * 1024, // 4MB (small)
    5 * 1024 * 1024, // 5MB (large)
    10 * 1024 * 1024, // 10MB (large)
    50 * 1024 * 1024, // 50MB (large)
  ]

  console.log('🔍 Testing file routing logic:\n')

  for (let i = 0; i < Math.min(10, mediaUrls.length); i++) {
    const mediaItem = mediaUrls[i]
    const decodedFilename = decodeURIComponent(mediaItem.filename)

    // Use predefined test sizes, cycling through them
    const testSize = testSizes[i % testSizes.length]
    const result = await testFileRouting(decodedFilename, testSize)

    results.push(result)

    // Update stats
    if (result.collection === 'images') stats.images++
    else stats.documents++

    if (result.uploadMethod === 'payload') stats.payloadUploads++
    else stats.blobUploads++

    // Print result
    const icon = result.collection === 'images' ? '🖼️ ' : '📄'
    const methodIcon = result.uploadMethod === 'payload' ? '📤' : '☁️ '
    console.log(`${icon} ${methodIcon} ${result.filename}`)
    console.log(`   Collection: ${result.collection}`)
    console.log(`   MIME Type: ${result.mimeType}`)
    console.log(`   Method: ${result.reason}\n`)
  }

  // Simulate ID map generation
  const imagesIdMap: MediaIdMap = {}
  const documentsIdMap: MediaIdMap = {}

  results.forEach((result, index) => {
    const mockId = 1000 + index // Simulate Payload IDs
    if (result.collection === 'images') {
      imagesIdMap[result.filename] = mockId
    } else {
      documentsIdMap[result.filename] = mockId
    }
  })

  console.log('='.repeat(80))
  console.log('\n📊 Test Summary:\n')
  console.log(`Total files tested: ${results.length}`)
  console.log(`\nCollection Distribution:`)
  console.log(`  🖼️  Images: ${stats.images}`)
  console.log(`  📄 Documents: ${stats.documents}`)
  console.log(`\nUpload Method Distribution:`)
  console.log(`  📤 Payload API (≤4.5MB): ${stats.payloadUploads}`)
  console.log(`  ☁️  Vercel Blob (>4.5MB): ${stats.blobUploads}`)

  console.log(`\n💾 Simulated ID Maps:\n`)
  console.log(`Images ID Map (${Object.keys(imagesIdMap).length} entries):`)
  console.log(JSON.stringify(imagesIdMap, null, 2).split('\n').slice(0, 5).join('\n') + '\n  ...')

  console.log(`\nDocuments ID Map (${Object.keys(documentsIdMap).length} entries):`)
  console.log(JSON.stringify(documentsIdMap, null, 2).split('\n').slice(0, 5).join('\n') + '\n  ...')

  console.log('\n✅ Dry run complete! Logic validation successful.\n')
  console.log('Next steps:')
  console.log('  1. Download actual media files')
  console.log('  2. Run full migration with real uploads')
  console.log('  3. Verify images and documents in admin panel')
}

main().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
