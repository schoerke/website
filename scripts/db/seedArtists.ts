/**
 * This is an example of a standalone script that loads in the Payload config
 * and uses the Payload Local API to query the database.
 */

import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import artistsData from './json/artists.json'

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

  // If not found, upload from assets folder
  const assetsPath = path.join(process.cwd(), 'assets', 'default-avatar.webp')

  if (fs.existsSync(assetsPath)) {
    const fileData = fs.readFileSync(assetsPath)

    const media = await payload.create({
      collection: 'media',
      data: {
        alt: 'Default Avatar',
      },
      file: {
        data: fileData,
        mimetype: 'image/webp',
        name: 'default-avatar.webp',
      },
    })

    console.log('Uploaded default avatar from assets folder')
    return media.id
  }

  return null
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
