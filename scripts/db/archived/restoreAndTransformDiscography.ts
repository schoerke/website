/**
 * Restore and Transform Discography Script
 *
 * This script restores artist data from the backup dump and transforms
 * the old richText discography format to the new array structure during restoration.
 *
 * Usage:
 *   pnpm tsx scripts/db/restoreAndTransformDiscography.ts
 *
 * Safety:
 * - Reads from data/dumps/artists-dump.json (created before schema change)
 * - Transforms old discography structure to new array format
 * - Updates artists in database with transformed data
 * - Idempotent: Can be run multiple times safely
 */

import config from '@payload-config'
import 'dotenv/config'
import { readFile } from 'fs/promises'
import path from 'path'
import { getPayload } from 'payload'

interface TextNode {
  type: 'text' | 'linebreak'
  format?: number
  text?: string
}

interface ParagraphNode {
  type: 'paragraph' | 'heading'
  children: TextNode[]
  tag?: string
}

type RecordingRole = 'soloist' | 'conductor' | 'ensemble_member' | 'chamber_musician' | 'accompanist'

/**
 * Map heading text to recording role
 */
function parseRoleFromHeading(headingText: string): RecordingRole | null {
  const text = headingText.toLowerCase().trim()

  if (text === 'soloist' || text === 'solist') return 'soloist'
  if (text === 'conductor' || text === 'dirigent') return 'conductor'
  if (text === 'accompanist' || text === 'begleiter') return 'accompanist'
  if (text === 'chamber musician' || text === 'kammermusiker') return 'chamber_musician'
  if (text === 'ensemble member' || text === 'ensemblemitglied') return 'ensemble_member'

  return null
}

/**
 * Create richText structure for a group of paragraphs
 */
function createRichTextFromParagraphs(paragraphs: ParagraphNode[]): any {
  return {
    root: {
      type: 'root',
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
      children: paragraphs,
    },
  }
}

/**
 * Group paragraphs by role based on H1/H2 headings
 */
function groupByRole(nodes: ParagraphNode[]): Array<{ role: RecordingRole; paragraphs: ParagraphNode[] }> {
  const groups: Array<{ role: RecordingRole; paragraphs: ParagraphNode[] }> = []
  let currentRole: RecordingRole = 'soloist'
  let currentParagraphs: ParagraphNode[] = []

  for (const node of nodes) {
    if (node.type === 'heading' && (node.tag === 'h1' || node.tag === 'h2')) {
      if (currentParagraphs.length > 0) {
        groups.push({ role: currentRole, paragraphs: [...currentParagraphs] })
        currentParagraphs = []
      }

      const headingText = node.children
        .filter((child) => child.type === 'text' && child.text)
        .map((child) => child.text)
        .join(' ')

      const role = parseRoleFromHeading(headingText)
      if (role) {
        currentRole = role
      }
      continue
    }

    if (node.type === 'paragraph') {
      currentParagraphs.push(node)
    }
  }

  if (currentParagraphs.length > 0) {
    groups.push({ role: currentRole, paragraphs: currentParagraphs })
  }

  return groups
}

/**
 * Check if discography is in old richText format
 */
function isOldFormat(discography: any): boolean {
  return discography && discography.root && !Array.isArray(discography)
}

/**
 * Convert old richText format to new array format
 */
function transformDiscography(oldDiscography: any): any[] {
  if (!isOldFormat(oldDiscography)) {
    return [] // Already transformed or empty
  }

  const nodes = oldDiscography?.root?.children || []
  if (nodes.length === 0) {
    return []
  }

  const roleGroups = groupByRole(nodes)
  if (roleGroups.length === 0) {
    return []
  }

  return roleGroups.map((group) => ({
    role: group.role,
    recordings: createRichTextFromParagraphs(group.paragraphs),
  }))
}

async function restoreAndTransform() {
  console.log('=== Restore and Transform Discography ===\n')

  try {
    const payload = await getPayload({ config })

    // Read backup dump
    const dumpPath = path.join(process.cwd(), 'data', 'dumps', 'artists-dump.json')
    console.log(`Reading backup from: ${dumpPath}`)

    const dumpContent = await readFile(dumpPath, 'utf-8')
    const artists = JSON.parse(dumpContent)

    console.log(`Found ${artists.length} artists in backup\n`)

    let transformedCount = 0
    let skippedCount = 0
    const errors: Array<{ artist: string; error: string }> = []

    for (const artist of artists) {
      try {
        console.log(`\n📝 Processing: ${artist.name}`)

        // Check if artist has discography data in either locale
        const hasDE = artist.discography?.de && isOldFormat(artist.discography.de)
        const hasEN = artist.discography?.en && isOldFormat(artist.discography.en)

        if (!hasDE && !hasEN) {
          console.log('   ⏭️  No old-format discography found')
          skippedCount++
          continue
        }

        // Transform DE locale
        const transformedDE = hasDE ? transformDiscography(artist.discography.de) : []
        console.log(`   🔄 Transformed DE: ${transformedDE.length} role sections`)

        // Transform EN locale
        const transformedEN = hasEN ? transformDiscography(artist.discography.en) : transformedDE
        console.log(`   🔄 Transformed EN: ${transformedEN.length} role sections`)

        if (transformedDE.length === 0 && transformedEN.length === 0) {
          console.log('   ⏭️  No valid content to restore')
          skippedCount++
          continue
        }

        // Update DE locale
        await payload.update({
          collection: 'artists',
          id: artist.id,
          data: {
            discography: transformedDE,
          },
          locale: 'de',
        })

        // Update EN locale
        await payload.update({
          collection: 'artists',
          id: artist.id,
          data: {
            discography: transformedEN,
          },
          locale: 'en',
        })

        console.log(`   ✅ Restored and transformed successfully`)
        transformedCount++
      } catch (error) {
        console.error(`   ❌ Error processing ${artist.name}:`, error)
        errors.push({
          artist: artist.name,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Summary
    console.log('\n=== Restore Complete ===')
    console.log(`✅ Restored and transformed: ${transformedCount} artists`)
    console.log(`⏭️  Skipped: ${skippedCount} artists`)

    if (errors.length > 0) {
      console.log(`\n❌ Errors: ${errors.length}`)
      errors.forEach(({ artist, error }) => {
        console.log(`   - ${artist}: ${error}`)
      })
    }

    console.log('\n=== Next Steps ===')
    console.log('1. Verify the restored data in Payload CMS admin')
    console.log('2. Check that discography is displayed as array entries with role dropdowns')
    console.log('3. Run the updated migrateDiscographyToRecordings.ts script')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Restore failed:', error)
    process.exit(1)
  }
}

// Run the restore
restoreAndTransform()
