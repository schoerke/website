/**
 * This is an example of a standalone script that loads in the Payload config
 * and uses the Payload Local API to query the database.
 */

import config from '@payload-config'
import { getPayload } from 'payload'

import artistsData from './seeds/artists.json'

async function getDefaultMedia(payload: any) {
  // Try to find existing media first
  const existingMedia = await payload.find({
    where: {
      filename: { equals: 'default-avatar.webp' },
    },
    collection: 'media',
    limit: 1,
  })

  if (existingMedia.totalDocs > 0) {
    return existingMedia.docs[0].id
  }

  // Create a simple 1x1 pixel PNG as default placeholder
  const pngData = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  )

  const media = await payload.create({
    collection: 'media',
    data: {
      alt: 'Default Artist Image',
    },
    file: {
      data: pngData,
      mimetype: 'image/png',
      name: 'default-artist-image.png',
    },
  })

  return media.id
}

async function run() {
  try {
    const payload = await getPayload({ config })

    // Get or create default media
    const defaultMediaId = await getDefaultMedia(payload)
    console.log('Using default media ID:', defaultMediaId)

    for (const artistData of artistsData.artists) {
      // 1. Create artist in default locale (English)
      const artistEn = {
        ...artistData,
        image: defaultMediaId,
        biography: {
          root: {
            type: 'root',
            children: artistData.biography.en,
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
      } as any

      const created = await payload.create({
        collection: 'artists',
        data: artistEn,
      })

      console.log(`Created artist: ${artistData.name} (en)`)

      // 2. Update artist for German locale if biography.de exists
      if (artistData.biography.de) {
        await payload.update({
          collection: 'artists',
          id: created.id,
          data: {
            biography: {
              root: {
                type: 'root',
                children: artistData.biography.de,
                direction: 'ltr',
                format: '',
                indent: 0,
                version: 1,
              },
            },
          },
          locale: 'de',
        })
        console.log(`Updated artist: ${artistData.name} (de)`)
      }
    }
  } catch (error) {
    console.error(JSON.stringify(error))
    process.exit(1)
  }

  process.exit(0)
}

await run()
