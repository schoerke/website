/**
 * Migrate artist projects from post relationships to artist.projects field
 *
 * This script populates the new artist.projects field by finding all posts
 * with category='projects' that are linked to each artist, then adding them
 * to the artist's projects array in chronological order (newest first).
 *
 * Safety features:
 * - Dry run mode by default (preview changes without applying)
 * - Only processes artists that have linked projects
 * - Preserves existing projects order if any exist
 * - Respects the 10-project maximum limit
 *
 * Usage:
 *   # Preview changes (dry run)
 *   pnpm tsx scripts/db/migrateArtistProjects.ts
 *
 *   # Apply changes
 *   pnpm tsx scripts/db/migrateArtistProjects.ts --apply
 */

import 'dotenv/config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'

async function getConfig() {
  const configModule = await import('../../src/payload.config')
  const configMaybePromise = configModule.default
  return typeof configMaybePromise.then === 'function' ? await configMaybePromise : configMaybePromise
}

async function run() {
  const isDryRun = !process.argv.includes('--apply')

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be applied')
    console.log('   Run with --apply flag to execute migration\n')
  }

  const config = await getConfig()
  const payload: Payload = await getPayload({ config })

  console.log('Fetching all artists...')
  const artists = await payload.find({
    collection: 'artists',
    limit: 1000,
    locale: 'de', // Use German locale as primary
  })

  console.log(`Found ${artists.docs.length} artists\n`)

  let migrationCount = 0
  let skippedCount = 0

  for (const artist of artists.docs) {
    // Find all published posts with category='projects' that link to this artist
    const projectPosts = await payload.find({
      collection: 'posts',
      where: {
        and: [
          {
            categories: {
              contains: 'projects',
            },
          },
          {
            artists: {
              contains: artist.id,
            },
          },
          {
            _status: {
              equals: 'published',
            },
          },
        ],
      },
      limit: 100,
      locale: 'de',
      sort: '-date', // Newest first
    })

    if (projectPosts.docs.length === 0) {
      console.log(`⊘ Skipping ${artist.name} - No project posts found`)
      skippedCount++
      continue
    }

    // Get current projects (if any exist from manual editing)
    const currentProjects = (artist.projects || []) as number[]
    const currentProjectIds = Array.isArray(currentProjects)
      ? currentProjects.map((p) => (typeof p === 'number' ? p : (p as { id: number }).id))
      : []

    // Build new projects array: keep existing order, append new ones
    const newProjectIds: number[] = []
    const projectTitles: string[] = []

    // First, add existing projects to preserve manual ordering
    for (const projId of currentProjectIds) {
      if (typeof projId === 'number') {
        newProjectIds.push(projId)
      }
    }

    // Then, add new projects that aren't already in the list
    for (const post of projectPosts.docs) {
      const postId = typeof post.id === 'number' ? post.id : parseInt(String(post.id), 10)
      if (!currentProjectIds.includes(postId) && newProjectIds.length < 10) {
        newProjectIds.push(postId)
      }
      if (newProjectIds.includes(postId)) {
        projectTitles.push(post.title || 'Untitled')
      }
    }

    // Limit to 10 projects
    const limitedProjectIds = newProjectIds.slice(0, 10)

    console.log(`📝 ${artist.name}:`)
    console.log(`   Found ${projectPosts.docs.length} project post(s)`)
    console.log(`   Current projects: ${currentProjectIds.length}`)
    console.log(`   New projects: ${limitedProjectIds.length - currentProjectIds.length}`)
    console.log(`   Total projects: ${limitedProjectIds.length}/10`)
    if (projectTitles.length > 0) {
      console.log(`   Projects: ${projectTitles.slice(0, limitedProjectIds.length).join(', ')}`)
    }

    if (!isDryRun) {
      try {
        await payload.update({
          collection: 'artists',
          id: String(artist.id),
          locale: 'de',
          data: {
            projects: limitedProjectIds,
          },
          // Prevent the syncArtistProjects hook from running during migration
          context: {
            syncingProjects: true,
          },
        })

        console.log(`   ✓ Migrated successfully`)
      } catch (error) {
        console.error(`   ❌ Migration failed:`, error)
        process.exit(1)
      }
    }

    console.log('')
    migrationCount++
  }

  console.log('─'.repeat(50))
  console.log(`Summary:`)
  console.log(`  Artists with projects: ${migrationCount}`)
  console.log(`  Artists skipped: ${skippedCount}`)

  if (isDryRun) {
    console.log(`\n✓ Dry run complete - no changes made`)
    console.log(`  Run with --apply flag to execute migration`)
  } else {
    console.log(`\n✓ Migration complete!`)
    console.log(`  Note: The syncArtistProjects hook will keep projects in sync going forward`)
  }

  process.exit(0)
}

run().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
