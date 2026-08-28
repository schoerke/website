import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

export const MAX_IMAGE_FILE_SIZE = 15 * 1024 * 1024

/**
 * Rejects image uploads larger than 15 MB.
 *
 * The Vercel Blob storage plugin's client-upload route (clientUploads) does NOT
 * enforce Payload's global upload.limits.fileSize — bytes go browser → Blob
 * directly, bypassing the Vercel Function. This hook is the API-level
 * enforcement point.
 *
 * filesize is checked against BOTH the declared value (data.filesize, populated
 * by Payload from req.file.size) and the actual buffer (req.file.data.length),
 * because for client uploads the declared size is client-supplied and
 * spoofable; the buffer is the real bytes already fetched server-side.
 *
 * The declared value is only trusted when a file is actually being uploaded
 * (req.file present). On metadata-only updates (alt/credit edit, no new file)
 * generateFileData does not touch filesize, so data.filesize holds the stale
 * value from the stored doc — rejecting on it would block editing any image
 * uploaded before this hook shipped (old 60MB global cap allowed up to 60MB).
 *
 * NOTE: rejection happens AFTER the browser has already uploaded the bytes to
 * Blob (the client-upload flow PUTs to storage first, then sends metadata). An
 * oversized file therefore leaves an orphan blob in Vercel Blob requiring
 * manual cleanup. This is inherent to the plugin flow — there is no earlier
 * hook that can reject before the direct PUT.
 */
export const limitImageFileSize: CollectionBeforeChangeHook = ({ data, req }) => {
  const hasNewFile = Boolean(req?.file)
  const actual = req?.file?.data?.length ?? 0
  // The declared filesize is client-supplied for client uploads, so it only
  // counts when a real file is being uploaded now. Metadata-only updates carry
  // the stale stored filesize and must not be rejected on it.
  const declared = hasNewFile && typeof data.filesize === 'number' ? data.filesize : 0
  const effective = Math.max(declared, actual)

  if (effective > MAX_IMAGE_FILE_SIZE) {
    const limitMB = MAX_IMAGE_FILE_SIZE / 1024 / 1024
    req?.payload?.logger?.error?.(
      `[image-limit] Rejected image ${req?.file?.name ?? '(unknown)'}: ${(effective / 1024 / 1024).toFixed(2)} MB exceeds ${limitMB} MB limit. Orphan blob may remain in Vercel Blob.`
    )
    throw new APIError(
      `Image exceeds the ${limitMB} MB limit (got ${(effective / 1024 / 1024).toFixed(2)} MB).`,
      400,
      undefined,
      true
    )
  }

  return data
}
