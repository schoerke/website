import { APIError } from 'payload'
import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Blocks a post save when its slug collides with another post, throwing a
 * clear error instead of Payload's generic "invalid slug" message.
 *
 * The slug field is `readOnly` and generated from the title, so a collision
 * only surfaces via the unique DB constraint (generic toast). This hook runs
 * before the write, queries for the conflicting post, and throws an APIError
 * that the admin shows as a toast.
 *
 * Runs on create AND update. On update, the current doc is excluded from the
 * collision query. Only the active locale is checked (localized slug).
 *
 * Note: `payload.find` (even with `draft: true`) queries the LIVE table, so a
 * draft-vs-draft slug collision is not detected here — it surfaces at publish
 * time when the version copies to live, and this hook re-checks then.
 */
export const blockDuplicateSlug: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const slug = typeof data?.slug === 'string' ? data.slug : undefined
  if (!slug) return data

  // Slug unchanged → no collision possible (readOnly field, only regenerates on title change).
  if (originalDoc && typeof originalDoc === 'object') {
    const prevSlug = (originalDoc as { slug?: unknown }).slug
    if (typeof prevSlug === 'string' && prevSlug === slug) return data
  }

  const currentId = originalDoc && typeof originalDoc === 'object' ? Number((originalDoc as { id?: number }).id) : NaN

  try {
    const result = await req.payload.find({
      collection: 'posts',
      where: {
        and: [{ slug: { equals: slug } }, ...(Number.isFinite(currentId) ? [{ id: { not_equals: currentId } }] : [])],
      },
      locale: req.locale,
      limit: 1,
      depth: 0,
    })

    if (result.totalDocs > 0) {
      const locale = req.locale ?? 'de'
      const message = locale === 'de' ? 'Dieser Slug wird bereits verwendet' : 'This slug is already being used'
      throw new APIError(message, 400, undefined, true)
    }
  } catch (e) {
    if (e instanceof APIError) throw e
    // If the query itself fails, let Payload's own unique constraint handle it.
  }

  return data
}
