/**
 * This is an example of a standalone script that loads in the Payload config
 * and uses the Payload Local API to query the database.
 */

import config from '@payload-config'
import { getPayload } from 'payload'

import artistsData from '../data/seeds/artists.json'

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
      // Create artist with the default media reference
      const artist = {
        ...artistData,
        image: defaultMediaId,
        biography: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [
                  {
                    text: artistData.biography.en[0].children[0].text,
                    type: 'text',
                    version: 1,
                  },
                ],
                version: 1,
              },
            ],
            direction: 'ltr' as const,
            format: '' as const,
            indent: 0,
            version: 1,
          },
          en: artistData.biography.en,
          de: artistData.biography.de,
        },
      } as any

      await payload.create({
        collection: 'artists',
        data: artist,
      })

      console.log(`Created artist: ${artistData.name}`)
    }
  } catch (error) {
    console.error(JSON.stringify(error))
    process.exit(1)
  }

  process.exit(0)
}

await run()
