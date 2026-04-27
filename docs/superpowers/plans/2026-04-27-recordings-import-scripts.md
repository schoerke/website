# Recordings Import Scripts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create two scripts — one to delete dummy recordings, one to import real per-artist recordings from manually-copied WordPress discography HTML.

**Architecture:** `tmp/delete-dummy-recordings.ts` is a one-shot cleanup script. `scripts/importArtistRecordings.ts` is a permanent reusable script that reads `/tmp/<slug>-discography-raw.html`, parses recording blocks interactively, and creates drafts in Payload. Both follow existing project patterns (dotenv/config, getPayload, readline for prompts).

**Tech Stack:** TypeScript, Payload Local API, Node.js readline (interactive prompts), dotenv

---

## File Structure

- **Create:** `tmp/delete-dummy-recordings.ts` — deletes all current dummy recordings after confirmation
- **Create:** `scripts/importArtistRecordings.ts` — generic per-artist import script

---

### Task 1: Delete dummy recordings script

**Files:**
- Create: `tmp/delete-dummy-recordings.ts`

- [ ] **Step 1: Create the script**

```typescript
/**
 * Delete all dummy recordings from the database.
 * Lists what will be deleted and asks for confirmation before proceeding.
 *
 * Usage: pnpm tsx tmp/delete-dummy-recordings.ts
 */
import 'dotenv/config'
import { createInterface } from 'readline'
import config from '@payload-config'
import { getPayload } from 'payload'

function prompt(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve))
}

async function main() {
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'recordings',
    limit: 1000,
    locale: 'de',
  })

  if (result.totalDocs === 0) {
    console.log('No recordings found. Nothing to delete.')
    process.exit(0)
  }

  console.log(`\nFound ${result.totalDocs} recording(s) to delete:\n`)
  for (const r of result.docs) {
    console.log(`  [${r.id}] ${r.title}`)
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await prompt(rl, `\nDelete all ${result.totalDocs} recording(s)? (yes/no): `)
  rl.close()

  if (answer.trim().toLowerCase() !== 'yes') {
    console.log('Aborted.')
    process.exit(0)
  }

  let deleted = 0
  for (const r of result.docs) {
    await payload.delete({ collection: 'recordings', id: r.id })
    console.log(`  ✓ Deleted [${r.id}] ${r.title}`)
    deleted++
  }

  console.log(`\nDone. Deleted ${deleted} recording(s).`)
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Verify the database config points to remote dev**

```bash
cat .env | grep DATABASE_URI
```

Expected: `DATABASE_URI=libsql://ksschoerke-development-zeitchef.aws-eu-west-1.turso.io`

- [ ] **Step 3: Run the script (confirm deletion when prompted)**

```bash
pnpm tsx tmp/delete-dummy-recordings.ts
```

Expected output lists 10 recordings, then after "yes": `Done. Deleted 10 recording(s).`

- [ ] **Step 4: Verify recordings are gone**

```bash
pnpm tsx tmp/check-recordings.ts
```

Expected: `Total recordings: 0`

---

### Task 2: Generic per-artist import script

**Files:**
- Create: `scripts/importArtistRecordings.ts`

- [ ] **Step 1: Create the script**

```typescript
/**
 * Import recordings for a single artist from manually-copied WordPress discography HTML.
 *
 * Prerequisites:
 * 1. Open https://ks-schoerke.de/kuenstler/<slug>/ in a browser
 * 2. Click the "Diskographie" tab
 * 3. Copy the rendered HTML of the discography section
 * 4. Save it to /tmp/<slug>-discography-raw.html
 *
 * Usage:
 *   pnpm tsx scripts/importArtistRecordings.ts <artist-slug>
 *
 * Example:
 *   pnpm tsx scripts/importArtistRecordings.ts thomas-zehetmair
 *
 * The script will:
 * - Parse recording blocks from the HTML
 * - Auto-guess roles where possible, prompt interactively for ambiguous ones
 * - Show a preview and ask for confirmation before writing to the database
 * - Create draft recordings in DE locale, copying title+description to EN
 *
 * @see tmp/delete-dummy-recordings.ts - cleanup script for dummy data
 */
import 'dotenv/config'
import { createInterface } from 'readline'
import { readFileSync } from 'fs'
import config from '@payload-config'
import { getPayload } from 'payload'

// --- Types ---

type RecordingRole = 'soloist' | 'conductor' | 'accompanist' | 'chamber_musician' | 'ensemble_member'

interface ParsedRecording {
  title: string
  description: string[]
  partner: string | null
  label: string | null
  catalogNumber: string | null
  year: number | null
  role: RecordingRole
}

// --- Helpers ---

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .trim()
}

function parseLabelLine(text: string): { label: string; catalogNumber: string; year: number | null } | null {
  let year: number | null = null
  const yearMatch = text.match(/\((\d{4})\)\s*$/)
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10)
    text = text.slice(0, yearMatch.index).trim()
  }
  const clean = text.replace(/\s+/g, ' ').trim()
  const match = clean.match(/^(.*?)\s+(\d[\w\s.\-]*)$/)
  if (!match) return null
  return { label: match[1].trim(), catalogNumber: match[2].trim(), year }
}

function fixKnownTypos(label: string): string {
  const fixes: Record<string, string> = {
    'Sony Classicas': 'Sony Classical',
  }
  return fixes[label] ?? label
}

function parseRecordingBlock(block: string): Omit<ParsedRecording, 'role'> | null {
  const titleMatch = block.match(/<strong>([\s\S]*?)<\/strong>/)
  if (!titleMatch) return null
  const title = stripHtml(titleMatch[1]).replace(/\n/g, ' ').trim()
  if (!title) return null

  const emMatch = block.match(/<em>([\s\S]*?)<\/em>/)
  let label: string | null = null
  let catalogNumber: string | null = null
  let year: number | null = null

  if (emMatch) {
    const emText = stripHtml(emMatch[1]).replace(/\s+/g, ' ').trim()
    const parsed = parseLabelLine(emText)
    if (parsed) {
      label = fixKnownTypos(parsed.label)
      catalogNumber = parsed.catalogNumber
      year = parsed.year
    }
  }

  if (!year) {
    const yearMatch = block.match(/\((\d{4})\)/)
    if (yearMatch) year = parseInt(yearMatch[1], 10)
  }

  const remainder = block
    .replace(/<strong>[\s\S]*?<\/strong>/, '')
    .replace(/<em>[\s\S]*?<\/em>/, '')
    .replace(/<span[^>]*>[\s\S]*?<\/span>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\((\d{4})\)/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  let partner: string | null = null
  const descriptionLines: string[] = []
  for (const line of remainder) {
    if (line.startsWith('Partner:')) {
      partner = line.replace(/^Partner:\s*/, '').trim()
    } else if (line !== 'und weitere') {
      descriptionLines.push(line)
    }
  }

  return { title, description: descriptionLines, partner, label, catalogNumber, year }
}

const ROLES: RecordingRole[] = ['soloist', 'conductor', 'accompanist', 'chamber_musician', 'ensemble_member']

function guessRole(recording: Omit<ParsedRecording, 'role'>): RecordingRole | null {
  if (!recording.partner) return 'soloist'
  const partner = recording.partner.toLowerCase()
  if (partner.includes('dirigent') || partner.includes('orchester') || partner.includes('orchestra')) return 'soloist'
  if (
    partner.includes('quartett') ||
    partner.includes('quartet') ||
    partner.includes('quintett') ||
    partner.includes('trio') ||
    partner.includes('ensemble')
  ) return 'chamber_musician'
  return null
}

function prompt(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve))
}

function makeDescriptionRichText(lines: string[], partner: string | null) {
  const allLines = partner ? [...lines, `Partner: ${partner}`] : lines
  if (allLines.length === 0) return null
  return {
    root: {
      type: 'root',
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
      children: allLines.map((line) => ({
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        textFormat: 0,
        textStyle: '',
        children: [{ type: 'text', version: 1, text: line, format: 0, mode: 'normal', style: '', detail: 0 }],
      })),
    },
  }
}

// --- Main ---

async function main() {
  const slug = process.argv[2]
  if (!slug) {
    console.error('Usage: pnpm tsx scripts/importArtistRecordings.ts <artist-slug>')
    console.error('Example: pnpm tsx scripts/importArtistRecordings.ts thomas-zehetmair')
    process.exit(1)
  }

  const htmlPath = `/tmp/${slug}-discography-raw.html`
  let rawContent: string
  try {
    rawContent = readFileSync(htmlPath, 'utf-8')
  } catch {
    console.error(`\nError: Could not read file: ${htmlPath}`)
    console.error('\nTo prepare the HTML:')
    console.error(`  1. Open https://ks-schoerke.de/kuenstler/${slug}/ in a browser`)
    console.error('  2. Click the "Diskographie" tab')
    console.error('  3. Copy the rendered HTML of the discography section')
    console.error(`  4. Save it to ${htmlPath}`)
    process.exit(1)
  }

  console.log(`\n=== Recordings Import: ${slug} ===\n`)

  const blocks = rawContent.split(/\n\n+/).filter((b) => b.trim() && b.trim() !== 'und weitere')

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const recordings: ParsedRecording[] = []

  for (const block of blocks) {
    const parsed = parseRecordingBlock(block.trim())
    if (!parsed) continue

    const guessed = guessRole(parsed)
    if (guessed) {
      recordings.push({ ...parsed, role: guessed })
    } else {
      console.log(`\nAmbiguous role for: "${parsed.title}"`)
      if (parsed.partner) console.log(`  Partner: ${parsed.partner}`)
      console.log(`  Available roles: ${ROLES.map((r, i) => `${i + 1}) ${r}`).join(', ')}`)
      let role: RecordingRole | null = null
      while (!role) {
        const answer = await prompt(rl, `  Enter role number or name: `)
        const num = parseInt(answer.trim(), 10)
        if (!isNaN(num) && num >= 1 && num <= ROLES.length) {
          role = ROLES[num - 1]
        } else if (ROLES.includes(answer.trim() as RecordingRole)) {
          role = answer.trim() as RecordingRole
        } else {
          console.log(`  Invalid. Choose from: ${ROLES.join(', ')}`)
        }
      }
      recordings.push({ ...parsed, role })
    }
  }

  if (recordings.length === 0) {
    rl.close()
    console.log('No recording blocks found in the HTML. Check the file format.')
    process.exit(1)
  }

  // Preview
  console.log(`\nParsed ${recordings.length} recording(s):\n`)
  for (let i = 0; i < recordings.length; i++) {
    const r = recordings[i]
    const labelCatalogYear = [r.label, r.catalogNumber, r.year ? `(${r.year})` : null].filter(Boolean).join(' ')
    console.log(`${i + 1}. ${r.title}`)
    if (r.description.length > 0) console.log(`   ${r.description.join('\n   ')}`)
    if (r.partner)                 console.log(`   Partner: ${r.partner}`)
    if (labelCatalogYear)          console.log(`   ${labelCatalogYear}`)
    console.log(`   Role: ${r.role}`)
    console.log()
  }

  // Check for existing recordings
  const payload = await getPayload({ config })

  const artistResult = await payload.find({
    collection: 'artists',
    where: { slug: { equals: slug } },
    depth: 0,
    locale: 'de',
  })
  const artist = artistResult.docs[0]
  if (!artist) {
    rl.close()
    console.error(`Artist with slug "${slug}" not found in the database.`)
    process.exit(1)
  }

  const existingResult = await payload.find({
    collection: 'recordings',
    where: { artists: { equals: artist.id } },
    limit: 1,
    locale: 'de',
  })

  if (existingResult.totalDocs > 0) {
    console.log(`⚠️  ${existingResult.totalDocs} recording(s) already exist for ${artist.name}.`)
    const proceed = await prompt(rl, `Proceed anyway and create duplicates? (yes/no): `)
    if (proceed.trim().toLowerCase() !== 'yes') {
      rl.close()
      console.log('Aborted.')
      process.exit(0)
    }
  }

  const confirm = await prompt(rl, `Create ${recordings.length} draft recording(s) for ${artist.name}? (yes/no): `)
  rl.close()

  if (confirm.trim().toLowerCase() !== 'yes') {
    console.log('Aborted.')
    process.exit(0)
  }

  console.log(`\nCreating recordings for ${artist.name} (ID ${artist.id})...\n`)

  let created = 0
  for (const r of recordings) {
    const description = makeDescriptionRichText(r.description, r.partner)

    const recording = await payload.create({
      collection: 'recordings',
      data: {
        title: r.title,
        description: description as never,
        recordingYear: r.year ?? undefined,
        recordingLabel: r.label ?? undefined,
        catalogNumber: r.catalogNumber ?? undefined,
        artists: [artist.id],
        roles: [r.role],
        _status: 'draft',
      },
      locale: 'de',
    })

    await payload.update({
      collection: 'recordings',
      id: recording.id,
      data: {
        title: r.title,
        description: description as never,
      },
      locale: 'en',
    })

    console.log(`  ✓ "${r.title}" (ID ${recording.id})`)
    created++
  }

  console.log(`\nDone. Created ${created} draft recording(s) for ${artist.name}.`)
  console.log('Review in the Payload admin under Recordings.')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Verify the script runs with no HTML file and exits gracefully**

```bash
pnpm tsx scripts/importArtistRecordings.ts thomas-zehetmair
```

Expected: error message explaining how to prepare the HTML file, then exit.

- [ ] **Step 3: Test with real data for Thomas Zehetmair**

1. Open `https://ks-schoerke.de/kuenstler/thomas-zehetmair/` in a browser
2. Click "Diskographie" tab
3. Copy the rendered HTML of that section
4. Save to `/tmp/thomas-zehetmair-discography-raw.html`

Then run:
```bash
pnpm tsx scripts/importArtistRecordings.ts thomas-zehetmair
```

Expected: preview of parsed recordings, confirmation prompt, then draft records created.

- [ ] **Step 4: Verify recordings were created**

```bash
pnpm tsx tmp/check-recordings.ts
```

Expected: shows newly created recordings for Thomas Zehetmair.
