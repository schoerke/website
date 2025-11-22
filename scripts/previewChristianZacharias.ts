// Quick preview script to show Christian Zacharias discography parsing
// This does NOT create any recordings - just shows what would be created

import config from '@payload-config'
import 'dotenv/config'
import { getPayload } from 'payload'

interface TextNode {
  type: 'text' | 'linebreak'
  format?: number
  text?: string
}

interface ParagraphNode {
  type: 'paragraph'
  children: TextNode[]
}

interface HeadingNode {
  type: 'heading'
  tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  children: TextNode[]
}

interface RichTextContent {
  root: {
    children: (ParagraphNode | HeadingNode)[]
  }
}

type RecordingRole = 'soloist' | 'conductor' | 'accompanist' | 'chamber_musician' | 'ensemble_member'

const ROLE_HEADINGS: Record<string, RecordingRole> = {
  soloist: 'soloist',
  solist: 'soloist',
  conductor: 'conductor',
  dirigent: 'conductor',
  accompanist: 'accompanist',
  begleiter: 'accompanist',
  'chamber musician': 'chamber_musician',
  kammermusiker: 'chamber_musician',
  'ensemble member': 'ensemble_member',
  ensemblemitglied: 'ensemble_member',
}

function getNodeText(node: HeadingNode | ParagraphNode): string {
  return node.children.map((child) => (child.type === 'text' ? child.text || '' : '')).join('')
}

function groupRecordingsByRole(nodes: (ParagraphNode | HeadingNode)[]): Map<RecordingRole, ParagraphNode[]> {
  const result = new Map<RecordingRole, ParagraphNode[]>()
  let currentRole: RecordingRole | null = null

  for (const node of nodes) {
    if (node.type === 'heading' && node.tag === 'h1') {
      const headingText = getNodeText(node).trim().toLowerCase()
      const matchedRole = ROLE_HEADINGS[headingText]
      if (matchedRole) {
        currentRole = matchedRole
        if (!result.has(currentRole)) {
          result.set(currentRole, [])
        }
      }
    } else if (node.type === 'paragraph' && currentRole) {
      const text = getNodeText(node).trim()
      if (text) {
        result.get(currentRole)!.push(node)
      }
    }
  }

  return result
}

function parseRecordingParagraph(paragraph: ParagraphNode): {
  title: string
  description: string
  label: string | null
  catalogNumber: string | null
  year: number | null
} {
  const children = paragraph.children
  let boldText = ''
  const normalTexts: string[] = []
  const italicTexts: string[] = []

  for (const child of children) {
    if (child.type === 'text' && child.text) {
      const text = child.text.trim()
      if (!text) continue

      if (child.format === 1) {
        boldText = text
      } else if (child.format === 2) {
        italicTexts.push(text)
      } else {
        normalTexts.push(text)
      }
    }
  }

  // Extract label/catalog/year from last italic text
  let label: string | null = null
  let catalogNumber: string | null = null
  let year: number | null = null

  if (italicTexts.length > 0) {
    const lastItalic = italicTexts[italicTexts.length - 1]

    // Try pattern: "LABEL CATALOG (YEAR)" or "LABEL CATALOG FORMAT (YEAR)"
    let match = lastItalic.match(/^([A-Z][A-Za-z\s&.]*?)\s+([\d.\-\s]+?)(?:\s+[A-Z][\w-]*)?(?:\s*\(([0-9]{4})\))?$/i)
    if (match) {
      label = match[1].trim()
      catalogNumber = match[2].trim()
      year = match[3] ? parseInt(match[3], 10) : null
      italicTexts.pop()
    } else {
      // Fallback: Simple pattern "LABEL CATALOG" at start
      match = lastItalic.match(/^([A-Z][A-Za-z\s&.]+?)\s+([\d.\-\s]+)/)
      if (match) {
        label = match[1].trim()
        catalogNumber = match[2].trim()
        year = null
        italicTexts.pop()
      }
    }
  }

  // If no label found in italics, check last normal text
  if (!label && normalTexts.length > 0) {
    const lastNormal = normalTexts[normalTexts.length - 1]

    // Try pattern: "LABEL CATALOG (YEAR)" or "LABEL CATALOG FORMAT (YEAR)"
    let match = lastNormal.match(/^([A-Z][A-Za-z\s&.]*?)\s+([\d.\-\s]+?)(?:\s+[A-Z][\w-]*)?(?:\s*\(([0-9]{4})\))?$/i)
    if (match) {
      label = match[1].trim()
      catalogNumber = match[2].trim()
      year = match[3] ? parseInt(match[3], 10) : null
      normalTexts.pop()
    } else {
      // Fallback: Simple pattern "LABEL CATALOG" at start
      match = lastNormal.match(/^([A-Z][A-Za-z\s&.]+?)\s+([\d.\-\s]+)/)
      if (match) {
        label = match[1].trim()
        catalogNumber = match[2].trim()
        year = null
        normalTexts.pop()
      }
    }
  }

  // Build title: "Composer - Work Title"
  let title = ''
  if (boldText) {
    title = `${boldText} - `
  }

  // Add first normal text as work title
  if (normalTexts.length > 0) {
    title += normalTexts[0]
    normalTexts.shift()
  } else if (italicTexts.length > 0) {
    title += italicTexts[0]
    italicTexts.shift()
  }

  // Rest goes into description - remove "Partner: " prefix if present
  const descParts = [...normalTexts, ...italicTexts]
    .filter((t) => t.trim())
    .map((t) => t.replace(/^Partner:\s*/, '').trim())
    .filter((t) => t) // Remove empty strings after replacement
  const description = descParts.join(', ')

  return {
    title: title || 'Untitled Recording',
    description,
    label,
    catalogNumber,
    year,
  }
}

async function preview() {
  console.log('=== Christian Zacharias Discography Preview ===\n')

  try {
    const payload = await getPayload({ config })

    // Fetch Christian Zacharias
    const artists = await payload.find({
      collection: 'artists',
      where: {
        name: {
          equals: 'Christian Zacharias',
        },
      },
      locale: 'de',
    })

    if (artists.docs.length === 0) {
      console.log('❌ Christian Zacharias not found')
      return
    }

    const artistDE = artists.docs[0]
    console.log(`Found: ${artistDE.name}`)
    console.log(`Instruments: ${artistDE.instrument?.join(', ') || 'none'}\n`)

    // Fetch EN version
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
      console.log('❌ No discography content found in either locale')
      return
    }

    console.log('=== GERMAN DISCOGRAPHY ===\n')
    const roleGroupsDE = groupRecordingsByRole(nodesDE)

    for (const [role, paragraphs] of roleGroupsDE.entries()) {
      console.log(`\n🎵 Role: ${role.toUpperCase()} (${paragraphs.length} recordings)\n`)

      paragraphs.forEach((paragraph, index) => {
        const parsed = parseRecordingParagraph(paragraph)
        console.log(`Recording ${index + 1}:`)
        console.log(`  Title: "${parsed.title}"`)
        if (parsed.description) {
          console.log(`  Description: "${parsed.description}"`)
        }
        if (parsed.label && parsed.catalogNumber) {
          console.log(`  Label: ${parsed.label}`)
          console.log(`  Catalog: ${parsed.catalogNumber}`)
        }
        if (parsed.year) {
          console.log(`  Year: ${parsed.year}`)
        }
        console.log()
      })
    }

    console.log('\n=== ENGLISH DISCOGRAPHY ===\n')
    const roleGroupsEN = groupRecordingsByRole(nodesEN)

    if (roleGroupsEN.size === 0) {
      console.log('No English discography found\n')
    } else {
      for (const [role, paragraphs] of roleGroupsEN.entries()) {
        console.log(`\n🎵 Role: ${role.toUpperCase()} (${paragraphs.length} recordings)\n`)

        paragraphs.forEach((paragraph, index) => {
          const parsed = parseRecordingParagraph(paragraph)
          console.log(`Recording ${index + 1}:`)
          console.log(`  Title: "${parsed.title}"`)
          if (parsed.description) {
            console.log(`  Description: "${parsed.description}"`)
          }
          if (parsed.label && parsed.catalogNumber) {
            console.log(`  Label: ${parsed.label}`)
            console.log(`  Catalog: ${parsed.catalogNumber}`)
          }
          console.log()
        })
      }
    }

    console.log('\n=== Summary ===')
    console.log(`DE: ${roleGroupsDE.size} role group(s)`)
    console.log(`EN: ${roleGroupsEN.size} role group(s)`)

    let totalDE = 0
    for (const paragraphs of roleGroupsDE.values()) {
      totalDE += paragraphs.length
    }
    let totalEN = 0
    for (const paragraphs of roleGroupsEN.values()) {
      totalEN += paragraphs.length
    }

    console.log(`Total recordings to create: ${totalDE} (DE) / ${totalEN} (EN)`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Preview failed:', error)
    process.exit(1)
  }
}

preview()
