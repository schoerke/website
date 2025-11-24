/**
 * Seed Artists Collection
 *
 * Seeds the Artists collection with sample data from scripts/db/json/artists.json.
 * Creates artists in both English and German locales with default avatar images.
 *
 * Features:
 * - Creates artists in English locale (default)
 * - Updates German locale with localized biographies
 * - Automatically uploads default avatar from assets/ folder if not found
 * - Handles localized richText content (biography field)
 *
 * Usage:
 *   pnpm payload run scripts/db/seedArtists.ts
 *   pnpm seed:all  # Part of master seed script
 *
 * Data Source:
 *   scripts/db/json/artists.json
 *
 * @see scripts/db/seedAll.ts - Master orchestration script
 * @see scripts/wordpress/migrateEmployees.ts - Employee migration script
 */

import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import artistsData from './json/artists.json'

/**
 * Get or create default avatar media
 *
 * Checks if default-avatar.webp exists in the media collection.
 * If not found, uploads it from the assets/ folder.
 *
 * @param payload - Payload CMS instance
 * @returns Media ID of the default avatar, or null if not found
 *
 * @example
 * const defaultMediaId = await getDefaultMedia(payload)
 * if (defaultMediaId) {
 *   artistData.image = defaultMediaId
 * }
 */
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

/**
 * Main seeding function
 *
 * Iterates through artists.json and creates/updates artists:
 * 1. Creates artist in English locale with biography
 * 2. Updates German locale with localized biography (if available)
 * 3. Assigns default avatar image to all artists
 *
 * @throws {Error} If artist creation fails
 */
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
        locale: 'en', // Explicitly set English locale
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
