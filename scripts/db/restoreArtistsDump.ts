// @ts-nocheck
/**
 * Restore Artists from Dump
 *
 * This script restores artist data from data/dumps/artists-dump.json
 * This dump contains the ACTUAL production discography data.
 *
 * Usage:
 *   pnpm restore:artists-dump
 */
import config from '@payload-config'
import 'dotenv/config'
import { readFileSync } from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Normalize Lexical editor content to ensure compatibility
 * This fixes issues with older Lexical formats
 */
function normalizeLexicalContent(content: any): any {
  if (!content || typeof content !== 'object') {
    return content
  }

  // Recursively process all nodes
  if (content.root) {
    return {
      root: normalizeNode(content.root),
    }
  }

  return content
}

function normalizeNode(node: any): any {
  if (!node || typeof node !== 'object') {
    return node
  }

  // If this is a text node (has 'text' property), ensure it has type 'text'
  if ('text' in node && !node.type) {
    node.type = 'text'
  }

  // Ensure type is set (default to paragraph if missing and has children)
  if (!node.type) {
    if (Array.isArray(node.children)) {
      node.type = 'paragraph'
    } else if ('text' in node) {
      node.type = 'text'
    }
  }

  // Process children recursively
  if (Array.isArray(node.children)) {
    node.children = node.children.map((child: any) => {
      if (typeof child === 'object') {
        return normalizeNode(child)
      }
      return child
    })
  }

  return node
}

const main = async () => {
  const payload = await getPayload({ config })

  console.log('='.repeat(60))
  console.log('📦 Restoring Artists from Dump')
  console.log('='.repeat(60))

  // Load dump file
  const dumpPath = path.resolve(__dirname, '../../data/dumps/artists-dump.json')
  console.log(`\n📂 Loading dump from: ${dumpPath}`)

  const artistsData = JSON.parse(readFileSync(dumpPath, 'utf-8'))
  console.log(`   Found ${artistsData.length} artists in dump\n`)

  let createdCount = 0
  let updatedCount = 0
  let errorCount = 0

  for (const artistData of artistsData) {
    try {
      console.log(`\n📝 Processing: ${artistData.name}`)

      // Clean up the data - remove empty YouTube links
      if (artistData.youtubeLinks) {
        artistData.youtubeLinks = artistData.youtubeLinks.filter((link: any) => {
          return link.label && link.url
        })
      }

      // Normalize Lexical content to fix format issues
      if (artistData.biography) {
        const before = JSON.stringify(artistData.biography.root?.children?.[0]?.children?.[0])
        artistData.biography = normalizeLexicalContent(artistData.biography)
        const after = JSON.stringify(artistData.biography.root?.children?.[0]?.children?.[0])
        if (before !== after) {
          console.log(`   🔧 Normalized biography`)
        }
      }
      if (artistData.repertoire) {
        artistData.repertoire = normalizeLexicalContent(artistData.repertoire)
      }
      if (artistData.discography) {
        artistData.discography = normalizeLexicalContent(artistData.discography)
      }

      // Remove invalid image references that might not exist
      if (artistData.image) {
        const imageId = typeof artistData.image === 'number' ? artistData.image : artistData.image?.id
        if (imageId) {
          try {
            await payload.findByID({
              collection: 'media',
              id: imageId,
            })
            // Media exists, use just the ID
            artistData.image = imageId
          } catch {
            // Media doesn't exist, remove reference
            console.log(`   ⚠️  Removing invalid image reference (ID: ${imageId})`)
            artistData.image = null
          }
        } else {
          artistData.image = null
        }
      }

      // Check if artist already exists
      const existingArtists = await payload.find({
        collection: 'artists',
        where: {
          name: {
            equals: artistData.name,
          },
        },
        limit: 1,
      })

      if (existingArtists.docs.length > 0) {
        // Update existing artist with data from dump
        const existingArtist = existingArtists.docs[0]

        console.log(`   ↻ Updating existing artist...`)

        // Update with all data from dump
        await payload.update({
          collection: 'artists',
          id: existingArtist.id,
          data: {
            ...artistData,
            id: undefined, // Remove id from update data
            updatedAt: undefined,
            createdAt: undefined,
          },
        })

        updatedCount++
        console.log(`   ✅ Updated: ${artistData.name}`)

        // Log what was restored
        if (artistData.discography) {
          const nodeCount = artistData.discography?.root?.children?.length || 0
          console.log(`      → Discography: ${nodeCount} nodes`)
        }
      } else {
        // Create new artist
        console.log(`   + Creating new artist...`)

        await payload.create({
          collection: 'artists',
          data: {
            ...artistData,
            id: undefined,
            updatedAt: undefined,
            createdAt: undefined,
          },
        })

        createdCount++
        console.log(`   ✅ Created: ${artistData.name}`)
      }
    } catch (error: any) {
      errorCount++
      console.error(`   ❌ Error processing ${artistData.name}:`, error.message)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 Restoration Summary')
  console.log('='.repeat(60))
  console.log(`✅ Created: ${createdCount}`)
  console.log(`↻ Updated: ${updatedCount}`)
  console.log(`❌ Errors: ${errorCount}`)
  console.log('='.repeat(60))

  if (errorCount === 0) {
    console.log('\n🎉 All artists restored successfully!')
    console.log('\nNext steps:')
    console.log('  1. Verify data in admin panel')
    console.log('  2. Run migration: pnpm migrate:discography')
  }

  process.exit(0)
}

main()
