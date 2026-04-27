# Recordings Dataset + Review UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pipeline to scrape → parse → review (in browser, editable) → import recordings for all 24 artists into Payload CMS.

**Architecture:** Three pieces — (1) a build script that parses `tmp/discography-html/` into a clean JSON dataset, (2) a Next.js dev route at `/dev/recordings-review` that renders the dataset as an editable table and saves changes via a server action, (3) an import script that reads the final JSON and writes to Payload.

**Tech Stack:** TypeScript, Next.js App Router, Payload CMS Local API, React, Tailwind CSS

---

## Dataset JSON Schema

`scripts/wordpress/data/recordings-dataset.json` — array of objects:

```ts
interface RecordingEntry {
  artistSlug: string           // e.g. "maurice-steger"
  needsManualEntry?: true      // flag for artists whose HTML couldn't be parsed
  de: {
    title: string              // DE title
    description: string[]      // track listing / program notes lines
  }
  en: {
    title: string              // EN title (may equal DE if no EN translation found)
    description: string[]
  }
  label: string | null         // record label, e.g. "harmonia mundi"
  catalogNumber: string | null // e.g. "HMC 902190"
  year: number | null          // recording/release year
  role: 'soloist' | 'conductor' | 'ensemble_member' | 'chamber_musician' | 'accompanist'
  partner: string | null       // partner info (stored in description on import)
}
```

The file is a top-level array. `artistSlug` is the only grouping — one object per recording.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `scripts/wordpress/buildRecordingsDataset.ts` | Create | Parse all HTML → `recordings-dataset.json` |
| `scripts/wordpress/data/recordings-dataset.json` | Create (generated) | Intermediary dataset for human review |
| `scripts/wordpress/importRecordingsDataset.ts` | Create | Read JSON → write to Payload (skip existing) |
| `src/app/(payload)/admin/recordings-review/page.tsx` | Create | Server component: load JSON, render review UI |
| `src/app/(payload)/admin/recordings-review/RecordingsReviewClient.tsx` | Create | Client component: editable table |
| `src/app/(payload)/admin/recordings-review/actions.ts` | Create | Server action: `saveDataset(data)` → write JSON |

**Why `(payload)/admin/recordings-review`?** The `(payload)` route group already exists and handles the admin layout. Adding a sub-route here is simpler than creating a new `(dev)` group. It will be accessible at `/admin/recordings-review` while the dev server is running.

---

## Task 1: Build Script — `buildRecordingsDataset.ts`

**Files:**
- Create: `scripts/wordpress/buildRecordingsDataset.ts`

- [ ] **Step 1: Create the build script**

```typescript
/**
 * Parse discography HTML files into a structured JSON dataset for review.
 *
 * Reads:  tmp/discography-html/<slug>-{de,en}.html  (48 files)
 * Writes: scripts/wordpress/data/recordings-dataset.json
 *
 * Usage: pnpm tsx scripts/wordpress/buildRecordingsDataset.ts
 *
 * After running, review and edit recordings-dataset.json, then import:
 *   pnpm tsx scripts/wordpress/importRecordingsDataset.ts --dry-run
 *   pnpm tsx scripts/wordpress/importRecordingsDataset.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const HTML_DIR = join(process.cwd(), 'tmp/discography-html')
const OUT_FILE = join(process.cwd(), 'scripts/wordpress/data/recordings-dataset.json')

const SLUGS = [
  'maurice-steger',
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
  'thomas-zehetmair',
  'mario-venzago',
]

type RecordingRole = 'soloist' | 'conductor' | 'ensemble_member' | 'chamber_musician' | 'accompanist'

interface RecordingEntry {
  artistSlug: string
  needsManualEntry?: true
  de: { title: string; description: string[] }
  en: { title: string; description: string[] }
  label: string | null
  catalogNumber: string | null
  year: number | null
  role: RecordingRole
  partner: string | null
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)))
    .replace(/&#x([\da-f]+);/gi, (_, c) => String.fromCharCode(parseInt(c, 16)))
}

function normalizeBlock(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')
}

function parseLabelLine(text: string): { label: string; catalogNumber: string | null; year: number | null } | null {
  let remaining = text.trim()
  let year: number | null = null
  const ym = remaining.match(/\((\d{4})\)\s*$/)
  if (ym) {
    year = parseInt(ym[1], 10)
    remaining = remaining.slice(0, ym.index).trim()
  }
  if (!remaining) return null
  const m = remaining.replace(/\s+/g, ' ').match(/^(.*?)\s+(\d[\w.\-]*)$/)
  if (m) return { label: m[1].trim(), catalogNumber: m[2].trim(), year }
  return { label: remaining, catalogNumber: null, year }
}

const LABEL_FIXES: Record<string, string> = { 'Sony Classicas': 'Sony Classical' }
function fixLabel(label: string): string { return LABEL_FIXES[label] ?? label }

function parseBlock(block: string): Omit<RecordingEntry, 'artistSlug' | 'en' | 'role'> | null {
  const tm = block.match(/<strong>([\s\S]*?)<\/strong>/)
  if (!tm) return null
  const title = decodeEntities(tm[1].replace(/<[^>]+>/g, '').replace(/\n/g, ' ')).trim()
  if (!title) return null

  const lines = normalizeBlock(block).split('\n')
  const lastLine = lines[lines.length - 1] ?? ''
  const parsed = parseLabelLine(lastLine)

  // Sanity check: if lastLine equals title, it's not a label line (single-line block)
  const isTitleOnly = lines.length === 1 || lastLine === title
  const label = !isTitleOnly && parsed ? fixLabel(parsed.label) : null
  const catalogNumber = !isTitleOnly && parsed ? parsed.catalogNumber : null
  const year = !isTitleOnly && parsed ? parsed.year : null

  const middleLines = isTitleOnly
    ? []
    : lines.filter((l) => l !== title && l !== lastLine && l !== 'und weitere')

  let partner: string | null = null
  const description: string[] = []
  for (const line of middleLines) {
    if (line.startsWith('Partner:')) partner = line.replace(/^Partner:\s*/, '').trim()
    else description.push(line)
  }

  return { de: { title, description }, label, catalogNumber, year, partner }
}

function guessRole(partner: string | null): RecordingRole {
  if (!partner) return 'soloist'
  const p = partner.toLowerCase()
  if (p.includes('dirigent') || p.includes('orchester') || p.includes('orchestra')) return 'soloist'
  if (
    p.includes('quartett') || p.includes('quartet') ||
    p.includes('quintett') || p.includes('quintet') ||
    p.includes('trio') || p.includes('ensemble')
  ) return 'chamber_musician'
  return 'chamber_musician'
}

function splitBlocks(raw: string): string[] {
  return (raw.includes('<p>') ? raw.split(/<p>/) : raw.split(/\n\n+/))
    .map((b) => b.replace(/<\/p>/g, '').trim())
    .filter((b) => b && b !== 'und weitere')
}

function buildArtist(slug: string): RecordingEntry[] {
  const dePath = join(HTML_DIR, `${slug}-de.html`)
  const enPath = join(HTML_DIR, `${slug}-en.html`)
  const deRaw = existsSync(dePath) ? readFileSync(dePath, 'utf-8').trim() : ''
  const enRaw = existsSync(enPath) ? readFileSync(enPath, 'utf-8').trim() : ''
  const sourceRaw = deRaw || enRaw

  if (!sourceRaw) return []

  const deBlocks = splitBlocks(sourceRaw)
  // EN blocks: only use if different from source (i.e. DE wasn't empty)
  const enBlocks = (deRaw && enRaw) ? splitBlocks(enRaw) : []

  return deBlocks.map((block, i): RecordingEntry | null => {
    const de = parseBlock(block)
    if (!de) return null

    // Match EN block by position
    const enBlock = i < enBlocks.length ? enBlocks[i] : null
    const enParsed = enBlock ? parseBlock(enBlock) : null

    return {
      artistSlug: slug,
      de: de.de,
      en: {
        title: enParsed?.de.title ?? de.de.title,
        description: enParsed?.de.description ?? de.de.description,
      },
      label: de.label,
      catalogNumber: de.catalogNumber,
      year: de.year,
      role: guessRole(de.partner),
      partner: de.partner,
    }
  }).filter((r): r is RecordingEntry => r !== null)
}

// Artists known to have non-standard HTML (section headers, not albums)
const NEEDS_MANUAL: Set<string> = new Set(['christian-zacharias', 'thomas-zehetmair'])

function main() {
  const dataset: RecordingEntry[] = []
  const stats: Record<string, number> = {}

  for (const slug of SLUGS) {
    if (NEEDS_MANUAL.has(slug)) {
      // Insert a placeholder entry so it appears in the review UI
      dataset.push({
        artistSlug: slug,
        needsManualEntry: true,
        de: { title: '', description: [] },
        en: { title: '', description: [] },
        label: null,
        catalogNumber: null,
        year: null,
        role: 'soloist',
        partner: null,
      })
      stats[slug] = 0
      console.log(`  ${slug}: needs manual entry`)
      continue
    }

    const entries = buildArtist(slug)
    dataset.push(...entries)
    stats[slug] = entries.length
    console.log(`  ${slug}: ${entries.length} recordings`)
  }

  mkdirSync(join(process.cwd(), 'scripts/wordpress/data'), { recursive: true })
  writeFileSync(OUT_FILE, JSON.stringify(dataset, null, 2) + '\n', 'utf-8')

  const total = Object.values(stats).reduce((a, b) => a + b, 0)
  console.log(`\nWrote ${total} recordings to ${OUT_FILE}`)
}

main()
```

- [ ] **Step 2: Run it and verify**

```bash
pnpm tsx scripts/wordpress/buildRecordingsDataset.ts
```

Expected output: 24 artist lines, then `Wrote NNN recordings to scripts/wordpress/data/recordings-dataset.json`

```bash
cat scripts/wordpress/data/recordings-dataset.json | node -e "const d=require('fs').readFileSync('/dev/stdin','utf-8'); const a=JSON.parse(d); console.log('entries:', a.length, 'slugs:', [...new Set(a.map(r=>r.artistSlug))].length)"
```

Expected: `entries: ~280 slugs: 24`

---

## Task 2: Review UI — Server Component Page

**Files:**
- Create: `src/app/(payload)/admin/recordings-review/page.tsx`

The page is a server component. It reads the JSON file from disk, passes data to the client component.

- [ ] **Step 1: Create the page**

```typescript
import { readFileSync } from 'fs'
import { join } from 'path'
import RecordingsReviewClient from './RecordingsReviewClient'

const DATASET_PATH = join(process.cwd(), 'scripts/wordpress/data/recordings-dataset.json')

const RecordingsReviewPage = () => {
  let data: unknown[] = []
  try {
    data = JSON.parse(readFileSync(DATASET_PATH, 'utf-8'))
  } catch {
    data = []
  }
  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Recordings Dataset Review</h1>
      <p className="text-sm text-gray-500 mb-6">
        Edit fields inline. Click <strong>Save All</strong> to write changes back to{' '}
        <code>scripts/wordpress/data/recordings-dataset.json</code>.
      </p>
      <RecordingsReviewClient initialData={data} />
    </div>
  )
}

export default RecordingsReviewPage
```

---

## Task 3: Review UI — Server Action

**Files:**
- Create: `src/app/(payload)/admin/recordings-review/actions.ts`

- [ ] **Step 1: Create the server action**

```typescript
'use server'

import { writeFileSync } from 'fs'
import { join } from 'path'

const DATASET_PATH = join(process.cwd(), 'scripts/wordpress/data/recordings-dataset.json')

export async function saveDataset(data: unknown[]): Promise<{ ok: boolean; error?: string }> {
  try {
    writeFileSync(DATASET_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
```

---

## Task 4: Review UI — Editable Client Component

**Files:**
- Create: `src/app/(payload)/admin/recordings-review/RecordingsReviewClient.tsx`

The client component renders a full-page editable table grouped by artist. Each row is editable inline. A sticky "Save All" button at the top calls the server action.

- [ ] **Step 1: Create the client component**

```typescript
'use client'

import { useCallback, useState } from 'react'
import { saveDataset } from './actions'

type RecordingRole = 'soloist' | 'conductor' | 'ensemble_member' | 'chamber_musician' | 'accompanist'

interface RecordingEntry {
  artistSlug: string
  needsManualEntry?: boolean
  de: { title: string; description: string[] }
  en: { title: string; description: string[] }
  label: string | null
  catalogNumber: string | null
  year: number | null
  role: RecordingRole
  partner: string | null
}

const ROLES: RecordingRole[] = ['soloist', 'conductor', 'ensemble_member', 'chamber_musician', 'accompanist']

interface RecordingsReviewClientProps {
  initialData: unknown[]
}

const RecordingsReviewClient: React.FC<RecordingsReviewClientProps> = ({ initialData }) => {
  const [data, setData] = useState<RecordingEntry[]>(initialData as RecordingEntry[])
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  const updateEntry = useCallback((index: number, patch: Partial<RecordingEntry>) => {
    setData((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
    setSaveStatus('idle')
  }, [])

  const deleteEntry = useCallback((index: number) => {
    setData((prev) => prev.filter((_, i) => i !== index))
    setSaveStatus('idle')
  }, [])

  const addEntry = useCallback((artistSlug: string) => {
    const newEntry: RecordingEntry = {
      artistSlug,
      de: { title: '', description: [] },
      en: { title: '', description: [] },
      label: null,
      catalogNumber: null,
      year: null,
      role: 'soloist',
      partner: null,
    }
    setData((prev) => {
      // Insert after the last entry for this artist
      const lastIdx = prev.map((e, i) => e.artistSlug === artistSlug ? i : -1).filter(i => i >= 0).at(-1) ?? prev.length - 1
      const next = [...prev]
      next.splice(lastIdx + 1, 0, newEntry)
      return next
    })
    setSaveStatus('idle')
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const result = await saveDataset(data)
    setSaving(false)
    setSaveStatus(result.ok ? 'saved' : 'error')
  }

  // Group by artist slug for display
  const slugs = [...new Set(data.map((r) => r.artistSlug))]

  return (
    <div>
      {/* Sticky save bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 mb-6 shadow-sm">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save All'}
        </button>
        {saveStatus === 'saved' && <span className="text-green-600 text-sm">Saved to recordings-dataset.json</span>}
        {saveStatus === 'error' && <span className="text-red-600 text-sm">Save failed — check console</span>}
        <span className="text-gray-400 text-sm ml-auto">{data.length} recordings across {slugs.length} artists</span>
      </div>

      {slugs.map((slug) => {
        const entries = data.map((e, i) => ({ e, i })).filter(({ e }) => e.artistSlug === slug)
        const needsManual = entries.some(({ e }) => e.needsManualEntry)

        return (
          <div key={slug} className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-lg font-semibold text-gray-800">{slug}</h2>
              {needsManual && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-medium">needs manual entry</span>
              )}
              <span className="text-xs text-gray-400">{entries.filter(({e}) => !e.needsManualEntry).length} recordings</span>
              <button
                onClick={() => addEntry(slug)}
                className="ml-auto text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
              >
                + Add recording
              </button>
            </div>

            <div className="overflow-x-auto rounded border border-gray-200">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-2 py-2 text-left w-6">#</th>
                    <th className="px-2 py-2 text-left min-w-48">DE Title</th>
                    <th className="px-2 py-2 text-left min-w-48">EN Title</th>
                    <th className="px-2 py-2 text-left min-w-32">Label</th>
                    <th className="px-2 py-2 text-left min-w-24">Cat #</th>
                    <th className="px-2 py-2 text-left w-16">Year</th>
                    <th className="px-2 py-2 text-left w-36">Role</th>
                    <th className="px-2 py-2 text-left min-w-40">Partner</th>
                    <th className="px-2 py-2 text-left min-w-48">DE Description</th>
                    <th className="px-2 py-2 text-left min-w-48">EN Description</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map(({ e, i }, rowIdx) => (
                    <tr key={i} className={e.needsManualEntry ? 'bg-yellow-50' : rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-2 py-1 text-gray-400">{rowIdx + 1}</td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                          value={e.de.title}
                          onChange={(ev) => updateEntry(i, { de: { ...e.de, title: ev.target.value } })}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                          value={e.en.title}
                          onChange={(ev) => updateEntry(i, { en: { ...e.en, title: ev.target.value } })}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                          value={e.label ?? ''}
                          onChange={(ev) => updateEntry(i, { label: ev.target.value || null })}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                          value={e.catalogNumber ?? ''}
                          onChange={(ev) => updateEntry(i, { catalogNumber: ev.target.value || null })}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                          value={e.year ?? ''}
                          onChange={(ev) => updateEntry(i, { year: ev.target.value ? parseInt(ev.target.value, 10) : null })}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <select
                          className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                          value={e.role}
                          onChange={(ev) => updateEntry(i, { role: ev.target.value as RecordingRole })}
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                          value={e.partner ?? ''}
                          onChange={(ev) => updateEntry(i, { partner: ev.target.value || null })}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <textarea
                          rows={2}
                          className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 resize-y"
                          value={e.de.description.join('\n')}
                          onChange={(ev) => updateEntry(i, { de: { ...e.de, description: ev.target.value ? ev.target.value.split('\n') : [] } })}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <textarea
                          rows={2}
                          className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 resize-y"
                          value={e.en.description.join('\n')}
                          onChange={(ev) => updateEntry(i, { en: { ...e.en, description: ev.target.value ? ev.target.value.split('\n') : [] } })}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <button
                          onClick={() => deleteEntry(i)}
                          className="text-red-400 hover:text-red-600 font-bold text-sm"
                          title="Delete"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default RecordingsReviewClient
```

---

## Task 5: Import Script — `importRecordingsDataset.ts`

**Files:**
- Create: `scripts/wordpress/importRecordingsDataset.ts`

- [ ] **Step 1: Create the import script**

```typescript
/**
 * Import recordings from recordings-dataset.json into Payload CMS.
 *
 * - Skips artists that already have recordings in the DB
 * - Creates each recording in DE locale, then updates EN locale
 * - All recordings created as drafts
 *
 * Usage:
 *   pnpm tsx scripts/wordpress/importRecordingsDataset.ts --dry-run
 *   pnpm tsx scripts/wordpress/importRecordingsDataset.ts
 *   pnpm tsx scripts/wordpress/importRecordingsDataset.ts --slugs=ruth-killius,till-fellner
 */
import 'dotenv/config'
import { readFileSync } from 'fs'
import { join } from 'path'
import config from '@payload-config'
import { getPayload } from 'payload'

const DATASET_PATH = join(process.cwd(), 'scripts/wordpress/data/recordings-dataset.json')
const DRY_RUN = process.argv.includes('--dry-run')
const SLUGS_ARG = process.argv.find((a) => a.startsWith('--slugs='))
const FILTER_SLUGS: string[] | null = SLUGS_ARG ? SLUGS_ARG.split('=')[1].split(',') : null

type RecordingRole = 'soloist' | 'conductor' | 'ensemble_member' | 'chamber_musician' | 'accompanist'

interface RecordingEntry {
  artistSlug: string
  needsManualEntry?: boolean
  de: { title: string; description: string[] }
  en: { title: string; description: string[] }
  label: string | null
  catalogNumber: string | null
  year: number | null
  role: RecordingRole
  partner: string | null
}

function makeRichText(lines: string[]) {
  if (lines.length === 0) return null
  return {
    root: {
      type: 'root',
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
      children: lines.map((line) => ({
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

async function main() {
  const dataset: RecordingEntry[] = JSON.parse(readFileSync(DATASET_PATH, 'utf-8'))

  // Group by artist slug
  const bySlug = new Map<string, RecordingEntry[]>()
  for (const entry of dataset) {
    if (!bySlug.has(entry.artistSlug)) bySlug.set(entry.artistSlug, [])
    bySlug.get(entry.artistSlug)!.push(entry)
  }

  const payload = await getPayload({ config })
  let totalCreated = 0
  const errors: string[] = []

  for (const [slug, entries] of bySlug) {
    if (FILTER_SLUGS && !FILTER_SLUGS.includes(slug)) continue

    // Skip needsManualEntry placeholders
    if (entries.every((e) => e.needsManualEntry)) {
      console.log(`\n${slug}: SKIP (needs manual entry)`)
      continue
    }

    // Find artist in DB
    const artistResult = await payload.find({
      collection: 'artists',
      where: { slug: { equals: slug } },
      depth: 0,
      locale: 'de',
    })
    const artist = artistResult.docs[0]
    if (!artist) {
      console.log(`\n${slug}: SKIP (artist not found in DB)`)
      errors.push(`${slug}: artist not found`)
      continue
    }

    // Skip if already has recordings
    const existing = await payload.find({
      collection: 'recordings',
      where: { artists: { equals: artist.id } },
      limit: 1,
      locale: 'de',
    })
    if (existing.totalDocs > 0) {
      console.log(`\n${slug}: SKIP (${existing.totalDocs} recordings already exist)`)
      continue
    }

    const validEntries = entries.filter((e) => !e.needsManualEntry && e.de.title)
    console.log(`\n${slug} (ID ${artist.id}): creating ${validEntries.length} recordings${DRY_RUN ? ' [DRY RUN]' : ''}`)

    for (const r of validEntries) {
      const descriptionLines = r.partner
        ? [...r.de.description, `Partner: ${r.partner}`]
        : r.de.description
      const descriptionLinesEn = r.partner
        ? [...r.en.description, `Partner: ${r.partner}`]
        : r.en.description

      if (DRY_RUN) {
        console.log(`  [dry] "${r.de.title}" | ${r.label ?? '—'} | ${r.year ?? '—'} | ${r.role}`)
        continue
      }

      try {
        const rec = await payload.create({
          collection: 'recordings',
          data: {
            title: r.de.title,
            description: makeRichText(descriptionLines) as never,
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
          id: rec.id,
          data: {
            title: r.en.title,
            description: makeRichText(descriptionLinesEn) as never,
          },
          locale: 'en',
        })
        totalCreated++
        console.log(`  ✓ "${r.de.title}" (ID ${rec.id})`)
      } catch (e) {
        errors.push(`${slug} / "${r.de.title}": ${e instanceof Error ? e.message : e}`)
        console.log(`  ✗ "${r.de.title}": ${e instanceof Error ? e.message : e}`)
      }
    }
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`Done. ${DRY_RUN ? '[DRY RUN] Would have created' : 'Created'} ${totalCreated} recordings.`)
  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`)
    for (const e of errors) console.log(`  - ${e}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
```

---

## Task 6: Wire up & Verify

- [ ] **Step 1: Run build script**

```bash
pnpm tsx scripts/wordpress/buildRecordingsDataset.ts
```

Expected: 24 artist lines, `recordings-dataset.json` written.

- [ ] **Step 2: Type-check everything**

```bash
pnpm tsc --noEmit --skipLibCheck 2>&1 | grep -E 'recordings-review|RecordingsReview|importRecordings|buildRecordings'
```

Expected: no output (no errors).

- [ ] **Step 3: Start dev server and open review UI**

```bash
pnpm dev
```

Open: `http://localhost:3000/admin/recordings-review`

Expected: table showing all artists and recordings, editable inline.

- [ ] **Step 4: Verify Save works**

Edit one field, click Save All. Check the JSON file updated:

```bash
cat scripts/wordpress/data/recordings-dataset.json | head -20
```

- [ ] **Step 5: Dry-run import**

After review is complete:

```bash
pnpm tsx scripts/wordpress/importRecordingsDataset.ts --dry-run
```

Expected: lists all recordings that would be created, no DB writes.

- [ ] **Step 6: Final import (after user approval)**

```bash
pnpm tsx scripts/wordpress/importRecordingsDataset.ts
```

---

## Known Data Issues to Fix in Review UI

These will need manual correction after the JSON is generated:

| Artist | Issue |
|---|---|
| `marc-gruber`, `dominik-wagner`, `jonian-ilias-kadesha` | Label column = title (no label line in HTML) — clear label/catalogNumber fields |
| `claire-huangci` | Parser puts "Partner: X" in label column — needs manual label/year fill |
| `trio-gaspard` | DE/EN blocks misaligned by position — check EN titles match DE |
| `mario-venzago` | DE/EN offset from row 11 — check EN titles match DE |
| `tianwa-yang` | No years in HTML — fill years manually if desired |
| `christian-zacharias`, `thomas-zehetmair` | Placeholder entries — fill all fields manually |
| `monet-quintett` | Only EN HTML available — review DE titles match |
