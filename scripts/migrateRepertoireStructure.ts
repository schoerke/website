/**
 * Migrate repertoire field from richText to array of sections
 *
 * This script safely transforms the old single richText repertoire field
 * into the new array structure with title and content fields.
 *
 * Safety features:
 * - Dry run mode by default (preview changes without applying)
 * - Validates backup exists before proceeding
 * - Only migrates artists with non-empty repertoire
 * - Preserves all existing data
 *
 * Usage:
 *   # Preview changes (dry run)
 *   pnpm tsx scripts/migrateRepertoireStructure.ts
 *
 *   # Apply changes
 *   pnpm tsx scripts/migrateRepertoireStructure.ts --apply
 */

import config from '@/payload.config'
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { getPayload } from 'payload'

interface OldRepertoire {
  de?: unknown
  en?: unknown
}

interface NewRepertoireSection {
  title: string
  content: unknown
}

/**
 * Check if richText content is empty (only contains empty paragraphs)
 */
function isRichTextEmpty(richText: unknown): boolean {
  if (!richText) return true
  const rt = richText as Record<string, unknown>
  if (!rt.root) return true
  const root = rt.root as Record<string, unknown>
  const children = root.children as unknown[]
  if (!children || children.length === 0) return true

  // Check if all children are empty paragraphs
  return children.every((child: unknown) => {
    const c = child as Record<string, unknown>
    const childChildren = c.children as unknown[]
    return (
      c.type === 'paragraph' &&
      (!childChildren ||
        childChildren.length === 0 ||
        childChildren.every((cc: unknown) => {
          const ccRec = cc as Record<string, unknown>
          return !ccRec.text || (typeof ccRec.text === 'string' && ccRec.text.trim() === '')
        }))
    )
  })
}

/**
 * Transform old repertoire structure to new array format
 * If old repertoire has content, create a single section with default title
 */
function transformRepertoire(oldRepertoire: OldRepertoire | null | undefined): NewRepertoireSection[] | null {
  if (!oldRepertoire) return null

  const sections: NewRepertoireSection[] = []

  // Check German content
  const hasDeContent = oldRepertoire.de && !isRichTextEmpty(oldRepertoire.de)
  // Check English content
  const hasEnContent = oldRepertoire.en && !isRichTextEmpty(oldRepertoire.en)

  if (!hasDeContent && !hasEnContent) {
    // No content to migrate
    return null
  }

  // Create a single section with the existing content
  // Use a generic title that can be customized later
  sections.push({
    title: 'Repertoire', // Default title - user can customize in CMS
    content: hasDeContent ? oldRepertoire.de : oldRepertoire.en,
  })

  return sections
}

async function run() {
  const isDryRun = !process.argv.includes('--apply')

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be applied')
    console.log('   Run with --apply flag to execute migration\n')
  }

  // Check for backup file
  const backupDir = path.join(process.cwd(), 'data', 'dumps')
  const backupFiles = fs.readdirSync(backupDir).filter((f) => f.startsWith('artists-repertoire-backup-'))

  if (backupFiles.length === 0) {
    console.error('❌ Error: No backup file found!')
    console.error('   Please run backupRepertoireData.ts first')
    process.exit(1)
  }

  console.log(`✓ Backup found: ${backupFiles[backupFiles.length - 1]}\n`)

  const payload = await getPayload({ config })

  console.log('Fetching all artists...')
  const artists = await payload.find({
    collection: 'artists',
    limit: 1000,
    locale: 'all',
  })

  console.log(`Found ${artists.docs.length} artists\n`)

  let migrationCount = 0
  let skippedCount = 0

  for (const artist of artists.docs) {
    const oldRepertoire = artist.repertoire as OldRepertoire | null | undefined

    // Transform to new structure
    const newRepertoire = transformRepertoire(oldRepertoire)

    if (newRepertoire === null) {
      console.log(`⊘ Skipping ${artist.name} - No repertoire content`)
      skippedCount++
      continue
    }

    console.log(`📝 ${artist.name}:`)
    console.log(`   Old structure: richText field`)
    console.log(`   New structure: ${newRepertoire.length} section(s)`)
    console.log(`   Section titles: ${newRepertoire.map((s) => s.title).join(', ')}`)

    if (!isDryRun) {
      try {
        // Update German locale
        if (oldRepertoire?.de && !isRichTextEmpty(oldRepertoire.de)) {
          await payload.update({
            collection: 'artists',
            id: artist.id,
            locale: 'de',
            data: {
              repertoire: [
                {
                  title: 'Repertoire',
                  content: oldRepertoire.de,
                },
              ] as never,
            },
          })
        }

        // Update English locale if it has different content
        if (oldRepertoire?.en && !isRichTextEmpty(oldRepertoire.en)) {
          await payload.update({
            collection: 'artists',
            id: artist.id,
            locale: 'en',
            data: {
              repertoire: [
                {
                  title: 'Repertoire',
                  content: oldRepertoire.en,
                },
              ] as never,
            },
          })
        }

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
  console.log(`  Artists to migrate: ${migrationCount}`)
  console.log(`  Artists skipped: ${skippedCount}`)

  if (isDryRun) {
    console.log(`\n✓ Dry run complete - no changes made`)
    console.log(`  Run with --apply flag to execute migration`)
  } else {
    console.log(`\n✓ Migration complete!`)
    console.log(`  Backup available at: ${backupDir}/${backupFiles[backupFiles.length - 1]}`)
  }

  process.exit(0)
}

run().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
