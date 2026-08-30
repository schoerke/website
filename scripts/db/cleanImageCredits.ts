/**
 * Removes leading `(c)` copyright markers from image credits using a reviewed manifest.
 *
 * @example
 * pnpm tsx scripts/db/cleanImageCredits.ts --manifest data/dumps/image-credit-cleanup.json
 * NODE_ENV=production pnpm tsx scripts/db/cleanImageCredits.ts --apply --manifest data/dumps/image-credit-cleanup.json
 */
import 'dotenv/config'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import config from '@/payload.config'
import { getPayload } from 'payload'

import { normalizeImageCredit } from '../../src/utils/imageCredit'

export interface ImageCreditEntry {
  id: number
  filename: string
  oldCredit: string
  newCredit: string | null
}

export interface ImageCreditManifest {
  entries: ImageCreditEntry[]
  digest: string
}

interface ImageDocument {
  id: number
  filename: string | null
  credit: unknown
}

interface ImagePayload {
  find: (options: {
    collection: 'images'
    where: { credit: { exists: true } }
    depth: 0
    pagination: false
    limit: 0
  }) => Promise<{ docs: ImageDocument[] }>
  findByID: (options: { collection: 'images'; id: number; depth: 0 }) => Promise<ImageDocument>
  update: (options: {
    collection: 'images'
    id: number
    data: { credit: string | null }
    context: { skipRevalidation: true }
  }) => Promise<unknown>
  db?: {
    destroy?: () => Promise<void>
  }
}

export interface ScriptArguments {
  apply: boolean
  manifestPath: string
}

export interface ExecuteDependencies {
  databaseUri: string
  nodeEnv: string | undefined
  getPayload: () => Promise<ImagePayload>
  readManifest: (path: string) => Promise<string>
  writeManifest: (path: string, contents: string) => Promise<void>
}

const usage = 'Usage: pnpm tsx scripts/db/cleanImageCredits.ts [--apply] --manifest <path>'

function digestEntries(entries: ImageCreditEntry[]): string {
  return createHash('sha256').update(JSON.stringify(entries)).digest('hex')
}

function isEntry(value: unknown): value is ImageCreditEntry {
  if (!value || typeof value !== 'object') return false

  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === 'number' &&
    Number.isInteger(entry.id) &&
    typeof entry.filename === 'string' &&
    typeof entry.oldCredit === 'string' &&
    (typeof entry.newCredit === 'string' || entry.newCredit === null)
  )
}

export function parseArguments(args: string[]): ScriptArguments {
  const isDryRun = args.length === 2 && args[0] === '--manifest' && Boolean(args[1])
  const isApply = args.length === 3 && args[0] === '--apply' && args[1] === '--manifest' && Boolean(args[2])

  if (!isDryRun && !isApply) throw new Error(usage)

  return { apply: isApply, manifestPath: args[args.length - 1] }
}

export function buildEntries(images: ImageDocument[]): ImageCreditEntry[] {
  return images
    .flatMap((image) => {
      if (typeof image.credit !== 'string' || typeof image.filename !== 'string') return []

      const newCredit = normalizeImageCredit(image.credit)
      if (newCredit === image.credit || (typeof newCredit !== 'string' && newCredit !== null)) return []

      return [{ id: image.id, filename: image.filename, oldCredit: image.credit, newCredit }]
    })
    .sort((left, right) => left.id - right.id)
}

export function createManifest(entries: ImageCreditEntry[]): ImageCreditManifest {
  return { entries, digest: digestEntries(entries) }
}

export function validateManifest(value: unknown): ImageCreditEntry[] {
  if (!value || typeof value !== 'object') throw new Error('Invalid manifest format')

  const manifest = value as Record<string, unknown>
  if (!Array.isArray(manifest.entries) || !manifest.entries.every(isEntry) || typeof manifest.digest !== 'string') {
    throw new Error('Invalid manifest format')
  }
  const entries = manifest.entries as ImageCreditEntry[]

  if (entries.some((entry, index) => index > 0 && entry.id <= entries[index - 1].id)) {
    throw new Error('Manifest entries must be ascending by numeric ID')
  }

  if (manifest.digest !== digestEntries(entries)) throw new Error('Invalid manifest digest')

  if (entries.some((entry) => normalizeImageCredit(entry.oldCredit) !== entry.newCredit)) {
    throw new Error('Manifest entries must contain normalization output')
  }

  return entries
}

function entriesMatch(left: ImageCreditEntry[], right: ImageCreditEntry[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

async function findImagesWithCredits(payload: ImagePayload): Promise<ImageDocument[]> {
  const result = await payload.find({
    collection: 'images',
    where: { credit: { exists: true } },
    depth: 0,
    pagination: false,
    limit: 0,
  })

  return result.docs
}

export async function applyManifest(payload: ImagePayload, entries: ImageCreditEntry[]): Promise<void> {
  const currentEntries = buildEntries(await findImagesWithCredits(payload))
  if (!entriesMatch(currentEntries, entries)) {
    throw new Error('Image credits changed since manifest creation; aborting without updates')
  }

  for (const entry of entries) {
    const image = await payload.findByID({ collection: 'images', id: entry.id, depth: 0 })
    if (image.filename !== entry.filename) {
      throw new Error(`Image ${entry.id} filename changed during apply; stopping`)
    }
    if (image.credit !== entry.oldCredit) {
      throw new Error(`Image ${entry.id} credit changed during apply; stopping`)
    }
  }

  for (const entry of entries) {
    try {
      await payload.update({
        collection: 'images',
        id: entry.id,
        data: { credit: entry.newCredit },
        context: { skipRevalidation: true },
      })
    } catch {
      throw new Error('Image credit update failed; prior updates may have been applied')
    }
  }
}

export async function execute(args: string[], dependencies: ExecuteDependencies): Promise<void> {
  const { apply, manifestPath } = parseArguments(args)
  const isProduction = dependencies.databaseUri.includes('ksschoerke-production')
  if (isProduction && dependencies.nodeEnv !== 'production') {
    throw new Error('Production DATABASE_URI requires NODE_ENV=production')
  }

  let entries: ImageCreditEntry[] | undefined
  if (apply) {
    entries = validateManifest(JSON.parse(await dependencies.readManifest(manifestPath)))
  }

  const payload = await dependencies.getPayload()
  try {
    if (entries) {
      await applyManifest(payload, entries)
      return
    }

    const manifest = createManifest(buildEntries(await findImagesWithCredits(payload)))
    await dependencies.writeManifest(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  } finally {
    await payload.db?.destroy?.()
  }
}

async function main(): Promise<void> {
  const { apply, manifestPath } = parseArguments(process.argv.slice(2))
  const resolvedManifestPath = resolve(manifestPath)
  await execute(process.argv.slice(2), {
    databaseUri: process.env.DATABASE_URI || '',
    nodeEnv: process.env.NODE_ENV,
    getPayload: async () => (await getPayload({ config })) as unknown as ImagePayload,
    readManifest: (path) => readFile(resolve(path), 'utf8'),
    writeManifest: (path, contents) => writeFile(resolve(path), contents, 'utf8'),
  })
  console.log(`${apply ? 'Applied' : 'Dry-run wrote'} image credit cleanup manifest: ${resolvedManifestPath}`)
}

export function isDirectExecution(entryPath: string | undefined, moduleUrl: string): boolean {
  return Boolean(entryPath && moduleUrl === pathToFileURL(entryPath).href)
}

if (isDirectExecution(process.argv[1], import.meta.url)) {
  main().catch(() => {
    console.error('IMAGE CREDIT CLEANUP FAILED. No further updates were attempted.')
    process.exitCode = 1
  })
}
