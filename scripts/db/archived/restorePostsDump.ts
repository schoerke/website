// @ts-nocheck
/**
 * Restore Posts from Dump with Slug Generation
 *
 * This script restores post data from data/dumps/posts-dump.json
 * and automatically generates slugs from titles.
 *
 * Usage:
 *   pnpm restore:posts-dump
 */
import config from '@payload-config'
import 'dotenv/config'
import { readFileSync } from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import { fileURLToPath } from 'url'
import { generateSlug } from '../src/utils/slug.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Normalize Lexical editor content to ensure compatibility
 */
function normalizeLexicalContent(content: any): any {
  if (!content || typeof content !== 'object') {
    return content
  }

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

  if ('text' in node && !node.type) {
    node.type = 'text'
  }

  if (!node.type) {
    if (Array.isArray(node.children)) {
      node.type = 'paragraph'
    } else if ('text' in node) {
      node.type = 'text'
    }
  }

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
  console.log('📦 Restoring Posts from Dump')
  console.log('='.repeat(60))

  // Load dump file
  const dumpPath = path.resolve(__dirname, '../../data/dumps/posts-dump.json')
  console.log(`\n📂 Loading dump from: ${dumpPath}`)

  const postsData = JSON.parse(readFileSync(dumpPath, 'utf-8'))
  console.log(`   Found ${postsData.length} posts in dump\n`)

  let createdCount = 0
  let updatedCount = 0
  let errorCount = 0

  for (const postData of postsData) {
    try {
      console.log(`\n📝 Processing: ${postData.title}`)

      // Generate slug from title
      const slug = generateSlug(postData.title)
      console.log(`   🔗 Generated slug: ${slug}`)
      postData.slug = slug

      // Normalize Lexical content
      if (postData.content) {
        postData.content = normalizeLexicalContent(postData.content)
      }

      // Handle image reference
      if (postData.image) {
        const imageId = typeof postData.image === 'number' ? postData.image : postData.image?.id
        if (imageId) {
          try {
            await payload.findByID({
              collection: 'media',
              id: imageId,
            })
            postData.image = imageId
          } catch {
            console.log(`   ⚠️  Removing invalid image reference (ID: ${imageId})`)
            postData.image = null
          }
        } else {
          postData.image = null
        }
      }

      // Handle artist relationships
      if (postData.artists && Array.isArray(postData.artists)) {
        const validArtists = []
        for (const artist of postData.artists) {
          const artistId = typeof artist === 'number' ? artist : artist?.id
          if (artistId) {
            try {
              await payload.findByID({
                collection: 'artists',
                id: artistId,
              })
              validArtists.push(artistId)
            } catch {
              console.log(`   ⚠️  Skipping invalid artist reference (ID: ${artistId})`)
            }
          }
        }
        postData.artists = validArtists
      }

      // Handle createdBy relationship
      if (postData.createdBy) {
        const employeeId = typeof postData.createdBy === 'number' ? postData.createdBy : postData.createdBy?.id
        if (employeeId) {
          try {
            await payload.findByID({
              collection: 'employees',
              id: employeeId,
            })
            postData.createdBy = employeeId
          } catch {
            console.log(`   ⚠️  Removing invalid createdBy reference (ID: ${employeeId})`)
            postData.createdBy = 1 // Default to Eva Wagner
          }
        } else {
          postData.createdBy = 1 // Default to Eva Wagner
        }
      }

      // Check if post already exists by slug
      const existingPosts = await payload.find({
        collection: 'posts',
        where: {
          slug: {
            equals: slug,
          },
        },
        limit: 1,
      })

      if (existingPosts.docs.length > 0) {
        // Update existing post
        const existingPost = existingPosts.docs[0]
        console.log(`   ↻ Updating existing post...`)

        await payload.update({
          collection: 'posts',
          id: existingPost.id,
          data: {
            ...postData,
            id: undefined,
            updatedAt: undefined,
            createdAt: undefined,
          },
        })

        updatedCount++
        console.log(`   ✅ Updated: ${postData.title}`)
      } else {
        // Create new post
        console.log(`   + Creating new post...`)

        await payload.create({
          collection: 'posts',
          data: {
            ...postData,
            id: undefined,
            updatedAt: undefined,
            createdAt: undefined,
          },
        })

        createdCount++
        console.log(`   ✅ Created: ${postData.title}`)
      }
    } catch (error: any) {
      errorCount++
      console.error(`   ❌ Error processing ${postData.title}:`, error.message)
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
    console.log('\n🎉 All posts restored successfully!')
    console.log('\nNext steps:')
    console.log('  1. Verify data in admin panel')
    console.log('  2. Check generated slugs are correct')
  }

  process.exit(0)
}

main()
