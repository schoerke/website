import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { revalidatePath } from 'next/cache'

/**
 * Revalidates the statically-rendered artist detail pages when a document (bio PDF, gallery ZIP)
 * is uploaded or replaced. Artist pages render download links server-side (ArtistLinksDownloads),
 * and a same-filename re-upload serves stale URL/updatedAt on cached pages without this purge.
 */
function revalidateArtistSubtree(): void {
  revalidatePath('/(frontend)/[locale]/artists', 'layout')
}

/**
 * afterChange hook: purges the artists subtree when a document is created, updated, or re-uploaded.
 */
export const revalidateDocumentOnChange: CollectionAfterChangeHook = ({ doc, req }) => {
  if (req.context?.skipRevalidation) return doc

  revalidateArtistSubtree()
  console.log(`[revalidate] Artist pages revalidated after document change (id: ${doc.id})`)
  return doc
}

/**
 * afterDelete hook: purges the artists subtree when a document is deleted.
 */
export const revalidateDocumentOnDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  if (req.context?.skipRevalidation) return doc

  revalidateArtistSubtree()
  console.log(`[revalidate] Artist pages revalidated after document delete (id: ${doc.id})`)
  return doc
}
