'use server'

import type { Image } from '@/payload-types'
import config from '@/payload.config'
import { getPayload } from 'payload'

/**
 * Server action to fetch the default avatar image.
 * Uses Payload Local API for better performance than REST API calls.
 *
 * @returns Promise resolving to the default avatar image or null
 */
export async function fetchDefaultAvatar(): Promise<Image | null> {
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'images',
    where: {
      filename: {
        equals: 'default-avatar.webp',
      },
    },
    limit: 1,
  })

  return result.docs[0] || null
}
