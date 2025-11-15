import 'dotenv/config'
import { writeFile } from 'fs/promises'
import path from 'path'
import { getPayload } from 'payload'

async function getConfig() {
  const configModule = await import('../src/payload.config')
  const configMaybePromise = configModule.default

  return typeof configMaybePromise.then === 'function' ? await configMaybePromise : configMaybePromise
}

function getValidCollections(config: any): string[] {
  return (config.collections || []).map((c: any) => c.slug)
}

async function exportCollection(payload: any, collection: string) {
  const result = await payload.find({ collection })
  const outFile = `${collection}-dump.json`
  const outPath = path.join(process.cwd(), 'data', 'dumps', outFile)

  await writeFile(outPath, JSON.stringify(result.docs, null, 2), 'utf-8')

  console.log(`Exported ${result.docs.length} docs to ${outPath}`)
}

async function closePayloadConnection(payload: any) {
  if (payload?.mongoClient && typeof payload.mongoClient.close === 'function') {
    console.log('Attempting to close MongoDB connection...')
    await payload.mongoClient.close()
    console.log('Closed MongoDB connection.')
  } else if (payload?.db && typeof payload.db.$disconnect === 'function') {
    console.log('Attempting to disconnect Prisma (Postgres/SQLite) connection...')
    await payload.db.$disconnect()
    console.log('Disconnected Prisma (Postgres/SQLite) connection.')
  } else {
    console.log('No known DB connection to close.')
  }
}

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
