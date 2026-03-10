import type { Image as PayloadImage } from '@/payload-types'
import config from '@/payload.config'
import { getPayload } from 'payload'

/**
 * Fetches an image from Payload by filename using the Local API.
 * Server-only — do not import in client components.
 *
 * @param filename - The filename to search for (e.g., 'wiesbaden.webp')
 * @returns The image record from Payload, or null if not found
 *
 * @example
 * ```ts
 * const image = await getImageByFilename('wiesbaden.webp')
 * if (image) {
 *   <Image src={image.url} alt={image.alt} />
 * }
 * ```
 */
export async function getImageByFilename(filename: string): Promise<PayloadImage | null> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'images',
      where: {
        filename: {
          equals: filename,
        },
      },
      limit: 1,
    })
    return result.docs[0] || null
  } catch (error) {
    console.error(`Failed to fetch image with filename "${filename}":`, error)
    throw new Error(`Failed to fetch image: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
