import 'dotenv/config'
import { promises as fs } from 'fs'
import path from 'path'
import { getPayload } from 'payload'

async function getConfig() {
  const configModule = await import('../src/payload.config')
  const configMaybePromise = configModule.default
  return typeof configMaybePromise.then === 'function' ? await configMaybePromise : configMaybePromise
}

async function downloadImage(url: string, dest: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download image: ${url}`)
  const arrayBuffer = await res.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  await fs.writeFile(dest, buffer)
}

async function regenerateSizesForMedia(payload: any, mediaDoc: any, publicUrl: string) {
  const originalUrl = mediaDoc.url?.startsWith('http') ? mediaDoc.url : `${publicUrl}/${mediaDoc.filename}`
  const tmpDir = path.join(process.cwd(), 'tmp')
  await fs.mkdir(tmpDir, { recursive: true })
  const originalPath = path.join(tmpDir, mediaDoc.filename)
  await downloadImage(originalUrl, originalPath)

  // Use Local API to re-upload and regenerate sizes
  await payload.update({
    collection: 'media',
    id: mediaDoc.id,
    filePath: originalPath,
    overwriteExistingFiles: true,
    data: {},
  })

  await fs.unlink(originalPath)
}

async function main() {
  const config = await getConfig()
  const payload = await getPayload({ config })
  const imageSizes = config.collections.find((c: any) => c.slug === 'media')?.upload?.imageSizes || []
  const publicUrl = process.env.NEXT_PUBLIC_S3_HOSTNAME || process.env.CLOUDFLARE_PUBLIC_URL
  if (!publicUrl) throw new Error('No public S3/R2 URL found in env')

  const { docs: mediaDocs } = await payload.find({ collection: 'media', limit: 10000 })
  for (const mediaDoc of mediaDocs) {
    if (!mediaDoc.filename) continue
    try {
      console.log(`Regenerating sizes for: ${mediaDoc.filename}`)
      await regenerateSizesForMedia(payload, mediaDoc, publicUrl)
      console.log(`Done: ${mediaDoc.filename}`)
    } catch (err) {
      console.error(`Error processing ${mediaDoc.filename}:`, err)
    }
  }
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
