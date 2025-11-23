// @ts-nocheck
/**
 * Migration Script: Discography to Recordings (Enhanced)
 *
 * This script migrates existing discography data from the Artists collection
 * to the new Recordings collection. It parses the richText structure and
 * intelligently extracts:
 * - Title (combining bold text "Composer" with normal text "Work")
 * - Recording label and catalog number (from last italic text matching pattern)
 * - Description (remaining content, including composers if needed)
 * - Artist role (from H1 heading elements)
 *
 * Pattern:
 * - Bold text (format: 1) → Prepended to title as "Composer -"
 * - Normal text (format: 0) → Work title and description
 * - Italic text (format: 2) → Work titles or Label/Catalog# (last italic)
 * - Final title format: "Composer - Work Title"
 *
 * Example:
 *   [Bold] Beethoven
 *   [Normal] Violin Concerto
 *   [Italic] Naxos 8.123456
 *   → Title: "Beethoven - Violin Concerto"
 *   → Label: "Naxos", Catalog: "8.123456"
 *
 * Role Detection:
 * The script uses H1 or H2 heading elements to group recordings by role.
 * Structure your discography like this:
 *
 *   [H1 or H2] Soloist
 *   [Paragraph] Beethoven
 *   [Paragraph] Violin Concerto...
 *   [Paragraph] Prokofiev
 *   [Paragraph] Violin Sonatas...
 *
 *   [H1 or H2] Conductor
 *   [Paragraph] Mahler
 *   [Paragraph] Symphony No. 5...
 *
 * Supported heading text (case-insensitive):
 * - "Soloist" / "Solist" → soloist
 * - "Conductor" / "Dirigent" → conductor
 * - "Accompanist" / "Begleiter" → accompanist
 * - "Chamber Musician" / "Kammermusiker" → chamber_musician
 * - "Ensemble Member" / "Ensemblemitglied" → ensemble_member
 *
 * If no headings are found, defaults to 'soloist' for all recordings.
 *
 * Idempotency:
 * The script is safe to run multiple times. It checks if recordings already exist
 * for each artist and skips them to avoid duplicates. This means:
 * - You can edit draft recordings and re-run the script safely
 * - Only new artists (without recordings) will be processed
 * - Use --force flag to bypass this check and create duplicates
 *
 * Usage:
 *   pnpm migrate:discography           # Normal mode (skip existing)
 *   pnpm migrate:discography --force   # Force mode (create duplicates)
 */

import config from '@payload-config'
import 'dotenv/config'
import { getPayload } from 'payload'

interface TextNode {
  type: 'text' | 'linebreak'
  format?: number // 0=normal, 1=bold, 2=italic
  text?: string
}

interface ParagraphNode {
  type: 'paragraph' | 'heading'
  children: TextNode[]
  tag?: string // h1, h2, h3, etc.
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

  // Soloist
  if (text === 'soloist' || text === 'solist') return 'soloist'

  // Conductor
  if (text === 'conductor' || text === 'dirigent') return 'conductor'

  // Accompanist
  if (text === 'accompanist' || text === 'begleiter') return 'accompanist'

  // Chamber Musician
  if (text === 'chamber musician' || text === 'kammermusiker') return 'chamber_musician'

  // Ensemble Member
  if (text === 'ensemble member' || text === 'ensemblemitglied') return 'ensemble_member'

  return null
}

/**
 * Parse a label/catalog string with optional year
 * Returns { label, catalogNumber, year } or null if no match
 *
 * Handles patterns like:
 * - "MDG 903 2280-6 SACD (2023)"
 * - "EMI 7 41112 7 (2000)"
 * - "MDG 940 1759-6 (2012)"
 * - "Naxos 8.572191"
 * - "CPO 555 123-2"
 * - "Deutsche Grammophon 479 0563"
 */
function parseLabelCatalog(text: string): { label: string; catalogNumber: string; year: number | null } | null {
  // Pattern: Label name followed by catalog number (digits, dots, dashes, spaces)
  // May be followed by optional format/year info
  // Examples:
  //   "MDG 903 2280-6 SACD (2023)" → label: "MDG", catalog: "903 2280-6", year: 2023
  //   "EMI 7 41112 7 (2000)" → label: "EMI", catalog: "7 41112 7", year: 2000
  //   "MDG 340 1182-2 (2003)" → label: "MDG", catalog: "340 1182-2", year: 2003

  // Try pattern: "LABEL CATALOG (YEAR)" or "LABEL CATALOG FORMAT (YEAR)"
  let match = text.match(/^([A-Z][A-Za-z\s&.]*?)\s+([\d.\-\s]+?)(?:\s+[A-Z][\w-]*)?(?:\s*\(([0-9]{4})\))?$/i)
  if (match) {
    return {
      label: match[1].trim(),
      catalogNumber: match[2].trim(),
      year: match[3] ? parseInt(match[3], 10) : null,
    }
  }

  // Fallback: Simple pattern "LABEL CATALOG" at start of string (no year)
  match = text.match(/^([A-Z][A-Za-z\s&.]+?)\s+([\d.\-\s]+)/)
  if (match) {
    return {
      label: match[1].trim(),
      catalogNumber: match[2].trim(),
      year: null,
    }
  }

  return null
}

/**
 * Extract recording info from a paragraph node
 */
function parseRecordingParagraph(paragraph: ParagraphNode): {
  title: string
  description: string[]
  label: string | null
  catalogNumber: string | null
  year: number | null
} {
  let composer = ''
  const titleParts: string[] = []
  const descriptionParts: string[] = []
  const italicTexts: string[] = []
  let label: string | null = null
  let catalogNumber: string | null = null
  let year: number | null = null

  for (const child of paragraph.children) {
    if (child.type === 'linebreak') continue
    if (!child.text?.trim()) continue

    const text = child.text.trim()

    // Bold text = composer (take first bold, will be prepended to title)
    if (child.format === 1 && !composer) {
      composer = text
      continue
    }

    // Normal text = title or description
    if (child.format === 0) {
      // If starts with "Partner:" put in description (and remove the prefix)
      if (text.startsWith('Partner:')) {
        // Remove "Partner: " prefix and add to description
        const cleanedText = text.replace(/^Partner:\s*/, '').trim()
        if (cleanedText) {
          descriptionParts.push(cleanedText)
        }
      } else {
        titleParts.push(text)
      }
      continue
    }

    // Italic text = could be work titles or label/catalog
    if (child.format === 2) {
      italicTexts.push(text)
    }
  }

  // Check last italic text for label/catalog pattern
  if (italicTexts.length > 0) {
    const lastItalic = italicTexts[italicTexts.length - 1]
    const parsed = parseLabelCatalog(lastItalic)

    if (parsed) {
      label = parsed.label
      catalogNumber = parsed.catalogNumber
      year = parsed.year
      // Remove from italic texts since it's now extracted
      italicTexts.pop()
    }
  }

  // If no label found in italics, check last normal text (titleParts)
  if (!label && titleParts.length > 0) {
    const lastNormal = titleParts[titleParts.length - 1]
    const parsed = parseLabelCatalog(lastNormal)

    if (parsed) {
      label = parsed.label
      catalogNumber = parsed.catalogNumber
      year = parsed.year
      // Remove from title parts since it's now extracted
      titleParts.pop()
    }
  }

  // Remaining italic texts are work titles - add to title or description
  if (italicTexts.length > 0) {
    // If we have a short title (1-2 words), add italic texts to title
    // Otherwise add to description
    if (titleParts.join(' ').split(' ').length <= 3) {
      titleParts.push(...italicTexts)
    } else {
      descriptionParts.push(...italicTexts)
    }
  }

  // Build full title: "Composer - Title Parts"
  let fullTitle = ''
  if (composer && titleParts.length > 0) {
    fullTitle = `${composer} - ${titleParts.join(' • ')}`
  } else if (composer) {
    fullTitle = composer
  } else if (titleParts.length > 0) {
    fullTitle = titleParts.join(' • ')
  } else {
    fullTitle = 'Ohne Titel'
  }

  return {
    title: fullTitle,
    description: descriptionParts,
    label,
    catalogNumber,
    year,
  }
}

/**
 * Convert description parts to richText format with proper Lexical structure
 */
function createDescriptionRichText(parts: string[]) {
  if (parts.length === 0) return null

  return {
    root: {
      type: 'root',
      direction: 'ltr' as 'ltr' | 'rtl',
      format: '' as '',
      indent: 0,
      version: 1,
      children: parts.map((part) => ({
        type: 'paragraph',
        format: '' as '',
        indent: 0,
        version: 1,
        children: [
          {
            type: 'text',
            text: part,
            format: 0,
          },
        ],
      })),
    },
  }
}

/**
 * Group paragraphs by role based on H1 headings
 */
function groupRecordingsByRole(nodes: ParagraphNode[]): Map<RecordingRole, ParagraphNode[]> {
  const groups = new Map<RecordingRole, ParagraphNode[]>()
  let currentRole: RecordingRole = 'soloist' // Default role

  for (const node of nodes) {
    // Check if this is an H1 or H2 heading
    if (node.type === 'heading' && (node.tag === 'h1' || node.tag === 'h2')) {
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

    // Skip non-paragraph nodes
    if (node.type !== 'paragraph') continue

    // Add paragraph to current role group
    if (!groups.has(currentRole)) {
      groups.set(currentRole, [])
    }
    groups.get(currentRole)!.push(node)
  }

  return groups
}

async function migrateDiscography() {
  console.log('=== Starting Enhanced Discography Migration ===\n')

  // Check for --force flag to skip duplicate check
  const forceMode = process.argv.includes('--force')
  if (forceMode) {
    console.log('⚠️  Running in FORCE mode - will create duplicates if recordings exist\n')
  }

  try {
    const payload = await getPayload({ config })

    // 1. Fetch all artists with discography data (fetch DE first to check existence)
    console.log('Fetching artists with discography data...')
    const artistsDE = await payload.find({
      collection: 'artists',
      where: {
        discography: {
          exists: true,
        },
      },
      limit: 1000,
      locale: 'de',
    })

    console.log(`Found ${artistsDE.docs.length} artists with DE discography data\n`)

    let createdCount = 0
    let skippedCount = 0
    const errors: Array<{ artist: string; error: string }> = []
    const summary: Array<{ artist: string; recordings: number }> = []

    // 2. Process each artist - handle DE and EN locales separately
    for (const artistDE of artistsDE.docs) {
      try {
        console.log(`\n📝 Processing: ${artistDE.name}`)
        console.log(`   Instruments: ${artistDE.instrument?.join(', ') || 'none'}`)

        // Check if recordings already exist for this artist (unless --force flag is used)
        if (!forceMode) {
          const existingRecordings = await payload.find({
            collection: 'recordings',
            where: {
              artists: {
                equals: artistDE.id,
              },
            },
            limit: 1,
            locale: 'de',
          })

          if (existingRecordings.docs.length > 0) {
            console.log(`   ⏭️  Skipping (${existingRecordings.totalDocs} recordings already exist)`)
            skippedCount++
            continue
          }
        }

        // Fetch EN locale version to get EN discography
        const artistEN = await payload.findByID({
          collection: 'artists',
          id: artistDE.id,
          locale: 'en',
        })

        // Process DE discography
        const discographyDE = artistDE.discography as RichTextContent | undefined
        const nodesDE = discographyDE?.root?.children || []

        // Process EN discography
        const discographyEN = artistEN.discography as RichTextContent | undefined
        const nodesEN = discographyEN?.root?.children || []

        if (nodesDE.length === 0 && nodesEN.length === 0) {
          console.log('   ⏭️  No content found in either locale')
          skippedCount++
          continue
        }

        // Group recordings by role for both locales
        const roleGroupsDE = groupRecordingsByRole(nodesDE)
        const roleGroupsEN = groupRecordingsByRole(nodesEN)

        if (roleGroupsDE.size === 0 && roleGroupsEN.size === 0) {
          console.log('   ⏭️  No recording paragraphs found in either locale')
          skippedCount++
          continue
        }

        let recordingsCreated = 0

        // Process DE recordings - this creates the recording with non-localized fields
        for (const [role, paragraphs] of roleGroupsDE.entries()) {
          console.log(`\n   🎵 Processing ${paragraphs.length} DE recording(s) as: ${role}`)

          for (const paragraph of paragraphs) {
            const parsed = parseRecordingParagraph(paragraph)

            console.log(`      → DE: "${parsed.title}"`)
            if (parsed.label && parsed.catalogNumber) {
              console.log(`         Label: ${parsed.label} ${parsed.catalogNumber}`)
            }
            if (parsed.year) {
              console.log(`         Year: ${parsed.year}`)
            }

            // Create the recording in DE locale (includes all fields)
            const recording = await payload.create({
              collection: 'recordings',
              data: {
                title: parsed.title,
                description: createDescriptionRichText(parsed.description),
                recordingYear: parsed.year || undefined,
                recordingLabel: parsed.label || undefined,
                catalogNumber: parsed.catalogNumber || undefined,
                artists: [artistDE.id],
                roles: [role],
                _status: 'draft',
              },
              locale: 'de',
            })

            recordingsCreated++

            // Now process corresponding EN recording if it exists
            // Try to find matching EN recording by checking if same role group exists
            const enParagraphs = roleGroupsEN.get(role) || []
            const enParagraphIndex = paragraphs.indexOf(paragraph)

            if (enParagraphs[enParagraphIndex]) {
              const parsedEN = parseRecordingParagraph(enParagraphs[enParagraphIndex])

              console.log(`         EN: "${parsedEN.title}"`)

              // Update EN locale with EN-specific title and description
              await payload.update({
                collection: 'recordings',
                id: recording.id,
                data: {
                  title: parsedEN.title,
                  description: createDescriptionRichText(parsedEN.description),
                },
                locale: 'en',
              })
            } else {
              // No EN equivalent - copy DE content to EN
              console.log(`         EN: (copied from DE)`)
              await payload.update({
                collection: 'recordings',
                id: recording.id,
                data: {
                  title: parsed.title,
                  description: createDescriptionRichText(parsed.description),
                },
                locale: 'en',
              })
            }
          }
        }

        console.log(`\n   ✅ Created ${recordingsCreated} draft recording(s)`)
        createdCount += recordingsCreated
        summary.push({ artist: artistDE.name, recordings: recordingsCreated })
      } catch (error) {
        console.error(`   ❌ Error processing ${artistDE.name}:`, error)
        errors.push({
          artist: artistDE.name,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // 3. Output migration summary
    console.log('\n=== Migration Complete ===')
    console.log(`✅ Created: ${createdCount} draft recordings`)
    console.log(`⏭️  Skipped: ${skippedCount} artists`)

    if (summary.length > 0) {
      console.log('\n📊 Summary by Artist:')
      summary.forEach(({ artist, recordings }) => {
        console.log(`   - ${artist}: ${recordings} recording(s)`)
      })
    }

    if (errors.length > 0) {
      console.log(`\n❌ Errors: ${errors.length}`)
      errors.forEach(({ artist, error }) => {
        console.log(`   - ${artist}: ${error}`)
      })
    }

    console.log('\n=== Next Steps ===')
    console.log('1. Log into Payload admin panel')
    console.log('2. Navigate to Recordings collection')
    console.log('3. Review each draft recording:')
    console.log('   - Verify extracted composer, title, label, and catalog number')
    console.log('   - Verify auto-assigned roles (based on H1 headings)')
    console.log('   - Add cover art')
    console.log('   - Add recording year if known')
    console.log('   - Publish when ready')
    console.log('\n💡 Tip: This script is idempotent - it skips artists with existing recordings.')
    console.log('   To re-run for an artist, delete their recordings first, or use --force flag.')
    console.log('\n💡 Tip: Use H1 headings in discography to specify roles (Soloist, Conductor, etc.)')
    console.log('   Without headings, all recordings default to "soloist" role.')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
migrateDiscography()
