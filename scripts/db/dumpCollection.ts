/**
 * Collection Dump Utility
 *
 * Exports an entire Payload CMS collection to a JSON file for backup or migration purposes.
 *
 * @example
 * ```bash
 * # Export all artists
 * pnpm dump artists
 *
 * # Export all posts
 * pnpm dump posts
 *
 * # Export images metadata
 * pnpm dump images
 *
 * # Export documents metadata
 * pnpm dump documents
 * ```
 *
 * Output: Writes to `data/dumps/{collection}-dump.json`
 */

import 'dotenv/config'
import { writeFile } from 'fs/promises'
import path from 'path'
import type { SanitizedConfig } from 'payload'
import { getPayload, type Payload } from 'payload'

/**
 * Dynamically imports and resolves the Payload configuration.
 *
 * Handles both synchronous config exports and async config promises.
 *
 * @returns The resolved Payload configuration object
 * @throws Will throw if the config file cannot be imported or resolved
 *
 * @example
 * ```ts
 * const config = await getConfig()
 * console.log(config.collections) // Array of collection configurations
 * ```
 */
async function getConfig() {
  const configModule = await import('../../src/payload.config')
  const configMaybePromise = configModule.default

  return typeof configMaybePromise.then === 'function' ? await configMaybePromise : configMaybePromise
}

/**
 * Extracts the slugs of all registered collections from the Payload config.
 *
 * @param config - The Payload configuration object
 * @returns Array of collection slug strings (e.g., ['artists', 'posts', 'images', 'documents'])
 *
 * @example
 * ```ts
 * const config = await getConfig()
 * const collections = getValidCollections(config)
 * // ['artists', 'documents', 'employees', 'images', 'posts', 'recordings', 'users']
 * ```
 */
function getValidCollections(config: SanitizedConfig): string[] {
  return (config.collections || []).map((c) => c.slug)
}

/**
 * Exports all documents from a Payload collection to a JSON file.
 *
 * The export file is saved to `data/dumps/{collection}-dump.json` with pretty-printed formatting.
 * Includes all localized field data by setting locale: 'all'.
 *
 * @param payload - The initialized Payload instance
 * @param collection - The collection slug to export (e.g., 'artists', 'posts')
 * @returns A promise that resolves when the export is complete
 * @throws Will throw if the collection doesn't exist or file write fails
 *
 * @example
 * ```ts
 * await exportCollection(payload, 'artists')
 * // Exported 15 docs to /path/to/data/dumps/artists-dump.json
 * ```
 *
 * @remarks
 * For collections with localized fields (e.g., employees.title), the dump will include
 * all locale data in the format: { de: "German value", en: "English value" }
 */
async function exportCollection(payload: Payload, collection: string) {
  const result = await payload.find({
    collection,
    locale: 'all', // Include all localized field data
    fallbackLocale: false, // Don't use fallback locales
    limit: 10000, // Ensure we get all documents (default is only 10)
  })
  const outFile = `${collection}-dump.json`
  const outPath = path.join(process.cwd(), 'data', 'dumps', outFile)

  await writeFile(outPath, JSON.stringify(result.docs, null, 2), 'utf-8')

  console.log(`Exported ${result.docs.length} docs to ${outPath}`)
}

/**
 * Gracefully closes the database connection based on the database adapter.
 *
 * Supports MongoDB (mongoClient.close) and Prisma/Postgres/SQLite (db.$disconnect).
 * Logs appropriate messages for each connection type.
 *
 * @param payload - The initialized Payload instance
 * @returns A promise that resolves when the connection is closed
 *
 * @example
 * ```ts
 * const payload = await getPayload({ config })
 * // ... perform operations ...
 * await closePayloadConnection(payload)
 * // Closed MongoDB connection.
 * ```
 */
async function closePayloadConnection(payload: Payload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((payload as any)?.mongoClient && typeof (payload as any).mongoClient.close === 'function') {
    console.log('Attempting to close MongoDB connection...')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (payload as any).mongoClient.close()
    console.log('Closed MongoDB connection.')
  } else if (payload?.db && typeof (payload.db as any).$disconnect === 'function') {
    console.log('Attempting to close Prisma connection...')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (payload.db as any).$disconnect()
    console.log('Closed Prisma connection.')
  } else {
    console.log('No database connection to close or unsupported database type.')
  }
}

/**
 * Main entry point for the collection dump script.
 *
 * Workflow:
 * 1. Parse collection slug from command line arguments
 * 2. Validate the collection exists in the Payload config
 * 3. Initialize Payload and connect to database
 * 4. Export all documents from the collection to JSON
 * 5. Close database connection and exit
 *
 * @returns A promise that resolves when the dump is complete
 * @throws Will exit with code 1 if collection is invalid or export fails
 *
 * @example
 * ```bash
 * # Valid usage
 * pnpm dump artists
 *
 * # Invalid - missing collection argument
 * pnpm dump
 * # Error: Usage: pnpm dump <collection>
 *
 * # Invalid - unknown collection
 * pnpm dump foo
 * # Error: Unknown collection: foo
 * # Valid collections: artists, employees, media, posts, recordings, users
 * ```
 */
async function main() {
  const collection = process.argv[2]
  if (!collection) {
    console.error('Usage: pnpm dump <collection>')
    process.exit(1)
  }

  const config = await getConfig()
  const validCollections = getValidCollections(config)

  if (!validCollections.includes(collection)) {
    console.error(`Unknown collection: ${collection}`)
    console.error(`Valid collections: ${validCollections.join(', ')}`)
    process.exit(1)
  }

  const payload = await getPayload({ config })

  await exportCollection(payload, collection)
  await closePayloadConnection(payload)

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
