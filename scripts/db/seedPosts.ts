/**
 * Seed Posts Collection
 *
 * Seeds the Posts collection with generic test posts for each category.
 * Creates posts in both English and German locales with lorem ipsum content.
 *
 * Features:
 * - Creates 5 posts per category (news, projects, home)
 * - Creates 3 artist-specific posts per artist (news and projects)
 * - Uses numbered titles for easy identification
 * - Lorem ipsum content for testing
 * - All posts are published by default
 *
 * Usage:
 *   pnpm payload run scripts/db/seedPosts.ts
 *   pnpm seed:all  # Part of master seed script
 *
 * @see scripts/db/seedAll.ts - Master orchestration script
 * @see scripts/db/seedArtists.ts - Artist seeding (run first)
 */

import config from '@payload-config'
import { getPayload } from 'payload'

const POSTS_PER_CATEGORY = 5
const GENERAL_CATEGORIES = ['news', 'projects', 'home']
const ARTIST_POST_CATEGORIES = ['news', 'projects']
const POSTS_PER_ARTIST = 3 // 3 news + 3 projects per artist

/**
 * Generate lorem ipsum rich text content
 */
function generateLoremContent() {
  return {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
              type: 'text',
              version: 1,
            },
          ],
          direction: null,
          format: '',
          indent: 0,
          textFormat: 0,
          textStyle: '',
          version: 1,
        },
        {
          type: 'paragraph',
          children: [
            {
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.',
              type: 'text',
              version: 1,
            },
          ],
          direction: null,
          format: '',
          indent: 0,
          textFormat: 0,
          textStyle: '',
          version: 1,
        },
      ],
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

/**
 * Main seeding function
 *
 * Creates:
 * 1. General posts for each category (5 per category)
 * 2. Artist-specific posts (3 news + 3 projects per artist)
 *
 * @throws {Error} If post creation fails
 */
async function run() {
  try {
    const payload = await getPayload({ config })

    // Get all artists
    const artists = await payload.find({
      collection: 'artists',
      limit: 100,
    })

    console.log(`Found ${artists.totalDocs} artists\n`)

    // 1. Create general category posts
    console.log('📝 Creating general category posts...')
    for (const category of GENERAL_CATEGORIES) {
      for (let i = 1; i <= POSTS_PER_CATEGORY; i++) {
        const postEn = {
          title: `${category.charAt(0).toUpperCase() + category.slice(1)} Post ${i}`,
          content: generateLoremContent(),
          categories: [category],
          artists: [],
          createdBy: 1, // Eva Wagner
          _status: 'published',
        }

        const created = await payload.create({
          collection: 'posts',
          data: postEn,
          locale: 'en',
        })

        console.log(`  ✓ Created: ${postEn.title} (en)`)

        await payload.update({
          collection: 'posts',
          id: created.id,
          data: {
            title: `${category.charAt(0).toUpperCase() + category.slice(1)} Beitrag ${i}`,
            content: generateLoremContent(),
          },
          locale: 'de',
        })
      }
    }

    // 2. Create artist-specific posts
    console.log('\n🎭 Creating artist-specific posts...')
    for (const artist of artists.docs) {
      console.log(`\n  Artist: ${artist.name}`)

      for (const category of ARTIST_POST_CATEGORIES) {
        for (let i = 1; i <= POSTS_PER_ARTIST; i++) {
          const postEn = {
            title: `${artist.name} - ${category.charAt(0).toUpperCase() + category.slice(1)} ${i}`,
            content: generateLoremContent(),
            categories: [category],
            artists: [artist.id],
            createdBy: 1,
            _status: 'published',
          }

          const created = await payload.create({
            collection: 'posts',
            data: postEn,
            locale: 'en',
          })

          console.log(`    ✓ Created: ${postEn.title} (en)`)

          await payload.update({
            collection: 'posts',
            id: created.id,
            data: {
              title: `${artist.name} - ${category.charAt(0).toUpperCase() + category.slice(1)} ${i}`,
              content: generateLoremContent(),
            },
            locale: 'de',
          })
        }
      }
    }

    const totalPosts =
      GENERAL_CATEGORIES.length * POSTS_PER_CATEGORY +
      artists.docs.length * ARTIST_POST_CATEGORIES.length * POSTS_PER_ARTIST

    console.log(`\n✅ Successfully seeded ${totalPosts} posts`)
    console.log(`   - ${GENERAL_CATEGORIES.length * POSTS_PER_CATEGORY} general posts`)
    console.log(`   - ${artists.docs.length * ARTIST_POST_CATEGORIES.length * POSTS_PER_ARTIST} artist-specific posts`)
  } catch (error) {
    console.error('❌ Error seeding posts:', error)
    process.exit(1)
  }

  process.exit(0)
}

await run()
