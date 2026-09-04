import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { revalidatePath } from 'next/cache'

/**
 * Revalidates the statically-rendered artist detail pages when a recording changes.
 */
function revalidateArtistSubtree(): void {
  revalidatePath('/(frontend)/[locale]/artists', 'layout')
}

/**
 * afterChange hook: purges the artists subtree when a recording is created or updated.
 */
export const revalidateRecordingOnChange: CollectionAfterChangeHook = ({ doc, req }) => {
  if (req.context?.skipRevalidation) return doc

  revalidateArtistSubtree()
  console.log(`[revalidate] Artist pages revalidated after recording change (id: ${doc.id})`)
  return doc
}

/**
 * afterDelete hook: purges the artists subtree when a recording is deleted.
 */
export const revalidateRecordingOnDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  if (req.context?.skipRevalidation) return doc

  revalidateArtistSubtree()
  console.log(`[revalidate] Artist pages revalidated after recording delete (id: ${doc.id})`)
  return doc
}
