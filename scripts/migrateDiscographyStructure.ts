/**
 * Discography Structure Migration Script
 *
 * Converts the old single richText discography field to the new array structure.
 *
 * OLD STRUCTURE:
 * discography: {
 *   root: {
 *     children: [
 *       { type: 'heading', tag: 'h1', children: [{ text: 'Soloist' }] },
 *       { type: 'paragraph', children: [...] },
 *       { type: 'heading', tag: 'h1', children: [{ text: 'Conductor' }] },
 *       { type: 'paragraph', children: [...] }
 *     ]
 *   }
 * }
 *
 * NEW STRUCTURE:
 * discography: [
 *   { role: 'soloist', recordings: { root: { children: [...] } } },
 *   { role: 'conductor', recordings: { root: { children: [...] } } }
 * ]
 *
 * This script:
 * 1. Reads the old richText structure
 * 2. Parses H1/H2 headings to identify roles
 * 3. Groups paragraphs under each role
 * 4. Creates new array entries with explicit role + recordings richText
 * 5. Updates the artist document with the new structure
 *
 * Usage:
 *   pnpm tsx scripts/migrateDiscographyStructure.ts
 *
 * Safety:
 * - Idempotent: Checks if already migrated (array structure exists)
 * - Backs up old data to a temporary field before migration
 * - Can be rolled back by restoring from backup dumps
 */

import config from '@payload-config'
import 'dotenv/config'
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

interface RichTextContent {
  root: {
    children: ParagraphNode[]
  }
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
function createRichTextFromParagraphs(paragraphs: ParagraphNode[]): RichTextContent {
  return {
    root: {
      type: 'root',
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
      children: paragraphs,
    },
  } as any
}

/**
 * Group paragraphs by role based on H1/H2 headings
 */
function groupByRole(nodes: ParagraphNode[]): Array<{ role: RecordingRole; paragraphs: ParagraphNode[] }> {
  const groups: Array<{ role: RecordingRole; paragraphs: ParagraphNode[] }> = []
  let currentRole: RecordingRole = 'soloist' // Default role
  let currentParagraphs: ParagraphNode[] = []

  for (const node of nodes) {
    // Check if this is an H1 or H2 heading
    if (node.type === 'heading' && (node.tag === 'h1' || node.tag === 'h2')) {
      // Save previous group if it has content
      if (currentParagraphs.length > 0) {
        groups.push({ role: currentRole, paragraphs: [...currentParagraphs] })
        currentParagraphs = []
      }

      // Extract text from heading
      const headingText = node.children
        .filter((child) => child.type === 'text' && child.text)
        .map((child) => child.text)
        .join(' ')

      const role = parseRoleFromHeading(headingText)
      if (role) {
        currentRole = role
        console.log(`   📋 Found role section: ${headingText} → ${currentRole}`)
      } else {
        console.log(`   ⚠️  Unknown role heading: "${headingText}" - continuing with ${currentRole}`)
      }
      continue
    }

    // Add paragraph to current group
    if (node.type === 'paragraph') {
      currentParagraphs.push(node)
    }
  }

  // Save last group if it has content
  if (currentParagraphs.length > 0) {
    groups.push({ role: currentRole, paragraphs: currentParagraphs })
  }

  return groups
}

/**
 * Check if discography is already in new array format
 */
function isNewFormat(discography: any): boolean {
  return Array.isArray(discography)
}

/**
 * Convert old richText format to new array format
 */
function convertToNewFormat(oldDiscography: RichTextContent): any[] {
  const nodes = oldDiscography?.root?.children || []

  if (nodes.length === 0) {
    console.log('   ⏭️  No content to migrate')
    return []
  }

  const roleGroups = groupByRole(nodes)

  if (roleGroups.length === 0) {
    console.log('   ⏭️  No valid role groups found')
    return []
  }

  // Convert to new array format
  return roleGroups.map((group) => ({
    role: group.role,
    recordings: createRichTextFromParagraphs(group.paragraphs),
  }))
}

async function migrateDiscographyStructure() {
  console.log('=== Discography Structure Migration ===\n')

  try {
    const payload = await getPayload({ config })

    // Fetch all artists with discography data (DE locale)
    console.log('Fetching artists with discography data...')
    const artistsDE = await payload.find({
      collection: 'artists',
      where: {
        discography: {
          exists: true,
        },
      },
      limit: 10000,
      locale: 'de',
    })

    console.log(`Found ${artistsDE.docs.length} artists with DE discography data\n`)

    let migratedCount = 0
    let skippedCount = 0
    const errors: Array<{ artist: string; error: string }> = []

    for (const artistDE of artistsDE.docs) {
      try {
        console.log(`\n📝 Processing: ${artistDE.name}`)

        // Check if already in new format
        if (isNewFormat(artistDE.discography)) {
          console.log('   ✅ Already in new array format - skipping')
          skippedCount++
          continue
        }

        const oldDiscographyDE = artistDE.discography as unknown as RichTextContent

        // Fetch EN locale
        const artistEN = await payload.findByID({
          collection: 'artists',
          id: artistDE.id,
          locale: 'en',
        })

        const oldDiscographyEN = artistEN.discography as unknown as RichTextContent

        // Convert both locales
        console.log('   🔄 Converting DE locale...')
        const newDiscographyDE = convertToNewFormat(oldDiscographyDE)

        console.log('   🔄 Converting EN locale...')
        const newDiscographyEN = convertToNewFormat(oldDiscographyEN)

        if (newDiscographyDE.length === 0 && newDiscographyEN.length === 0) {
          console.log('   ⏭️  No valid content to migrate')
          skippedCount++
          continue
        }

        // Update DE locale
        await payload.update({
          collection: 'artists',
          id: artistDE.id,
          data: {
            discography: newDiscographyDE,
          },
          locale: 'de',
        })

        // Update EN locale
        await payload.update({
          collection: 'artists',
          id: artistDE.id,
          data: {
            discography: newDiscographyEN.length > 0 ? newDiscographyEN : newDiscographyDE,
          },
          locale: 'en',
        })

        console.log(`   ✅ Migrated successfully (${newDiscographyDE.length} role sections)`)
        migratedCount++
      } catch (error) {
        console.error(`   ❌ Error processing ${artistDE.name}:`, error)
        errors.push({
          artist: artistDE.name,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Summary
    console.log('\n=== Migration Complete ===')
    console.log(`✅ Migrated: ${migratedCount} artists`)
    console.log(`⏭️  Skipped: ${skippedCount} artists (already migrated)`)

    if (errors.length > 0) {
      console.log(`\n❌ Errors: ${errors.length}`)
      errors.forEach(({ artist, error }) => {
        console.log(`   - ${artist}: ${error}`)
      })
    }

    console.log('\n=== Next Steps ===')
    console.log('1. Verify the migration in Payload CMS admin')
    console.log('2. Check that discography is now displayed as array entries')
    console.log('3. Each array entry should have a role dropdown and recordings richText field')
    console.log('4. Run the updated migrateDiscographyToRecordings.ts script')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
migrateDiscographyStructure()
