import { APIError, type CollectionBeforeDeleteHook } from 'payload'

import type { Where } from 'payload'

const references = [
  { collection: 'artists', field: 'image', publishedOnly: false },
  { collection: 'artists', field: 'galleryImages.image', publishedOnly: false },
  { collection: 'employees', field: 'image', publishedOnly: false },
  { collection: 'posts', field: 'image', publishedOnly: true },
  { collection: 'recordings', field: 'coverArt', publishedOnly: false },
] as const

export const blockReferencedImageDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  for (const reference of references) {
    const where: Where = reference.publishedOnly
      ? { and: [{ [reference.field]: { equals: id } }, { _status: { equals: 'published' } }] }
      : { [reference.field]: { equals: id } }
    const result = await req.payload.find({
      collection: reference.collection,
      where,
      limit: 1,
      pagination: false,
      depth: 0,
      select: {},
    })

    if (result.docs.length > 0) {
      throw new APIError(
        'This image is in use and cannot be deleted. Remove or replace it first.',
        400,
        undefined,
        true
      )
    }
  }
}
