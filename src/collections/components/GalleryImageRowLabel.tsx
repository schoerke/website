'use client'

import { usePayloadAPI, useRowLabel } from '@payloadcms/ui'

type GalleryRowImage = number | string | { id?: number | string; filename?: string; alt?: string } | null

const fallbackLabel = (rowNumber?: number): string => `Image ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`

const GalleryImageRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ image?: GalleryRowImage }>()

  const image = data?.image
  const imageId = typeof image === 'object' && image !== null ? image.id : image

  // NOTE: usePayloadAPI's TS signature requires a non-null `string`, but passing '' relies on
  // the hook's internal `if (url)` truthy-check (see @payloadcms/ui usePayloadAPI.js) to skip
  // the fetch entirely when there's no image yet. This is undocumented runtime behavior, not a
  // guaranteed contract — re-verify after any @payloadcms/ui upgrade.
  const [{ data: fetchedImage }] = usePayloadAPI(imageId ? `/api/images/${imageId}` : '')

  const filenameFromData =
    typeof image === 'object' && image !== null && typeof image.filename === 'string' ? image.filename.trim() : ''

  const filenameFromFetch =
    fetchedImage && typeof fetchedImage.filename === 'string' ? fetchedImage.filename.trim() : ''

  const filename = filenameFromData || filenameFromFetch

  return <div>{filename || fallbackLabel(rowNumber)}</div>
}

export default GalleryImageRowLabel
