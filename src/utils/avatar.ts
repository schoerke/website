import type { Payload } from 'payload'
import { cache } from 'react'

/**
 * Resolves the avatar image URL for the admin account icon of a logged-in user.
 * Matches the user email against the employees collection and returns the employee's
 * image URL (thumbnail when available). Returns null for non-employees or users
 * without a photo so the default account icon is rendered.
 *
 * Wrapped in React.cache() so the lookup runs once per request render.
 */
export const resolveAccountAvatarImage = cache(
  async (payload: Payload, email: string | undefined): Promise<string | null> => {
    if (!email) return null
    const { docs } = await payload.find({
      collection: 'employees',
      where: { email: { equals: email } },
      depth: 1,
      limit: 1,
    })
    const image = docs[0]?.image
    if (!image || typeof image === 'number') return null
    return image.sizes?.thumbnail?.url ?? image.url ?? null
  }
)
