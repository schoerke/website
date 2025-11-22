// @ts-nocheck
/**
 * Migration Script: Discography to Recordings (Enhanced)
 *
 * This script migrates existing discography data from the Artists collection
 * to the new Recordings collection. It parses the richText structure and
 * intelligently extracts:
 * - Composer (from bold text)
 * - Title (from normal text)
 * - Recording label and catalog number (from last italic text matching pattern)
 * - Description (remaining content)
 * - Artist role (auto-detected based on instrument and content)
 *
 * Pattern:
 * - Bold text (format: 1) → Composer (first bold text in paragraph)
 * - Normal text (format: 0) → Title and description
 * - Italic text (format: 2) → Work titles or Label/Catalog# (last italic)
 *
 * Role Detection:
 * The script intelligently detects artist roles based on:
 * - Artist's instrument field (conductor, piano, violin, etc.)
 * - Content keywords (Dirigent/conductor, Kammermusik/chamber music, etc.)
 * - Context clues (Partner: = accompanist, Orchester/orchestra = ensemble)
 *
 * Roles assigned:
 * - conductor: If instrument=conductor or content mentions "Dirigent/conductor"
 * - accompanist: If piano + content mentions "Partner:/Begleitung"
 * - chamber_musician: If content mentions chamber music/quartet/trio
 * - ensemble_member: If content mentions orchestra/ensemble (but not conductor)
 * - soloist: Default for solo performances
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
import { getPayload } from 'payload'

interface TextNode {
  type: 'text' | 'linebreak'
  format?: number // 0=normal, 1=bold, 2=italic
  text?: string
}

interface ParagraphNode {
  type: 'paragraph'
  children: TextNode[]
}

interface RichTextContent {
  root: {
    children: ParagraphNode[]
  }
}

/**
 * Detect artist role based on instrument and content
 * Returns array of role values
 */
function detectArtistRole(
  instruments: string[],
  recordingContent: string,
): ('soloist' | 'conductor' | 'ensemble_member' | 'chamber_musician' | 'accompanist')[] {
  const contentLower = recordingContent.toLowerCase()

  // Check if content mentions conductor role (German: Dirigent)
  const isConductor =
    contentLower.includes('dirigent') || contentLower.includes('conductor') || contentLower.includes('conducting')

  // Check for chamber music indicators
  const isChamberMusic =
    contentLower.includes('kammermusik') ||
    contentLower.includes('chamber music') ||
    contentLower.includes('quartett') ||
    contentLower.includes('quartet') ||
    contentLower.includes('trio') ||
    contentLower.includes('duo')

  // Check for accompanist indicators (German: Begleitung, Klavier)
  const isAccompanist =
    contentLower.includes('begleitung') ||
    contentLower.includes('accompaniment') ||
    (contentLower.includes('klavier') && contentLower.includes('partner'))

  // Check for ensemble indicators
  const isEnsemble =
    contentLower.includes('ensemble') ||
    contentLower.includes('orchester') ||
    (contentLower.includes('orchestra') && !isConductor)

  // Determine primary role based on instrument
  const roles: ('soloist' | 'conductor' | 'ensemble_member' | 'chamber_musician' | 'accompanist')[] = []

  // Conductors
  if (instruments.includes('conductor') || isConductor) {
    roles.push('conductor')
  }

  // Piano/keyboard players
  if (instruments.includes('piano') || instruments.includes('keyboard')) {
    if (isAccompanist) {
      roles.push('accompanist')
    } else if (isChamberMusic) {
      roles.push('chamber_musician')
    } else {
      roles.push('soloist')
    }
  }

  // Orchestral/ensemble instruments
  if (
    instruments.some((i) =>
      [
        'violin',
        'viola',
        'cello',
        'double_bass',
        'flute',
        'oboe',
        'clarinet',
        'bassoon',
        'horn',
        'trumpet',
        'trombone',
        'tuba',
      ].includes(i),
    )
  ) {
    if (isChamberMusic) {
      roles.push('chamber_musician')
    } else if (isEnsemble && !isConductor) {
      roles.push('ensemble_member')
    } else {
      roles.push('soloist')
    }
  }

  // Default to soloist if no roles detected
  if (roles.length === 0) {
    roles.push('soloist')
  }

  return roles
}

/**
 * Parse a label/catalog string like "Naxos 8.572191" or "CPO 555 123-2"
 * Returns { label, catalogNumber } or null if no match
 */
function parseLabelCatalog(text: string): { label: string; catalogNumber: string } | null {
  // Common patterns:
  // "Naxos 8.572191"
  // "CPO 555 123-2"
  // "Deutsche Grammophon 479 0563"
  const match = text.match(/^([A-Za-z\s]+?)\s+([\d.\-\s]+)$/)
  if (match) {
    return {
      label: match[1].trim(),
      catalogNumber: match[2].trim(),
    }
  }
  return null
}

/**
 * Extract recording info from a paragraph node
 */
function parseRecordingParagraph(paragraph: ParagraphNode): {
  composer: string
  title: string
  description: string[]
  label: string | null
  catalogNumber: string | null
} {
  let composer = ''
  const titleParts: string[] = []
  const descriptionParts: string[] = []
  const italicTexts: string[] = []
  let label: string | null = null
  let catalogNumber: string | null = null

  for (const child of paragraph.children) {
    if (child.type === 'linebreak') continue
    if (!child.text?.trim()) continue

    const text = child.text.trim()

    // Bold text = composer (take first bold)
    if (child.format === 1 && !composer) {
      composer = text
      continue
    }

    // Normal text = title or description
    if (child.format === 0) {
      // If starts with "Partner:" put in description
      if (text.startsWith('Partner:')) {
        descriptionParts.push(text)
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
      // Remove from italic texts since it's now extracted
      italicTexts.pop()
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

  return {
    composer: composer || 'Unbekannter Komponist',
    title: titleParts.join(' • ') || 'Ohne Titel',
    description: descriptionParts,
    label,
    catalogNumber,
  }
}

/**
 * Convert description parts to richText format
 */
function createDescriptionRichText(parts: string[]) {
  if (parts.length === 0) return null

  return {
    root: {
      children: parts.map((part) => ({
        type: 'paragraph',
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

async function migrateDiscography() {
  console.log('=== Starting Enhanced Discography Migration ===\n')

  // Check for --force flag to skip duplicate check
  const forceMode = process.argv.includes('--force')
  if (forceMode) {
    console.log('⚠️  Running in FORCE mode - will create duplicates if recordings exist\n')
  }

  try {
    const payload = await getPayload({ config })

    // 1. Fetch all artists with discography data
    console.log('Fetching artists with discography data...')
    const artists = await payload.find({
      collection: 'artists',
      where: {
        discography: {
          exists: true,
        },
      },
      limit: 1000,
      locale: 'all',
    })

    console.log(`Found ${artists.docs.length} artists with discography data\n`)

    let createdCount = 0
    let skippedCount = 0
    const errors: Array<{ artist: string; error: string }> = []
    const summary: Array<{ artist: string; recordings: number }> = []

    // 2. Process each artist
    for (const artist of artists.docs) {
      // Skip if no discography content
      if (!artist.discography) {
        console.log(`⏭️  Skipping ${artist.name} (no discography content)`)
        skippedCount++
        continue
      }

      try {
        console.log(`\n📝 Processing: ${artist.name}`)
        console.log(`   Instruments: ${artist.instrument?.join(', ') || 'none'}`)

        // Check if recordings already exist for this artist (unless --force flag is used)
        if (!forceMode) {
          const existingRecordings = await payload.find({
            collection: 'recordings',
            where: {
              'artistRoles.artist': {
                equals: artist.id,
              },
            },
            limit: 1,
          })

          if (existingRecordings.totalDocs > 0) {
            console.log(`   ⏭️  Skipping - ${existingRecordings.totalDocs} recording(s) already exist`)
            console.log(`      (Use --force flag to create anyway)`)
            skippedCount++
            continue
          }
        }

        const discography = artist.discography as RichTextContent
        const paragraphs = discography.root?.children || []

        if (paragraphs.length === 0) {
          console.log('   ⏭️  No paragraphs found')
          skippedCount++
          continue
        }

        let recordingsCreated = 0

        // Process each paragraph as a separate recording
        for (const paragraph of paragraphs) {
          if (paragraph.type !== 'paragraph') continue

          const parsed = parseRecordingParagraph(paragraph)

          // Build full content string for role detection
          const fullContent = [
            parsed.composer,
            parsed.title,
            ...parsed.description,
            parsed.label || '',
            parsed.catalogNumber || '',
          ].join(' ')

          // Detect artist role based on instrument and content
          const detectedRoles = detectArtistRole(artist.instrument || [], fullContent)

          console.log(`   → "${parsed.composer} - ${parsed.title}"`)
          if (parsed.label && parsed.catalogNumber) {
            console.log(`      Label: ${parsed.label} ${parsed.catalogNumber}`)
          }
          console.log(`      Role: ${detectedRoles.join(', ')}`)

          // Create the recording in DE locale first
          const recording = await payload.create({
            collection: 'recordings',
            data: {
              title: parsed.title,
              composer: parsed.composer,
              description: createDescriptionRichText(parsed.description),
              recordingLabel: parsed.label || undefined,
              catalogNumber: parsed.catalogNumber || undefined,
              artistRoles: [
                {
                  artist: artist.id,
                  role: detectedRoles,
                },
              ],
              _status: 'draft',
            },
            locale: 'de',
          })

          // Update EN locale (same content for now)
          await payload.update({
            collection: 'recordings',
            id: recording.id,
            data: {
              title: parsed.title,
              composer: parsed.composer,
              description: createDescriptionRichText(parsed.description),
            },
            locale: 'en',
          })

          recordingsCreated++
        }

        console.log(`   ✅ Created ${recordingsCreated} draft recording(s)`)
        createdCount += recordingsCreated
        summary.push({ artist: artist.name, recordings: recordingsCreated })
      } catch (error) {
        console.error(`   ❌ Error processing ${artist.name}:`, error)
        errors.push({
          artist: artist.name,
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
    console.log('   - Adjust artist roles if needed (conductor, ensemble member, etc.)')
    console.log('   - Add cover art')
    console.log('   - Add recording year if known')
    console.log('   - Publish when ready')
    console.log('\n💡 Tip: This script is idempotent - it skips artists with existing recordings.')
    console.log('   To re-run for an artist, delete their recordings first, or use --force flag.')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
migrateDiscography()
