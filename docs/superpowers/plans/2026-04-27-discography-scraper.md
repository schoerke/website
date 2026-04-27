# Discography Scraper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scrape discography HTML for all 24 artists from the live WordPress site (DE + EN), save locally, print comparison summary, and update the import script to use the saved files.

**Architecture:** A single `tmp/scrape-discographies.ts` script reads artist slugs from the WordPress XML export, fetches each artist page with Node's built-in `https` module (following redirects), extracts the `#artist-diskography` div innerHTML with a regex, and saves to `tmp/discography-html/`. The existing `scripts/importArtistRecordings.ts` is updated to read from `tmp/discography-html/<slug>-de.html` and `tmp/discography-html/<slug>-en.html`.

**Tech Stack:** TypeScript, Node.js `https`/`http` built-ins (no new dependencies), XML parsing via `node:fs` + regex (same pattern as existing WordPress scripts)

---

## File Structure

- **Create:** `tmp/scrape-discographies.ts` — scraper script
- **Modify:** `scripts/importArtistRecordings.ts` — update file path and add EN locale support

---

### Task 1: Scrape discography HTML for all artists

**Files:**
- Create: `tmp/scrape-discographies.ts`
- Create: `tmp/discography-html/` (directory, created by script)

- [ ] **Step 1: Create the scraper script**

```typescript
/**
 * Scrape discography HTML for all 24 artists from the live WordPress site.
 *
 * Fetches both DE (ks-schoerke.de) and EN (en.ks-schoerke.de) versions,
 * extracts the #artist-diskography div, and saves to tmp/discography-html/.
 *
 * Usage: pnpm tsx tmp/scrape-discographies.ts
 *
 * Output:
 *   tmp/discography-html/<slug>-de.html
 *   tmp/discography-html/<slug>-en.html
 */
import { mkdirSync, writeFileSync, readFileSync } from 'fs'
import { get } from 'https'
import { join } from 'path'

const OUTPUT_DIR = join(process.cwd(), 'tmp/discography-html')

// Artist slugs from WordPress XML (all-de.xml artist post types)
const SLUGS = [
  'ruth-killius',
  'gustav-rivinius',
  'marie-luise-neunecker',
  'tzimon-barto',
  'till-fellner',
  'martin-stadtfeld',
  'andreas-staier',
  'trio-jean-paul',
  'jean-paul-gasparian',
  'christian-poltera',
  'marc-gruber',
  'jonian-ilias-kadesha',
  'dominik-wagner',
  'cuarteto-soltango',
  'zehetmair-quartett',
  'trio-gaspard',
  'monet-quintett',
  'tianwa-yang',
  'claire-huangci',
  'olga-scheps',
  'christian-zacharias',
  'maurice-steger',
  'thomas-zehetmair',
  'mario-venzago',
]

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      // Follow redirects (301/302)
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(fetchUrl(res.headers.location))
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
      res.on('error', reject)
    }).on('error', reject)
  })
}

function extractDiskography(html: string): string {
  // Extract innerHTML of <div id="artist-diskography"...>
  const match = html.match(/<div[^>]*id="artist-diskography"[^>]*>([\s\S]*?)<\/div>\s*(?=<div|$)/)
  if (!match) return ''
  return match[1].trim()
}

function normalizeText(html: string): string {
  return html.replace(/\s+/g, ' ').replace(/&nbsp;/g, ' ').trim()
}

type Status = 'BOTH' | 'IDENTICAL' | 'DE ONLY' | 'EMPTY'

interface ArtistResult {
  slug: string
  status: Status
  deLines: number
  enLines: number
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log(`\n=== Scraping discographies for ${SLUGS.length} artists ===\n`)

  const results: ArtistResult[] = []

  for (const slug of SLUGS) {
    process.stdout.write(`  ${slug}... `)

    const deUrl = `https://ks-schoerke.de/kuenstler/${slug}/`
    const enUrl = `https://en.ks-schoerke.de/artist/${slug}/`

    let deHtml = ''
    let enHtml = ''

    try {
      const dePage = await fetchUrl(deUrl)
      deHtml = extractDiskography(dePage)
    } catch (e) {
      console.error(`DE fetch failed: ${e instanceof Error ? e.message : e}`)
    }

    try {
      const enPage = await fetchUrl(enUrl)
      enHtml = extractDiskography(enPage)
    } catch (e) {
      // EN page may not exist for all artists — not an error
    }

    writeFileSync(join(OUTPUT_DIR, `${slug}-de.html`), deHtml, 'utf-8')
    writeFileSync(join(OUTPUT_DIR, `${slug}-en.html`), enHtml, 'utf-8')

    const hasDE = deHtml.length > 0
    const hasEN = enHtml.length > 0
    const identical = hasDE && hasEN && normalizeText(deHtml) === normalizeText(enHtml)

    let status: Status
    if (!hasDE && !hasEN) status = 'EMPTY'
    else if (hasDE && !hasEN) status = 'DE ONLY'
    else if (identical) status = 'IDENTICAL'
    else status = 'BOTH'

    const deLines = deHtml ? deHtml.split('<p>').length - 1 : 0
    const enLines = enHtml ? enHtml.split('<p>').length - 1 : 0

    results.push({ slug, status, deLines, enLines })
    console.log(`${status} (DE: ${deLines} recordings, EN: ${enLines} recordings)`)
  }

  console.log('\n=== Summary ===\n')
  const counts: Record<Status, number> = { BOTH: 0, IDENTICAL: 0, 'DE ONLY': 0, EMPTY: 0 }
  for (const r of results) counts[r.status]++

  console.log(`  BOTH (DE + EN, different):  ${counts['BOTH']}`)
  console.log(`  IDENTICAL (same content):   ${counts['IDENTICAL']}`)
  console.log(`  DE ONLY (no EN):            ${counts['DE ONLY']}`)
  console.log(`  EMPTY (no discography):     ${counts['EMPTY']}`)
  console.log(`\nFiles saved to: tmp/discography-html/`)
  console.log(`\nNext step: pnpm tsx scripts/importArtistRecordings.ts <slug>`)
}

main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Run the scraper**

```bash
pnpm tsx tmp/scrape-discographies.ts
```

Expected: output showing status for all 24 artists, files saved to `tmp/discography-html/`.

- [ ] **Step 3: Verify output files exist**

```bash
ls tmp/discography-html/ | head -10
wc -l tmp/discography-html/maurice-steger-de.html
```

Expected: 48 files (24 artists × 2 locales), `maurice-steger-de.html` should have content.

- [ ] **Step 4: Spot-check a known artist**

```bash
grep -o '<p>' tmp/discography-html/maurice-steger-de.html | wc -l
```

Expected: `23` (we know Maurice Steger has 23 recordings).

---

### Task 2: Update import script to use scraped files and EN locale

**Files:**
- Modify: `scripts/importArtistRecordings.ts`

The import script currently reads from `/tmp/<slug>-discography-raw.html` (single locale). Update it to:
- Read DE from `tmp/discography-html/<slug>-de.html`
- Read EN from `tmp/discography-html/<slug>-en.html`
- Use real EN content when available (non-empty) instead of always copying DE

- [ ] **Step 1: Update the file path and add EN file reading**

In `scripts/importArtistRecordings.ts`, replace the file reading section (around lines 182–198):

```typescript
  const deHtmlPath = join(process.cwd(), 'tmp/discography-html', `${slug}-de.html`)
  const enHtmlPath = join(process.cwd(), 'tmp/discography-html', `${slug}-en.html`)

  let deContent: string
  let enContent: string | null = null

  try {
    deContent = readFileSync(deHtmlPath, 'utf-8')
  } catch {
    console.error(`\nError: Could not read file: ${deHtmlPath}`)
    console.error('\nRun the scraper first:')
    console.error('  pnpm tsx tmp/scrape-discographies.ts')
    process.exit(1)
  }

  if (!deContent.trim()) {
    console.error(`\nError: No discography content found for "${slug}" (DE file is empty).`)
    console.error('This artist may not have a discography on the WordPress site.')
    process.exit(1)
  }

  try {
    const raw = readFileSync(enHtmlPath, 'utf-8')
    enContent = raw.trim() || null
  } catch {
    // EN file missing is fine — will copy DE content
  }

  const hasEN = enContent !== null
  console.log(`\n=== Recordings Import: ${slug} ===`)
  console.log(`EN locale: ${hasEN ? 'available' : 'not available (will copy DE)'}`)
  console.log()
```

Also add `join` to the imports at the top:
```typescript
import { readFileSync } from 'fs'
import { join } from 'path'
```

- [ ] **Step 2: Update block splitting to use `deContent` variable**

Replace the line that sets `rawContent` / `blocks` (around line 202):
```typescript
  const rawBlocks = deContent.includes('<p>') ? deContent.split(/<p>/) : deContent.split(/\n\n+/)
  const blocks = rawBlocks.map((b) => b.replace(/<\/p>/g, '').trim()).filter((b) => b && b !== 'und weitere')
```

- [ ] **Step 3: Update the EN locale update to use real EN content when available**

Replace the EN update section inside the creation loop (around lines 311–319):

```typescript
    // Use real EN content if available, otherwise copy DE
    const enTitle = (() => {
      if (!enContent) return r.title
      // Try to find matching block by position in EN content
      const enRawBlocks = enContent.includes('<p>') ? enContent.split(/<p>/) : enContent.split(/\n\n+/)
      const enBlocks = enRawBlocks.map((b) => b.replace(/<\/p>/g, '').trim()).filter((b) => b && b !== 'und weitere')
      const enBlock = enBlocks[recordings.indexOf(r)]
      if (!enBlock) return r.title
      const parsed = parseRecordingBlock(enBlock)
      return parsed?.title || r.title
    })()

    await payload.update({
      collection: 'recordings',
      id: recording.id,
      data: {
        title: enTitle,
        description: description as never,
      },
      locale: 'en',
    })
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 5: Test the error path**

```bash
pnpm tsx scripts/importArtistRecordings.ts nonexistent-artist
```

Expected: error message saying to run the scraper first, then exit.

- [ ] **Step 6: Test with Maurice Steger (dry run — abort at confirmation)**

```bash
pnpm tsx scripts/importArtistRecordings.ts maurice-steger
```

Expected: parses 23 recordings, shows preview, prompts for confirmation. Type `no` to abort without writing to DB.
